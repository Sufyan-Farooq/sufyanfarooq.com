/**
 * Motion layer: Lenis smooth scrolling, GSAP scroll animation and the
 * Three.js hero scene. The page works without it: site.js handles all
 * content and live data, and every element is visible by default.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) window.__ScrollTrigger = ScrollTrigger;

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const rtl = root.dir === 'rtl';
const dir = rtl ? -1 : 1;
const EASE = 'expo.out';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// Wrap each word in a mask so it can rise into place. Only plain-text
// elements are split, so links and inline markup are never touched.
function splitWords(element) {
  if (!element || element.dataset.split || [...element.childNodes].some((n) => n.nodeType !== Node.TEXT_NODE)) return [];
  const text = element.textContent.trim();
  element.dataset.split = 'true';
  element.setAttribute('aria-label', text);
  element.textContent = '';
  return text.split(/\s+/).map((word, index, all) => {
    const mask = document.createElement('span');
    mask.className = 'word';
    mask.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = word;
    mask.appendChild(inner);
    element.appendChild(mask);
    if (index < all.length - 1) element.appendChild(document.createTextNode(' '));
    return inner;
  });
}

// ---------- Lenis ----------

let lenis = null;
function initLenis() {
  if (reducedMotion) return;
  lenis = new Lenis({ duration: 1.2, anchors: { offset: -68 }, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

// ---------- Hero scene ----------

async function initScene() {
  const container = $('#hero-scene');
  if (!container) return;
  const services = $$('#board-rows tr[data-service]').map((row) => ({ id: row.dataset.service, name: row.querySelector('th').textContent.trim() }));

  let scene;
  try {
    // Three.js loads as its own chunk so the page and text never wait for it.
    const { createScene } = await import('./scene.js');
    scene = createScene(container, { services, rtl, reducedMotion });
  } catch (e) {
    container.hidden = true; // no WebGL: the board below still has everything
    return;
  }

  if (window.__statusData !== undefined) scene.applyStatus(window.__statusData);
  window.addEventListener('statusdata', (event) => scene.applyStatus(event.detail));

  $$('#board-rows tr[data-service]').forEach((row) => {
    const id = row.dataset.service;
    row.addEventListener('mouseenter', () => scene.focus(id));
    row.addEventListener('mouseleave', () => scene.focus(null));
    row.addEventListener('focusin', () => scene.focus(id));
    row.addEventListener('focusout', () => scene.focus(null));
  });

  gsap.ticker.add((_, deltaMs) => scene.tick(deltaMs / 1000));
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (self) => scene.setScroll(self.progress),
  });
}

// ---------- Loader and intro ----------

function loader() {
  const el = $('.loader');
  const count = $('.loader-count');
  let seen = false;
  try { seen = sessionStorage.getItem('sf-loaded') === '1'; sessionStorage.setItem('sf-loaded', '1'); } catch (e) {}

  root.classList.add('is-loading');
  root.classList.remove('motion-pending');
  const tl = gsap.timeline({ onComplete: () => { root.classList.remove('is-loading'); gsap.set(el, { clearProps: 'all' }); } });
  if (!el || seen) {
    tl.to(el, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' });
    return tl;
  }
  const counter = { value: 0 };
  const name = splitWords($('.loader-name'));
  tl.from(name, { yPercent: 110, duration: 0.9, ease: EASE, stagger: 0.06 }, 0)
    .to(counter, { value: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(counter.value)).padStart(3, '0'); } }, 0)
    .to(name, { yPercent: -110, duration: 0.6, ease: 'power3.in', stagger: 0.03 }, 1.15)
    .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.35);
  return tl;
}

function intro(after) {
  const words = splitWords($('.hero-title'));
  const tl = gsap.timeline({ defaults: { ease: EASE, duration: 1.3 }, paused: true });
  tl.from('.topbar', { yPercent: -100, duration: 1 }, 0)
    .from(words, { yPercent: 110, stagger: 0.055 }, 0.05)
    .from('.hero-kicker > *', { y: 20, opacity: 0, stagger: 0.1, duration: 1 }, 0.2)
    .from('.hero-foot', { y: 30, opacity: 0, duration: 1.1 }, 0.45)
    .from('.hero-side > *:not([hidden])', { y: 24, opacity: 0, stagger: 0.08, duration: 1 }, 0.55)
    .from('#hero-scene', { opacity: 0, scale: 1.08, duration: 2, ease: 'power3.out' }, 0)
    .from('.scroll-cue', { opacity: 0, duration: 1 }, 1);
  // Start the reveal slightly before the loader finishes so they overlap.
  after.call(() => tl.play(), null, Math.max(0, after.duration() - 0.55));
}

// ---------- Marquee: the four services, moving with the scroll ----------

function marquee() {
  const names = $$('.service-name').map((n) => n.textContent.trim());
  const live = $('.live');
  if (!names.length || !live) return;
  const band = document.createElement('div');
  band.className = 'marquee';
  band.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'marquee-track';
  for (let copy = 0; copy < 2; copy += 1) {
    names.forEach((name) => {
      const item = document.createElement('span');
      item.className = 'marquee-item';
      item.textContent = name;
      track.appendChild(item);
    });
  }
  band.appendChild(track);
  live.after(band);

  const loop = gsap.to(track, { xPercent: -50 * dir, duration: 38, ease: 'none', repeat: -1 });
  let boost = 1;
  ScrollTrigger.create({
    trigger: band, start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      boost = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
      gsap.to(loop, { timeScale: boost || 1, duration: 0.25, overwrite: true });
      gsap.to(loop, { timeScale: boost < 0 ? -1 : 1, duration: 1.2, delay: 0.25, ease: 'power2.out' });
    },
  });
  gsap.fromTo(track, { rotate: -1.5 * dir }, { rotate: 1.5 * dir, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true } });
}

// ---------- Reveals ----------

function reveals() {
  $$('.section-title, .board-title, .subhead').forEach((title) => {
    const words = splitWords(title);
    if (!words.length) return;
    gsap.from(words, { yPercent: 110, duration: 1.2, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: title, start: 'top 88%', once: true } });
  });

  const groups = '.section-lead, .section-head::before, .project-body, .ledger-title, .ledger li, .log-row, .role-card, .faq > div, .channels li, .hire, .services-foot, .pipeline-foot > *, .contact-portrait, .board-summary, .board-table tbody tr, .board-foot, .more, .form';
  const targets = $$(groups.replace('.section-head::before, ', ''));
  gsap.set(targets, { y: 40, opacity: 0 });
  ScrollTrigger.batch(targets, {
    start: 'top 92%', once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: EASE, stagger: 0.06, overwrite: true }),
  });

  // Footer: the giant name rises letter by letter.
  const mark = $('.footer-mark');
  if (mark) {
    // Size the name to span the page exactly, whatever the font and language.
    const fit = () => {
      mark.style.fontSize = '';
      const range = document.createRange();
      range.selectNodeContents(mark);
      const room = mark.clientWidth;
      const used = range.getBoundingClientRect().width;
      if (used > 0) mark.style.fontSize = `${(parseFloat(getComputedStyle(mark).fontSize) * room * 0.98) / used}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    // Arabic letters join, so the Arabic name rises as one piece.
    let parts = [mark];
    if (root.lang !== 'ar') {
      const text = mark.textContent;
      mark.textContent = '';
      parts = [...text].map((ch) => {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.textContent = ch === ' ' ? ' ' : ch;
        mark.appendChild(span);
        return span;
      });
    }
    gsap.from(parts, { yPercent: 100, opacity: 0, duration: 1.4, ease: EASE, stagger: 0.035, scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });
  }
}

// ---------- Services: cards stack, earlier ones shrink back ----------

function services(mm) {
  mm.add('(min-width: 821px)', () => {
    const cards = $$('.service');
    cards.forEach((card, i) => {
      gsap.from(card, { y: 120, opacity: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: card, start: 'top 95%', once: true } });
      const next = cards[i + 1];
      if (!next) return;
      gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
        scale: 0.92, filter: 'brightness(0.86)', ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 820px)', () => {
    gsap.utils.toArray('.service').forEach((card) => gsap.from(card, { y: 60, opacity: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: card, start: 'top 92%', once: true } }));
  });
}

// ---------- Work: a sideways gallery on wide screens ----------

function work(mm) {
  const list = $('.projects');
  if (!list) return;
  const viewport = document.createElement('div');
  viewport.className = 'projects-viewport';
  const pin = document.createElement('div');
  pin.className = 'projects-pin';
  list.before(viewport);
  viewport.appendChild(pin);
  pin.appendChild(list);
  const progress = document.createElement('div');
  progress.className = 'projects-progress';
  progress.setAttribute('aria-hidden', 'true');
  const total = list.children.length;
  progress.innerHTML = `<span class="projects-count">01 / ${String(total).padStart(2, '0')}</span><span class="projects-bar"><span></span></span>`;
  pin.appendChild(progress);
  const count = $('.projects-count', progress);
  const bar = $('.projects-bar span', progress);

  mm.add('(min-width: 1081px)', () => {
    root.classList.add('has-hscroll');
    const distance = () => Math.max(0, list.scrollWidth - window.innerWidth);
    const tween = gsap.to(list, {
      x: () => -distance() * dir,
      ease: 'none',
      scrollTrigger: {
        trigger: viewport, start: 'top top', end: () => `+=${distance()}`,
        pin: pin, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => {
          bar.style.transform = `scaleX(${self.progress})`;
          count.textContent = `${String(Math.min(total, Math.floor(self.progress * total) + 1)).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        },
      },
    });
    gsap.from($$('.project', list), { x: 160 * dir, opacity: 0, duration: 1.3, ease: EASE, stagger: 0.08, scrollTrigger: { trigger: viewport, start: 'top 70%', once: true } });
    $$('.project-shot img', list).forEach((img) => {
      gsap.fromTo(img, { xPercent: -7 * dir }, {
        xPercent: 7 * dir, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: rtl ? 'right left' : 'left right', end: rtl ? 'left right' : 'right left', scrub: true },
      });
    });
    return () => root.classList.remove('has-hscroll');
  });

  mm.add('(max-width: 1080px)', () => {
    $$('.project-shot').forEach((shot) => {
      gsap.fromTo(shot, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: shot, start: 'top 88%', once: true } });
      gsap.fromTo(shot.querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.8, ease: EASE, scrollTrigger: { trigger: shot, start: 'top 88%', once: true } });
    });
  });
}

// ---------- Process ----------

function flow() {
  const list = $('.flow');
  if (!list) return;
  const steps = [...list.children];
  gsap.fromTo(list, { '--progress': 0 }, {
    '--progress': 1, ease: 'none',
    scrollTrigger: {
      trigger: list, start: 'top 78%', end: 'bottom 50%', scrub: 0.6,
      onUpdate: (self) => steps.forEach((step, i) => step.classList.toggle('is-on', self.progress > i / steps.length + 0.01 || self.progress >= 0.99)),
    },
  });
  gsap.from(steps, { y: 50, opacity: 0, duration: 1.1, ease: EASE, stagger: 0.08, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
}

// ---------- Numbers in the Digival log ----------

function numbers() {
  $$('.log-result .data').forEach((el) => {
    const matches = el.textContent.match(/\d+/g);
    if (!matches || matches.length !== 1) return; // "2 h → <5 min" stays as written
    const [prefix, suffix] = el.textContent.split(matches[0]);
    const target = Number(matches[0]);
    const counter = { value: 0 };
    el.textContent = `${prefix}0${suffix}`;
    gsap.to(counter, {
      value: target, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => { el.textContent = `${prefix}${Math.round(counter.value)}${suffix}`; },
    });
  });
}

// ---------- Top bar: solid after the hero, hides while reading down ----------

function topbar() {
  const bar = $('.topbar');
  const drawer = $('#mobile-drawer');
  if (!bar) return;
  let hidden = false;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      bar.classList.toggle('is-solid', self.scroll() > 40);
      const hide = self.direction === 1 && self.scroll() > window.innerHeight * 0.8 && !drawer?.classList.contains('open');
      if (hide === hidden) return;
      hidden = hide;
      gsap.to(bar, { yPercent: hide ? -100 : 0, duration: 0.55, ease: hide ? 'power3.in' : EASE, overwrite: true });
    },
  });
  bar.addEventListener('focusin', () => { hidden = false; gsap.to(bar, { yPercent: 0, duration: 0.3 }); });

  // Underline the link for the section in view.
  $$('.topbar-links a').forEach((link) => {
    const section = $(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({ trigger: section, start: 'top 50%', end: 'bottom 50%', onToggle: (self) => link.classList.toggle('is-current', self.isActive) });
  });
}

// ---------- Cursor and magnetic buttons ----------

function pointer() {
  if (!finePointer) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);
  const x = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
  const y = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); cursor.classList.add('is-visible'); }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest('a, button, summary, select, label');
    cursor.classList.toggle('is-link', Boolean(target) && !e.target.closest('input, textarea'));
    cursor.classList.toggle('is-hidden', Boolean(e.target.closest('input, textarea, .project-shot')));
  });

  $$('.hero-actions .btn, .topbar .btn, .form .btn, .hire .btn').forEach((btn) => {
    const bx = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const by = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      bx((e.clientX - r.left - r.width / 2) * 0.3);
      by((e.clientY - r.top - r.height / 2) * 0.4);
    });
    btn.addEventListener('pointerleave', () => { bx(0); by(0); });
  });
}

// ---------- boot ----------

function boot() {
  window.__motion = true;
  root.classList.add('has-motion');
  initLenis();
  initScene();
  if (reducedMotion) {
    root.classList.remove('motion-pending');
    return;
  }
  const mm = gsap.matchMedia();
  intro(loader());
  marquee();
  services(mm);
  work(mm);
  reveals();
  flow();
  numbers();
  topbar();
  pointer();

  // Folded details and late images change the page height.
  $$('details').forEach((d) => d.addEventListener('toggle', () => ScrollTrigger.refresh()));
  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
