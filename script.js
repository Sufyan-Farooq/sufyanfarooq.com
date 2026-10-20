/**
 * SUFYAN FAROOQ — PORTFOLIO ENGINE
 * Three.js WebGL Interactive 3D Canvas, 3D Bento Tilts, Command Palette (⌘K) & Telemetry
 */

(function () {
  'use strict';

  // ---------- 1. Lucide Icons Initialization ----------
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ---------- 2. Three.js 3D Interactive Background ----------
  function initThreeJsCanvas() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.style.display = 'none';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 180;
    camera.position.y = 40;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to static background.', e);
      return;
    }

    // Interactive Particle Mesh & Wave
    const particleCount = window.innerWidth < 768 ? 1200 : 2600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const initialY = new Float32Array(particleCount);

    const colorPrimary = new THREE.Color(0x3b82f6);
    const colorSecondary = new THREE.Color(0x60a5fa);
    const colorDust = new THREE.Color(0x27272a);

    const xSpan = 380;
    const zSpan = 320;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * xSpan;
      const z = (Math.random() - 0.5) * zSpan;
      const y = (Math.sin(x * 0.03) + Math.cos(z * 0.03)) * 14;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      initialY[i] = y;

      // Color distribution: emerald accent near center, cyan highlights, muted dust on fringe
      const distFromCenter = Math.sqrt(x * x + z * z) / (xSpan * 0.5);
      let pColor;
      const rand = Math.random();

      if (distFromCenter < 0.45 && rand > 0.3) {
        pColor = colorPrimary;
      } else if (distFromCenter < 0.75 && rand > 0.6) {
        pColor = colorSecondary;
      } else {
        pColor = colorDust;
      }

      colors[i3] = pColor.r;
      colors[i3 + 1] = pColor.g;
      colors[i3 + 2] = pColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circular particle texture for high-craft anti-aliased dots
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const radGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    radGrad.addColorStop(0, 'rgba(255,255,255,1)');
    radGrad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    radGrad.addColorStop(0.8, 'rgba(255,255,255,0.15)');
    radGrad.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = radGrad;
    pCtx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 3.2,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Mouse Tracking with Spring Lerp
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    window.addEventListener('mousemove', (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // Window Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, { passive: true });

    // Render Animation Loop
    let clock = new THREE.Clock();
    let isVisible = true;

    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Smooth Spring Lerp for Camera Pan
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      camera.position.x = currentMouseX * 35;
      camera.position.y = 40 - currentMouseY * 25;
      camera.lookAt(0, 0, 0);

      // Undulate Particle Wave via vertex buffer
      const posAttr = geometry.attributes.position;
      const array = posAttr.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const px = array[i3];
        const pz = array[i3 + 2];

        // Harmonic wave oscillation
        array[i3 + 1] =
          initialY[i] +
          Math.sin(px * 0.04 + elapsed * 1.2) * 6 +
          Math.cos(pz * 0.04 + elapsed * 1.0) * 6;
      }
      posAttr.needsUpdate = true;

      // Gentle continuous rotation
      particleSystem.rotation.y = elapsed * 0.03;

      renderer.render(scene, camera);
    }

    animate();
  }

  // ---------- 3. 3D Bento Portrait Card Perspective Tilt ----------
  function initPortrait3DTilt() {
    const card = document.getElementById('portrait-card');
    if (!card) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalized coordinates (-1 to +1)
      const normX = (x / rect.width - 0.5) * 2;
      const normY = (y / rect.height - 0.5) * 2;

      card.style.setProperty('--tilt-x', `${-normY * 9}deg`);
      card.style.setProperty('--tilt-y', `${normX * 9}deg`);
      card.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);
      card.style.setProperty('--glare-opacity', '1');
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--glare-opacity', '0');
    });
  }

  // ---------- 4. 3D Holographic Project Cards Tilt ----------
  function initProjectCardsTilt() {
    const cards = document.querySelectorAll('.project-3d-card');
    if (!cards.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const normX = (x / rect.width - 0.5) * 2;
        const normY = (y / rect.height - 0.5) * 2;

        card.style.transform = `perspective(1000px) rotateX(${-normY * 6}deg) rotateY(${normX * 6}deg) translateY(-4px)`;
        card.style.setProperty('--card-mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--card-mouse-y', `${(y / rect.height) * 100}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

  // ---------- 5. Power-User Command Palette (⌘K) ----------
  function initCommandPalette() {
    const modal = document.getElementById('cmdk-modal');
    const input = document.getElementById('cmdk-input');
    const list = document.getElementById('cmdk-list');
    const closeBtn = document.getElementById('cmdk-close-btn');
    const triggerBtn = document.getElementById('cmdk-trigger-btn');
    const heroBtn = document.getElementById('hero-cmdk-btn');

    if (!modal || !input || !list) return;

    const actions = [
      {
        id: 'download-cv',
        title: 'Download CV (PDF)',
        category: 'Action',
        shortcut: 'D',
        icon: 'download',
        run: () => document.querySelector('[data-cv-download]')?.click(),
      },
      {
        id: 'projects',
        title: 'Explore Selected Work',
        category: 'Navigation',
        shortcut: 'P',
        icon: 'folder-git-2',
        run: () => scrollToId('projects'),
      },
      {
        id: 'experience',
        title: 'Work Experience & Impact',
        category: 'Navigation',
        shortcut: 'E',
        icon: 'briefcase',
        run: () => scrollToId('experience'),
      },
      {
        id: 'skills',
        title: 'Skills and How I Work',
        category: 'Navigation',
        shortcut: 'S',
        icon: 'layers',
        run: () => scrollToId('skills'),
      },
      {
        id: 'about',
        title: 'About Sufyan Farooq',
        category: 'Navigation',
        shortcut: 'A',
        icon: 'user',
        run: () => scrollToId('about'),
      },
      {
        id: 'contact',
        title: 'Send a Message / Contact',
        category: 'Action',
        shortcut: 'C',
        icon: 'send',
        run: () => scrollToId('contact'),
      },
      {
        id: 'copy-email',
        title: 'Copy Email Address to Clipboard',
        category: 'Action',
        shortcut: 'M',
        icon: 'copy',
        run: () => copyEmailToClipboard(),
      },
      {
        id: 'github',
        title: 'Open GitHub Profile',
        category: 'External',
        shortcut: 'G',
        icon: 'github',
        run: () => window.open('https://github.com/Sufyan-Farooq', '_blank'),
      },
      {
        id: 'linkedin',
        title: 'Open LinkedIn Profile',
        category: 'External',
        shortcut: 'I',
        icon: 'linkedin',
        run: () => window.open('https://www.linkedin.com/in/sufyanmfarooq/', '_blank'),
      },
    ];

    let filtered = actions;
    let selectedIndex = 0;
    let isOpen = false;

    function renderItems() {
      list.innerHTML = '';
      if (!filtered.length) {
        list.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No commands matching query</div>';
        return;
      }

      filtered.forEach((action, idx) => {
        const item = document.createElement('div');
        item.className = `cmdk-item ${idx === selectedIndex ? 'selected' : ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', idx === selectedIndex ? 'true' : 'false');

        item.innerHTML = `
          <div class="cmdk-item-left">
            <i data-lucide="${action.icon}" class="cmdk-item-icon"></i>
            <span>${action.title}</span>
          </div>
          ${action.shortcut ? `<kbd class="cmdk-item-shortcut">${action.shortcut}</kbd>` : ''}
        `;

        item.addEventListener('click', () => {
          selectedIndex = idx;
          executeSelected();
        });

        list.appendChild(item);
      });

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }

    function openModal() {
      isOpen = true;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      input.value = '';
      filtered = actions;
      selectedIndex = 0;
      renderItems();
      setTimeout(() => input.focus(), 30);
    }

    function closeModal() {
      isOpen = false;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
    }

    function executeSelected() {
      if (filtered[selectedIndex]) {
        const action = filtered[selectedIndex];
        closeModal();
        action.run();
      }
    }

    function scrollToId(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    // Input filtering
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      filtered = actions.filter((a) =>
        a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
      );
      selectedIndex = 0;
      renderItems();
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      // Toggle modal with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen ? closeModal() : openModal();
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filtered.length;
        renderItems();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
        renderItems();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
      }
    });

    if (triggerBtn) triggerBtn.addEventListener('click', openModal);
    if (heroBtn) heroBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ---------- 6. Live Telemetry & Local AST Clock ----------
  function initLiveTelemetry() {
    const pingNum = document.getElementById('live-ping-num');
    const edgePingLabel = document.getElementById('edge-ping-label');
    const localTimeNum = document.getElementById('local-time-num');
    const heroClock = document.getElementById('hero-clock');

    // Live AST Clock (Jeddah is UTC+3)
    function updateClock() {
      const now = new Date();
      // Format time in Arabia Standard Time
      const options = {
        timeZone: 'Asia/Riyadh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat([], options);
      const timeStr = formatter.format(now);

      if (localTimeNum) localTimeNum.textContent = timeStr;
      if (heroClock) heroClock.textContent = `Jeddah, SA • ${timeStr.slice(0, 5)} AST`;
    }

    updateClock();
    setInterval(updateClock, 1000);

    // The former edge-RTT label was not a meaningful performance claim for
    // visitors. Keep the local Jeddah clock without making repeated requests.
  }

  // ---------- 7. Mobile Drawer Navigation ----------
  function initMobileDrawer() {
    const navToggle = document.getElementById('nav-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const links = document.querySelectorAll('.mobile-link');

    if (!navToggle || !drawer) return;

    navToggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      drawer.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      drawer.setAttribute('aria-hidden', String(isOpen));
    });

    links.forEach((l) => {
      l.addEventListener('click', () => {
        drawer.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ---------- 8. Contact Form & Copy Email ----------
  function copyEmailToClipboard() {
    const email = 'sufyanfarooqsmf@gmail.com';
    navigator.clipboard.writeText(email).then(() => {
      const copyBtnText = document.getElementById('copy-btn-text');
      if (copyBtnText) {
        const original = copyBtnText.textContent;
        copyBtnText.textContent = 'Copied!';
        setTimeout(() => {
          copyBtnText.textContent = original;
        }, 2000);
      }
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');
    const copyBtn = document.getElementById('copy-email-btn');

    if (copyBtn) {
      copyBtn.addEventListener('click', copyEmailToClipboard);
    }

    if (!form || !status || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Transmitting...</span>';

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          status.textContent = 'Message transmitted successfully. I will get back to you shortly!';
          status.className = 'form-status success';
          form.reset();
        } else {
          status.textContent = 'Failed to transmit message. Please email directly at sufyanfarooqsmf@gmail.com';
          status.className = 'form-status error';
        }
      } catch (err) {
        status.textContent = 'Network error. Please email directly at sufyanfarooqsmf@gmail.com';
        status.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ---------- 9. Visitor Analytics & Footer Count ----------
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
    initCommandPalette();
    initLiveTelemetry();
    initMobileDrawer();
    initContactForm();
    recordVisit();
  });
})();
