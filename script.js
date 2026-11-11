/**
 * SUFYAN FAROOQ — PORTFOLIO
 * Live app board, pipeline status, mobile menu, contact form and visit recording
 */

(function () {
  'use strict';

  // ---------- 0. Language ----------
  // The Arabic page (/ar/) shares this script; only the wording differs.
  const AR = document.documentElement.lang === 'ar';
  const arNumber = (value, unit) => new Intl.NumberFormat('ar-u-nu-latn', { style: 'unit', unit, unitDisplay: 'long' }).format(value);
  const T = AR ? {
    noAnswer: 'لا يوجد رد',
    codeError: (code) => `خطأ ${code}`,
    unavailable: 'الفحص المباشر غير متاح',
    unavailableFoot: 'يجري الفحص على خادم الموقع. اسم كل تطبيق ما زال يفتح التطبيق.',
    noIncident: (date) => `لم يُسجَّل أي انقطاع منذ بدء المراقبة في ${date}.`,
    incidentOpen: (name, ago) => `${name} متوقف، وبدأ الانقطاع ${ago}.`,
    incidentClosed: (name, date, duration) => `آخر انقطاع: ${name}، ${date}، واستمر ${duration}.`,
    firstCheck: 'الفحص الأول جارٍ',
    up: 'يعمل',
    down: 'متوقف',
    someDown: (down, total) => `${down} من ${total} متوقف`,
    allUp: (total) => `جميعها تعمل (${total})`,
    foot: (minutes, ago) => `خادمي يفتح كل تطبيق كل ${arNumber(minutes, 'minute')}؛ آخر فحص ${ago}. نسبة التشغيل تغطي آخر 24 ساعة بعد توفر ساعة من البيانات.`,
    proofDown: (down, total) => `${down} من ${total} من تطبيقاتي متوقف الآن`,
    proofUp: (total, ago) => `تطبيقاتي الـ${total} كلها تعمل · آخر فحص ${ago}`,
    runState: { running: 'قيد التشغيل', passed: 'نجح', failure: 'فشل', cancelled: 'أُلغي' },
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    showApps: 'عرض كل تطبيق',
    hideApps: 'إخفاء التفاصيل',
    copy: 'نسخ',
    copied: 'تم النسخ',
    sending: 'جارٍ الإرسال…',
    sent: 'تم الإرسال. أرد عادةً خلال يوم.',
    sendFailed: 'لم تُرسل الرسالة. رسالتك ما زالت هنا؛ راسلني مباشرة على sufyanfarooqsmf@gmail.com.',
    offline: 'لا يوجد اتصال. رسالتك ما زالت هنا؛ حاول مجددًا أو راسلني على sufyanfarooqsmf@gmail.com.',
  } : {
    noAnswer: 'No answer',
    codeError: (code) => `${code} error`,
    unavailable: 'Live checks unavailable',
    unavailableFoot: 'The checks run on the production server. Each app name still opens the app.',
    noIncident: (date) => `No outages recorded since monitoring started on ${date}.`,
    incidentOpen: (name, ago) => `${name} has been down since ${ago}.`,
    incidentClosed: (name, date, duration) => `Last outage: ${name}, ${date}, down for ${duration}.`,
    firstCheck: 'First check running',
    up: 'up',
    down: 'down',
    someDown: (down, total) => `${down} of ${total} down`,
    allUp: (total) => `All ${total} up`,
    foot: (minutes, ago) => `My server opens each app every ${minutes} minutes; last check ${ago}. Uptime covers the last 24 hours once there's an hour of data.`,
    proofDown: (down, total) => `${down} of ${total} of my apps down right now`,
    proofUp: (total, ago) => `All ${total} of my apps up · checked ${ago}`,
    runState: { running: 'running', passed: 'passed' },
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    showApps: 'Show each app',
    hideApps: 'Hide details',
    copy: 'Copy',
    copied: 'Copied',
    sending: 'Sending…',
    sent: 'Sent. I usually reply within a day.',
    sendFailed: 'That did not send. Your message is still here; email me directly at sufyanfarooqsmf@gmail.com.',
    offline: 'No connection. Your message is still here; try again or email sufyanfarooqsmf@gmail.com.',
  };

  // ---------- 1. Icons ----------
  // The five Lucide icons the page uses (lucide.dev, ISC licence), kept here
  // so the page does not depend on an outside server to draw them.
  const ICONS = {
    'arrow-down-right': '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
    'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  };

  function initIcons() {
    document.querySelectorAll('i[data-lucide]').forEach((placeholder) => {
      const name = placeholder.getAttribute('data-lucide');
      if (!ICONS[name]) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const attributes = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
      Object.entries(attributes).forEach(([key, value]) => svg.setAttribute(key, value));
      svg.setAttribute('class', `lucide lucide-${name} ${placeholder.className}`.trim());
      svg.innerHTML = ICONS[name];
      placeholder.replaceWith(svg);
    });
  }

  // ---------- 2. Live app board ----------
  function timeAgo(iso) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (AR) {
      if (seconds < 60) return 'الآن';
      const relative = new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'always' });
      if (seconds < 3600) return relative.format(-Math.round(seconds / 60), 'minute');
      if (seconds < 86400) return relative.format(-Math.round(seconds / 3600), 'hour');
      return relative.format(-Math.round(seconds / 86400), 'day');
    }
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return `${Math.round(seconds / 86400)} days ago`;
  }

  function formatDate(iso) {
    const locale = AR ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh' }).format(new Date(iso));
  }

  function formatDuration(startIso, endIso) {
    const minutes = Math.max(1, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
    const hours = Math.floor(minutes / 60);
    if (AR) {
      if (minutes < 60) return arNumber(minutes, 'minute');
      return minutes % 60 ? `${arNumber(hours, 'hour')} و${arNumber(minutes % 60, 'minute')}` : arNumber(hours, 'hour');
    }
    if (minutes < 60) return `${minutes} min`;
    return `${hours} h ${minutes % 60} min`;
  }

  function responseLabel(service) {
    if (service.code == null) return T.noAnswer;
    return service.ok ? `${service.code} OK` : T.codeError(service.code);
  }

  function markUnavailable(summary, foot) {
    summary.innerHTML = `<span class="lamp lamp--idle" aria-hidden="true"></span>${T.unavailable}`;
    foot.textContent = T.unavailableFoot;
    document.querySelectorAll('#board-rows tr').forEach((row) => {
      row.querySelectorAll('td').forEach((cell) => { cell.textContent = '—'; });
    });
  }

  function describeIncident(data) {
    const incident = data.lastIncident;
    if (!incident) return T.noIncident(formatDate(data.monitoringSince));
    if (!incident.end) return T.incidentOpen(incident.name, timeAgo(incident.start));
    return T.incidentClosed(incident.name, formatDate(incident.start), formatDuration(incident.start, incident.end));
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
      summary.innerHTML = `<span class="lamp lamp--idle" aria-hidden="true"></span>${T.firstCheck}`;
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
          chip.textContent = service.ok ? T.up : T.down;
        });
      };
      reduceMotion ? apply() : setTimeout(apply, 140 * index);
    });

    const down = checked.filter((s) => !s.ok).length;
    const latest = checked.map((s) => s.at).sort().pop();
    const lampClass = down ? 'lamp lamp--bad' : 'lamp';
    const text = down ? T.someDown(down, checked.length) : T.allUp(checked.length);
    summary.innerHTML = `<span class="${lampClass}" aria-hidden="true"></span>${text}`;
    foot.textContent = T.foot(Math.round(data.intervalSeconds / 60), timeAgo(latest));
    if (incidentLine) incidentLine.textContent = describeIncident(data);

    if (proof && proofText) {
      proofText.textContent = down ? T.proofDown(down, checked.length) : T.proofUp(checked.length, timeAgo(latest));
      proof.querySelector('.lamp').className = lampClass;
      proof.hidden = false;
    }
  }

  // On phones the table starts folded behind the one-line summary.
  function initBoardToggle() {
    const board = document.getElementById('status-board');
    const toggle = document.getElementById('board-toggle');
    const proof = document.getElementById('hero-proof');
    if (!board || !toggle) return;

    const setOpen = (open) => {
      board.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? T.hideApps : T.showApps;
    };
    toggle.addEventListener('click', () => setOpen(!board.classList.contains('is-open')));
    if (proof) proof.addEventListener('click', () => setOpen(true));
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
      document.getElementById('run-meta').textContent = `${T.runState[state] || state} · ${timeAgo(run.updatedAt)}`;
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
      toggle.setAttribute('aria-label', open ? T.closeMenu : T.openMenu);
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
      label.textContent = T.copied;
      setTimeout(() => { label.textContent = T.copy; }, 2000);
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
      submitBtn.textContent = T.sending;
      status.textContent = '';
      status.className = 'form-status';

      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (response.ok) {
          status.textContent = T.sent;
          status.className = 'form-status success';
          form.reset();
        } else {
          status.textContent = T.sendFailed;
          status.className = 'form-status error';
        }
      } catch (err) {
        status.textContent = T.offline;
        status.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
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
    initBoardToggle();
    initMobileDrawer();
    initContactForm();
    recordVisit();
  });
})();
