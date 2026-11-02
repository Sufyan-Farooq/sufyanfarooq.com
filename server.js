const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const STATS_FILE = path.join(__dirname, 'stats.json');

// Used only to one-way-hash IPs for de-duplication (never stored/output raw).
// Set a real secret in production via env var so hashes aren't guessable.
const SALT = process.env.VISIT_SALT || 'change-me-please';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ---------- storage helpers ----------

function loadStats() {
  if (!fs.existsSync(STATS_FILE)) {
    return { totalVisits: 0, uniqueHashes: [], byCity: {}, byCountry: {}, byDate: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    return {
      totalVisits: parsed.totalVisits || 0,
      uniqueHashes: Array.isArray(parsed.uniqueHashes) ? parsed.uniqueHashes : [],
      byCity: parsed.byCity || {},
      byCountry: parsed.byCountry || {},
      byDate: parsed.byDate || {},
      ...(parsed.monitor ? { monitor: parsed.monitor } : {}),
    };
  } catch (e) {
    console.error('[ERROR] Failed to parse stats.json, resetting.', e);
    return { totalVisits: 0, uniqueHashes: [], byCity: {}, byCountry: {}, byDate: {} };
  }
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + SALT).digest('hex');
}

// Get the real client IP even behind a reverse proxy (nginx sets X-Forwarded-For)
function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// Server-side geo lookup (server-to-server, so the visitor's browser never
// talks to a third party just to be tracked). Swap for any geo-IP provider.
async function lookupGeo(ip) {
  // Local/dev IPs won't resolve to a real location.
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('::1') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { city: 'Local/Dev', country: 'Local/Dev' };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`);
    if (!res.ok) return { city: 'Unknown', country: 'Unknown' };
    const data = await res.json();
    if (data.status !== 'success') return { city: 'Unknown', country: 'Unknown' };
    return { city: data.city || 'Unknown', country: data.country || 'Unknown' };
  } catch (e) {
    console.error('[ERROR] Geo lookup failed:', e.message);
    return { city: 'Unknown', country: 'Unknown' };
  }
}

// ---------- routes ----------

// Record a visit. No body required — location is derived from the
// connecting IP on the server, nothing identifying is stored.
app.post('/api/visit', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const geo = await lookupGeo(ip);
    const hash = hashIp(ip);
    const today = new Date().toISOString().slice(0, 10);

    const stats = loadStats();
    stats.totalVisits += 1;

    if (!stats.uniqueHashes.includes(hash)) {
      stats.uniqueHashes.push(hash);
    }

    const cityKey = `${geo.city}, ${geo.country}`;
    stats.byCity[cityKey] = (stats.byCity[cityKey] || 0) + 1;
    stats.byCountry[geo.country] = (stats.byCountry[geo.country] || 0) + 1;
    stats.byDate[today] = (stats.byDate[today] || 0) + 1;

    saveStats(stats);

    console.log(`[VISIT] +1 from ${cityKey} (total: ${stats.totalVisits}, unique: ${stats.uniqueHashes.length})`);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[ERROR] Failed to record visit:', e);
    res.status(500).json({ success: false });
  }
});

// Aggregate stats only — no per-visitor data ever leaves this endpoint.
app.get('/api/stats', (req, res) => {
  const stats = loadStats();

  const topCities = Object.entries(stats.byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  const topCountries = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  res.status(200).json({
    totalVisits: stats.totalVisits,
    totalUnique: stats.uniqueHashes.length,
    topCities,
    topCountries,
    byDate: stats.byDate,
  });
});

// ---------- live service checks ----------

// The apps I built and keep running. Probed from this server, results cached
// in memory so visitors never trigger outbound requests themselves.
const SERVICES = [
  { id: 'riyasat', name: 'Riyasat', url: 'https://riyasat.sufyanfarooq.com/' },
  { id: 'naqlapp', name: 'naqlapp', url: 'https://naqlapp.com/' },
  { id: 'naql-tms', name: 'Truck Dispatcher', url: 'https://app.naqlapp.com/' },
  { id: 'mawarith', name: 'Mawarith', url: 'https://mawarith.sufyanfarooq.com/' },
  { id: 'turnup', name: 'TurnUp', url: 'https://turnup.sufyanfarooq.com/' },
  { id: 'omar', name: 'Omar Global', url: 'https://omergloballlc.com/' },
  { id: 'qaswa', name: 'Qaswa AI', url: 'https://qaswaai.com/' },
  { id: 'qaswa-desk', name: 'Qaswa Desk', url: 'https://desk.qaswaai.com/' },
];
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const HISTORY_LIMIT = 288; // 24 hours of 5-minute checks
const MIN_UPTIME_CHECKS = 12; // an hour of data before showing a percentage
const INCIDENT_LIMIT = 20;

// History survives restarts and deploys by living in stats.json.
const saved = loadStats().monitor || {};
const monitor = {
  since: saved.since || new Date().toISOString(),
  incidents: Array.isArray(saved.incidents) ? saved.incidents : [],
};
const serviceState = new Map(SERVICES.map((s) => {
  const prev = (saved.services || {})[s.id] || {};
  return [s.id, { last: prev.last || null, history: Array.isArray(prev.history) ? prev.history : [] }];
}));

function persistMonitor() {
  const stats = loadStats();
  stats.monitor = {
    since: monitor.since,
    incidents: monitor.incidents,
    services: Object.fromEntries([...serviceState].map(([id, st]) => [id, { last: st.last, history: st.history }])),
  };
  saveStats(stats);
}

function uptimeOf(history) {
  if (history.length < MIN_UPTIME_CHECKS) return null;
  return (history.filter(Boolean).length / history.length) * 100;
}

async function probe(service) {
  const started = Date.now();
  let result;
  try {
    const res = await fetch(service.url, { redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'sufyanfarooq.com status check' } });
    res.body?.cancel().catch(() => {});
    result = { code: res.status, ok: res.status < 400, ms: Date.now() - started };
  } catch (e) {
    result = { code: null, ok: false, ms: null };
  }
  result.at = new Date().toISOString();
  const state = serviceState.get(service.id);
  const wasUp = state.last ? state.last.ok : true;

  // An incident opens on the first failed check and closes on the next good one.
  if (wasUp && !result.ok) {
    monitor.incidents.push({ service: service.id, name: service.name, start: result.at, end: null, code: result.code });
    if (monitor.incidents.length > INCIDENT_LIMIT) monitor.incidents.shift();
  } else if (!wasUp && result.ok) {
    const open = [...monitor.incidents].reverse().find((i) => i.service === service.id && !i.end);
    if (open) open.end = result.at;
  }

  state.last = result;
  state.history.push(result.ok);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
}

async function checkAll() {
  await Promise.all(SERVICES.map(probe));
  try { persistMonitor(); } catch (e) { console.error('[ERROR] Failed to save monitor history:', e.message); }
}

app.get('/api/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    intervalSeconds: CHECK_INTERVAL_MS / 1000,
    monitoringSince: monitor.since,
    lastIncident: monitor.incidents[monitor.incidents.length - 1] || null,
    services: SERVICES.map((s) => {
      const { last, history } = serviceState.get(s.id);
      return { id: s.id, name: s.name, url: s.url, ...(last || {}), checks: history.length, uptime: uptimeOf(history) };
    }),
  });
});

// The same board as an SVG image, so the GitHub profile README can embed it.
app.get('/status.svg', (req, res) => {
  const rowHeight = 34;
  const top = 64;
  const height = top + SERVICES.length * rowHeight + 44;
  const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const checked = SERVICES.map((s) => serviceState.get(s.id).last).filter(Boolean);
  const down = checked.filter((r) => !r.ok).length;
  const summary = !checked.length ? 'checking' : down ? `${down} of ${checked.length} down` : `all ${checked.length} up`;
  const rows = SERVICES.map((s, i) => {
    const { last, history } = serviceState.get(s.id);
    const y = top + i * rowHeight;
    const colour = !last ? '#9aa4bf' : last.ok ? '#6fe39a' : '#ff8a8a';
    const pct = uptimeOf(history);
    const uptime = pct == null ? '—' : `${pct.toFixed(1)}%`;
    return `<line x1="24" y1="${y - 22}" x2="696" y2="${y - 22}" stroke="#26345f"/>`
      + `<circle cx="34" cy="${y - 5}" r="4" fill="${colour}"/>`
      + `<text x="48" y="${y}" class="name">${escape(s.name)}</text>`
      + `<text x="470" y="${y}" class="data" text-anchor="end">${last ? escape(last.code ?? 'timeout') : '…'}</text>`
      + `<text x="590" y="${y}" class="data" text-anchor="end">${last && last.ms != null ? `${last.ms} ms` : '—'}</text>`
      + `<text x="696" y="${y}" class="data" text-anchor="end">${uptime}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}" role="img" aria-label="Live status of services: ${summary}">`
    + '<style>text{font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#f2f2f2;font-size:14px}.name{font-weight:600}.data{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#c9cfdd;font-size:13px}.muted{fill:#9aa4bf;font-size:12px}</style>'
    + `<rect width="720" height="${height}" fill="#0e1b3f" stroke="#26345f"/>`
    + `<text x="24" y="30" class="name">Apps I built, checked live</text><text x="696" y="30" text-anchor="end" class="muted">${summary}</text>`
    + rows
    + `<text x="24" y="${height - 16}" class="muted">Checked every 5 minutes by sufyanfarooq.com · right column: uptime over the last 24 hours</text>`
    + '</svg>';
  res.set({ 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache, max-age=0' });
  res.send(svg);
});

// Latest run of this site's own GitHub Actions pipeline (public API, cached).
const PIPELINE_URL = 'https://api.github.com/repos/Sufyan-Farooq/sufyanfarooq.com/actions/runs?per_page=1&branch=main';
let pipelineCache = { at: 0, data: null };

async function refreshPipeline() {
  if (Date.now() - pipelineCache.at <= 10 * 60 * 1000) return;
  {
    try {
      const r = await fetch(PIPELINE_URL, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sufyanfarooq.com' } });
      if (r.ok) {
        const run = (await r.json()).workflow_runs?.[0];
        pipelineCache = {
          at: Date.now(),
          data: run ? { title: run.display_title, conclusion: run.conclusion, status: run.status, sha: run.head_sha.slice(0, 7), number: run.run_number, updatedAt: run.updated_at, url: run.html_url } : null,
        };
      }
    } catch (e) {
      console.error('[ERROR] Pipeline lookup failed:', e.message);
    }
  }
}

app.get('/api/pipeline', async (req, res) => {
  await refreshPipeline();
  if (!pipelineCache.data) return res.status(503).json({ available: false });
  res.status(200).json(pipelineCache.data);
});

// A terminal session drawn from live data, for the top of the GitHub profile.
// Lines appear one after another with CSS animation, which GitHub keeps when
// it proxies SVG images.
app.get('/terminal.svg', async (req, res) => {
  await Promise.race([refreshPipeline(), new Promise((resolve) => setTimeout(resolve, 3000))]);
  const escape = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = (v, n) => String(v).padEnd(n, ' ');
  const checked = SERVICES.map((sv) => ({ ...sv, ...(serviceState.get(sv.id).last || {}) }));
  const up = checked.filter((c) => c.ok).length;

  const lines = [
    { cmd: 'whoami' },
    { out: 'Sufyan Farooq · support engineer · Jeddah, Saudi Arabia' },
    { cmd: 'status --apps' },
  ];
  for (let i = 0; i < checked.length; i += 2) {
    const cell = (c) => {
      if (!c) return '';
      const state = c.at == null ? 'checking' : c.ok ? `${c.code} OK  ${pad(c.ms + ' ms', 7)}` : (c.code ? `${c.code} error` : 'no answer');
      return `${pad(c.name, 17)}${pad(state, 16)}`;
    };
    lines.push({ out: cell(checked[i]) + '   ' + cell(checked[i + 1]), status: true });
  }
  lines.push({ out: `${up} of ${checked.length} up · checked every 5 minutes by sufyanfarooq.com`, dim: true });
  if (pipelineCache.data) {
    lines.push({ cmd: 'git log -1 --oneline   # sufyanfarooq.com' });
    lines.push({ out: `${pipelineCache.data.sha} ${pipelineCache.data.title}`.slice(0, 92) });
  }
  lines.push({ cmd: 'cat now.txt' });
  lines.push({ out: 'Available now · open to DevOps, cloud support, automation and app support roles' });

  const lineHeight = 26;
  const top = 64;
  const height = top + lines.length * lineHeight + 30;
  const step = 0.45;
  const rows = lines.map((line, i) => {
    const y = top + i * lineHeight;
    const delay = (i * step).toFixed(2);
    if (line.cmd) {
      return `<text x="32" y="${y}" class="l" style="animation-delay:${delay}s"><tspan class="p">$</tspan> <tspan class="c">${escape(line.cmd)}</tspan></text>`;
    }
    const cls = line.dim ? 'l d' : 'l o';
    return `<text x="32" y="${y}" class="${cls}" xml:space="preserve" style="animation-delay:${delay}s">${escape(line.out)}</text>`;
  }).join('');
  const cursorY = top + lines.length * lineHeight;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="${height}" viewBox="0 0 880 ${height}" role="img" aria-label="Terminal: Sufyan Farooq, support engineer in Jeddah. ${up} of ${checked.length} apps up. Available now.">`
    + '<style>'
    + 'text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:15px}'
    + '.t{fill:#9aa4bf;font-size:13px}.p{fill:#6fe39a}.c{fill:#f2f2f2;font-weight:600}.o{fill:#c9cfdd}.d{fill:#9aa4bf}'
    + '.l{opacity:0;animation:in .01s steps(1) forwards}'
    + '.k{opacity:0;animation:in .01s steps(1) forwards,blink 1.1s steps(1) infinite}'
    + '@keyframes in{to{opacity:1}}@keyframes blink{50%{opacity:0}}'
    + '@media (prefers-reduced-motion:reduce){.l,.k{animation:none;opacity:1}}'
    + '</style>'
    + `<rect width="880" height="${height}" rx="10" fill="#0e1b3f"/>`
    + '<rect width="880" height="38" rx="10" fill="#16234c"/><rect y="28" width="880" height="10" fill="#16234c"/>'
    + '<text x="32" y="24" class="t">sufyan@oracle-cloud: ~</text>'
    + '<text x="848" y="24" class="t" text-anchor="end">sufyanfarooq.com</text>'
    + rows
    + `<rect x="32" y="${cursorY - 15}" width="9" height="18" fill="#f2f2f2" class="k" style="animation-delay:${(lines.length * step).toFixed(2)}s,${(lines.length * step).toFixed(2)}s"/>`
    + '</svg>';
  res.set({ 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache, max-age=0' });
  res.send(svg);
});

app.listen(PORT, () => {
  if (process.env.STATUS_CHECKS !== 'off') {
    checkAll();
    setInterval(checkAll, CHECK_INTERVAL_MS).unref();
  }
  console.log('==================================================');
  console.log(`Sufyan's Portfolio Server is running!`);
  console.log(`Local Address: http://localhost:${PORT}`);
  console.log(`Stats File: ${STATS_FILE}`);
  console.log('==================================================');
});