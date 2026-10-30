const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const vm = require('node:vm');

test('visit counter shows unique visitors when the page includes it', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const code = source.slice(source.indexOf('  async function recordVisit()'), source.indexOf('  // ---------- DOM Ready Bootstrapper'));
  for (const [totalUnique, expected] of [[2, '2 unique visitors'], [1, '1 unique visitor'], [0, '0 unique visitors'], [undefined, null]]) {
    const counter = { hidden: true, textContent: '' };
    const context = vm.createContext({
      AbortSignal,
      document: { getElementById: () => counter },
      fetch: async () => ({ ok: true, json: async () => ({ totalVisits: 99, totalUnique }) }),
    });
    await vm.runInContext(code + '\nrecordVisit()', context);
    assert.equal(counter.hidden, expected === null);
    assert.equal(counter.textContent, expected ?? '');
  }
});

test('stats exposes the saved total and records visits without losing history', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-ci-'));
  let child;
  t.after(async () => {
    if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  fs.copyFileSync(path.join(__dirname, '..', 'server.js'), path.join(directory, 'server.js'));
  fs.writeFileSync(path.join(directory, 'stats.json'), JSON.stringify({
    totalVisits: 41, uniqueHashes: ['existing-hash'],
    byCity: {}, byCountry: {}, byDate: { '2026-01-01': 41 },
  }));
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  child = spawn(process.execPath, ['server.js'], {
    cwd: directory,
    env: { ...process.env, PORT: String(port), VISIT_SALT: 'ci-only', STATUS_CHECKS: 'off', NODE_PATH: path.join(__dirname, '..', 'node_modules') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Server startup timed out')), 10000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Local Address:')) { clearTimeout(timer); resolve(); }
    });
    child.once('exit', (code) => { clearTimeout(timer); reject(Error(`Server exited: ${code}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const before = await (await fetch(`${base}/api/stats`)).json();
  assert.equal(before.totalVisits, 41);
  assert.equal(before.totalUnique, 1);
  assert.equal('uniqueHashes' in before, false);
  const visit = await fetch(`${base}/api/visit`, { method: 'POST', headers: { 'X-Forwarded-For': '127.0.0.1' } });
  assert.equal(visit.status, 200);
  const after = await (await fetch(`${base}/api/stats`)).json();
  assert.equal(after.totalVisits, 42);
  assert.equal(after.totalUnique, 2);
  assert.equal(after.byDate['2026-01-01'], 41);
  const stored = JSON.parse(fs.readFileSync(path.join(directory, 'stats.json'), 'utf8'));
  assert.equal(stored.totalVisits, 42);
  assert.ok(stored.uniqueHashes.includes('existing-hash'));
  await fetch(`${base}/api/visit`, { method: 'POST', headers: { 'X-Forwarded-For': '127.0.0.1' } });
  const repeat = await (await fetch(`${base}/api/stats`)).json();
  assert.equal(repeat.totalVisits, 43);
  assert.equal(repeat.totalUnique, 2);
});
