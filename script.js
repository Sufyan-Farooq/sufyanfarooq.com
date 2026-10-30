/**
 * SUFYAN FAROOQ — PORTFOLIO
 * Live app board, pipeline status, mobile menu, contact form and visit recording
 */

(function () {
  'use strict';

  // ---------- 1. Icons ----------
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ---------- 2. Live app board ----------
  function timeAgo(iso) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return `${Math.round(seconds / 86400)} days ago`;
  }

  function formatDate(iso) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh' }).format(new Date(iso));
  }

  function formatDuration(startIso, endIso) {
    const minutes = Math.max(1, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours} h ${minutes % 60} min`;
  }

  function responseLabel(service) {
    if (service.code == null) return 'No answer';
    return service.ok ? `${service.code} OK` : `${service.code} error`;
  }

  function markUnavailable(summary, foot) {
    summary.innerHTML = '<span class="lamp lamp--idle" aria-hidden="true"></span>Live checks unavailable';
    foot.textContent = 'The checks run on the production server. Each app name still opens the app.';
    document.querySelectorAll('#board-rows tr').forEach((row) => {
      row.querySelectorAll('td').forEach((cell) => { cell.textContent = '—'; });
    });
  }

  function describeIncident(data) {
    const incident = data.lastIncident;
    if (!incident) return `No outages recorded since monitoring started on ${formatDate(data.monitoringSince)}.`;
    if (!incident.end) return `${incident.name} has been down since ${timeAgo(incident.start)}.`;
    return `Last outage: ${incident.name}, ${formatDate(incident.start)}, down for ${formatDuration(incident.start, incident.end)}.`;
  }

  async function initStatusBoard() {
    const summary = document.getElementById('board-summary');
    const foot = document.getElementById('board-foot');
    const incidentLine = document.getElementById('board-incident');
    const proof = document.getElementById('hero-proof');
    const proofText = document.getElementById('hero-proof-text');
    if (!summary || !foot) return;

    let data;
    try {
      const response = await fetch('/api/status', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('status ' + response.status);
      data = await response.json();
    } catch (e) {
      markUnavailable(summary, foot);
      return;
    }

    const checked = data.services.filter((s) => s.at);
    if (!checked.length) {
      summary.innerHTML = '<span class="lamp lamp--idle" aria-hidden="true"></span>First check running';
      setTimeout(initStatusBoard, 15000);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    data.services.forEach((service, index) => {
      const apply = () => {
        const row = document.querySelector(`#board-rows tr[data-service="${service.id}"]`);
        if (row && service.at) {
          const cells = row.querySelectorAll('td');
          row.classList.add(service.ok ? 'is-up' : 'is-down');
          cells[0].textContent = responseLabel(service);
          cells[1].textContent = service.ms != null ? `${service.ms} ms` : '—';
          cells[2].textContent = service.uptime == null ? '—' : `${service.uptime.toFixed(service.uptime === 100 ? 0 : 1)}%`;
        }
        document.querySelectorAll(`[data-status-for="${service.id}"]`).forEach((chip) => {
          if (!service.at) return;
          chip.classList.add(service.ok ? 'is-up' : 'is-down');
          chip.textContent = service.ok ? 'up' : 'down';
        });
      };
      reduceMotion ? apply() : setTimeout(apply, 140 * index);
    });

    const down = checked.filter((s) => !s.ok).length;
    const latest = checked.map((s) => s.at).sort().pop();
    const lampClass = down ? 'lamp lamp--bad' : 'lamp';
    const text = down ? `${down} of ${checked.length} down` : `All ${checked.length} up`;
    summary.innerHTML = `<span class="${lampClass}" aria-hidden="true"></span>${text}`;
    foot.textContent = `My server opens each app every ${Math.round(data.intervalSeconds / 60)} minutes; last check ${timeAgo(latest)}. Uptime covers the last 24 hours once there's an hour of data.`;
    if (incidentLine) incidentLine.textContent = describeIncident(data);

    if (proof && proofText) {
      proofText.textContent = down ? `${down} of ${checked.length} of my apps down right now` : `All ${checked.length} of my apps up · checked ${timeAgo(latest)}`;
      proof.querySelector('.lamp').className = lampClass;
      proof.hidden = false;
    }
  }

  // ---------- 3. Pipeline run ----------
  async function initPipelineRun() {
    const box = document.getElementById('pipeline-run');
    if (!box) return;
    try {
      const response = await fetch('/api/pipeline', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;
      const run = await response.json();
      const passed = run.conclusion === 'success';
      document.getElementById('run-lamp').className = passed ? 'lamp' : run.status !== 'completed' ? 'lamp lamp--idle' : 'lamp lamp--bad';
      const link = document.getElementById('run-link');
      link.textContent = `#${run.number} · ${run.sha}`;
      link.href = run.url;
      document.getElementById('run-title').textContent = `“${run.title}”`;
      const state = run.status !== 'completed' ? 'running' : passed ? 'passed' : run.conclusion;
      document.getElementById('run-meta').textContent = `${state} · ${timeAgo(run.updatedAt)}`;
      box.hidden = false;
    } catch (e) {}
  }

  // ---------- 4. Mobile menu ----------
  function initMobileDrawer() {
    const toggle = document.getElementById('nav-toggle');
    const drawer = document.getElementById('mobile-drawer');
    if (!toggle || !drawer) return;

    const setOpen = (open) => {
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => setOpen(!drawer.classList.contains('open')));
    drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) setOpen(false); });
  }

  // ---------- 5. Contact form & copy email ----------
  function copyEmailToClipboard() {
    navigator.clipboard.writeText('sufyanfarooqsmf@gmail.com').then(() => {
      const label = document.getElementById('copy-btn-text');
      if (!label) return;
      label.textContent = 'Copied';
      setTimeout(() => { label.textContent = 'Copy'; }, 2000);
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyEmailToClipboard);
    if (!form || !status || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      status.textContent = '';
      status.className = 'form-status';

      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (response.ok) {
          status.textContent = 'Sent. I usually reply within a day.';
          status.className = 'form-status success';
          form.reset();
        } else {
          status.textContent = 'That did not send. Your message is still here; email me directly at sufyanfarooqsmf@gmail.com.';
          status.className = 'form-status error';
        }
      } catch (err) {
        status.textContent = 'No connection. Your message is still here; try again or email sufyanfarooqsmf@gmail.com.';
        status.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        initIcons();
      }
    });
  }

  // ---------- 6. Visitor Analytics & Footer Count ----------
  // Visits are still recorded (see /api/stats); the page only shows a count
  // when an element with this id exists.
  async function recordVisit() {
    try {
      await fetch('/api/visit', { method: 'POST', signal: AbortSignal.timeout(8000) });
    } catch (e) {}

    const visitCount = document.getElementById('footer-visit-count');
    if (!visitCount) return;

    try {
      const response = await fetch('/api/stats', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const { totalUnique } = await response.json();
      if (!Number.isSafeInteger(totalUnique) || totalUnique < 0) return;

      visitCount.textContent = `${totalUnique.toLocaleString()} unique ${totalUnique === 1 ? 'visitor' : 'visitors'}`;
      visitCount.hidden = false;
    } catch (e) {}
  }

  // ---------- DOM Ready Bootstrapper ----------
  document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    initStatusBoard();
    initPipelineRun();
    initMobileDrawer();
    initContactForm();
    recordVisit();
  });
})();
