/**
 * Hero scene: the server at the centre, each app I monitor on an orbit.
 * Nodes take their colour from the live checks (/api/status via script.js):
 * grey until checked, green when the app answered, red when it did not.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Color, Vector3,
  IcosahedronGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, LineDashedMaterial,
  Mesh, MeshBasicMaterial, SphereGeometry, BufferGeometry, Float32BufferAttribute,
  LineLoop, Sprite, SpriteMaterial, CanvasTexture, SRGBColorSpace,
} from 'three';

const COLORS = {
  navy: 0x0e1b3f,
  navy3: 0x1c2a55,
  line: 0x26345f,
  lineStrong: 0x3b4a79,
  studio: 0xefefef,
  idle: 0x9aa4bf,
  ok: 0x6fe39a,
  bad: 0xff8a8a,
};

const RINGS = [
  { radius: 2.3, tilt: [-1.2, 0.1, 0.25], speed: 0.07, dashed: false },
  { radius: 3.3, tilt: [-1.1, -0.15, -0.4], speed: -0.045, dashed: false },
  { radius: 4.3, tilt: [-1.25, 0.2, 0.6], speed: 0.03, dashed: true },
];

const FOV = 35;
const CAMERA_Z = 14;

function ringTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function circlePoints(radius, segments = 160) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  }
  return points;
}

export function createScene(container, { services, rtl = false, reducedMotion = false }) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.classList.add('scene-canvas');
  container.appendChild(renderer.domElement);

  const labelLayer = document.createElement('div');
  labelLayer.className = 'scene-labels';
  container.appendChild(labelLayer);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMERA_Z);

  // anchor: placement on the page; tilt: pointer and scroll; spin: idle turn
  const anchor = new Group();
  const tilt = new Group();
  const spin = new Group();
  anchor.add(tilt);
  tilt.add(spin);
  scene.add(anchor);

  // --- core: the server ---
  const coreGeo = new IcosahedronGeometry(1.05, 1);
  const core = new Group();
  const coreEdges = new LineSegments(new EdgesGeometry(coreGeo), new LineBasicMaterial({ color: COLORS.studio, transparent: true, opacity: 0.85 }));
  const coreFill = new Mesh(new IcosahedronGeometry(1.0, 1), new MeshBasicMaterial({ color: COLORS.navy }));
  const coreDot = new Mesh(new SphereGeometry(0.16, 16, 12), new MeshBasicMaterial({ color: COLORS.studio }));
  core.add(coreFill, coreEdges);
  spin.add(core, coreDot);

  // --- orbits ---
  const rings = RINGS.map((def) => {
    const group = new Group();
    group.rotation.set(...def.tilt);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(circlePoints(def.radius), 3));
    const material = def.dashed
      ? new LineDashedMaterial({ color: COLORS.lineStrong, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.9 })
      : new LineBasicMaterial({ color: COLORS.lineStrong, transparent: true, opacity: 0.9 });
    const loop = new LineLoop(geometry, material);
    if (def.dashed) loop.computeLineDistances();
    group.add(loop);
    spin.add(group);
    return { ...def, group };
  });

  // --- nodes: one per app ---
  const halo = ringTexture();
  const nodeGeo = new SphereGeometry(0.12, 16, 12);
  const nodes = services.map((service, index) => {
    const ring = rings[index % rings.length];
    const onRing = services.filter((_, i) => i % rings.length === index % rings.length).length;
    const slot = Math.floor(index / rings.length);
    const angle = (slot / onRing) * Math.PI * 2 + index * 0.9;
    const mesh = new Mesh(nodeGeo, new MeshBasicMaterial({ color: COLORS.idle }));
    const ringSprite = new Sprite(new SpriteMaterial({ map: halo, color: COLORS.idle, transparent: true, opacity: 0.35, depthWrite: false }));
    ringSprite.scale.setScalar(0.5);
    mesh.add(ringSprite);
    ring.group.add(mesh);

    const label = document.createElement('span');
    label.className = 'scene-label';
    label.innerHTML = '<span class="scene-label-name"></span><span class="scene-label-data"></span>';
    label.querySelector('.scene-label-name').textContent = service.name;
    labelLayer.appendChild(label);

    return { ...service, ring, angle, mesh, ringSprite, label, pulse: 0, focus: 0, state: 'idle' };
  });

  // --- spokes from the core to each node ---
  const spokeGeo = new BufferGeometry();
  spokeGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(nodes.length * 6), 3));
  const spokes = new LineSegments(spokeGeo, new LineBasicMaterial({ color: COLORS.lineStrong, transparent: true, opacity: 0.45 }));
  spin.add(spokes);

  // --- packets: a check travelling out to an app ---
  const packetGeo = new SphereGeometry(0.06, 10, 8);
  const packets = [];
  function sendPacket(node, onArrive) {
    const mesh = new Mesh(packetGeo, new MeshBasicMaterial({ color: COLORS.studio, transparent: true }));
    spin.add(mesh);
    packets.push({ node, mesh, t: 0, duration: 0.85, onArrive });
  }

  // --- layout ---
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 1;
  let height = 1;
  let wide = true;
  let scroll = 0;
  let intro = reducedMotion ? 1 : 0;

  function layout() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    wide = window.matchMedia('(min-width: 1081px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, wide ? 2 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const visibleH = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
    const visibleW = visibleH * camera.aspect;
    const fit = Math.min(1, (visibleW * (wide ? 0.6 : 0.74)) / 9.2, visibleH / 7.4);
    anchor.scale.setScalar(fit);
    anchor.position.x = wide ? visibleW * 0.25 * (rtl ? -1 : 1) : 0;
    anchor.position.y = wide ? -visibleH * 0.02 : 0;
    render();
  }

  // --- status ---
  const stateColor = { idle: COLORS.idle, ok: COLORS.ok, bad: COLORS.bad };
  function paint(node, state) {
    node.state = state;
    const color = new Color(stateColor[state]);
    node.mesh.material.color.copy(color);
    node.ringSprite.material.color.copy(color);
    node.label.dataset.state = state;
  }

  function applyStatus(data) {
    if (!data) {
      nodes.forEach((node) => { paint(node, 'idle'); node.label.querySelector('.scene-label-data').textContent = '—'; });
      render();
      return;
    }
    data.services.forEach((service, index) => {
      const node = nodes.find((n) => n.id === service.id);
      if (!node || !service.at) return;
      const finish = () => {
        paint(node, service.ok ? 'ok' : 'bad');
        node.label.querySelector('.scene-label-data').textContent = service.ms != null ? `${service.ms} ms` : (service.code ?? '—');
        node.pulse = 1;
        render();
      };
      if (reducedMotion) finish();
      else setTimeout(() => sendPacket(node, finish), 140 * index);
    });
  }

  function focus(id) {
    nodes.forEach((node) => {
      node.focused = node.id === id;
      node.label.classList.toggle('is-focus', node.focused);
      if (node.focused && !reducedMotion) sendPacket(node, () => { node.pulse = 1; });
    });
    render();
  }

  // --- frame ---
  const tmp = new Vector3();
  const local = new Vector3();
  let elapsed = 0;
  let visible = true;

  function update(dt) {
    elapsed += dt;
    if (!reducedMotion) {
      spin.rotation.y += dt * 0.05;
      core.rotation.x += dt * 0.12;
      core.rotation.y += dt * 0.18;
      nodes.forEach((node) => { node.angle += dt * node.ring.speed * 2; });
      intro = Math.min(1, intro + dt / 1.6);
    }
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    tilt.rotation.x = pointer.y * 0.12 + scroll * 0.55;
    tilt.rotation.y = pointer.x * 0.18;
    tilt.rotation.z = scroll * 0.12;
    const ease = 1 - Math.pow(1 - intro, 3);
    spin.scale.setScalar(0.6 + 0.4 * ease);
    camera.position.z = CAMERA_Z + scroll * 5;

    const positions = spokeGeo.attributes.position.array;
    nodes.forEach((node, i) => {
      node.mesh.position.set(Math.cos(node.angle) * node.ring.radius, Math.sin(node.angle) * node.ring.radius, 0);
      node.pulse = Math.max(0, node.pulse - dt * 1.4);
      node.focus += ((node.focused ? 1 : 0) - node.focus) * Math.min(1, dt * 8);
      node.mesh.scale.setScalar(1 + node.focus * 0.6);
      node.ringSprite.scale.setScalar(0.5 + node.pulse * 0.9 + node.focus * 0.15);
      node.ringSprite.material.opacity = 0.35 + node.pulse * 0.4;

      node.mesh.getWorldPosition(tmp);
      local.copy(tmp);
      spin.worldToLocal(local);
      positions.set([0, 0, 0, local.x, local.y, local.z], i * 6);
    });
    spokeGeo.attributes.position.needsUpdate = true;

    for (let i = packets.length - 1; i >= 0; i -= 1) {
      const packet = packets[i];
      packet.t += dt / packet.duration;
      const k = Math.min(1, packet.t);
      packet.node.mesh.getWorldPosition(tmp);
      spin.worldToLocal(tmp);
      packet.mesh.position.copy(tmp).multiplyScalar(1 - Math.pow(1 - k, 2));
      if (k >= 1) {
        spin.remove(packet.mesh);
        packet.mesh.material.dispose();
        packets.splice(i, 1);
        packet.onArrive?.();
      }
    }
  }

  function placeLabels() {
    const showLabels = width > 340;
    nodes.forEach((node) => {
      node.mesh.getWorldPosition(tmp);
      const depth = tmp.z;
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      const near = Math.min(1, Math.max(0.55, 0.75 + depth / 8));
      node.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      node.label.classList.toggle('is-flip', x > width - 140);
      node.label.style.opacity = showLabels ? String((node.focused ? 1 : near) * intro) : '0';
    });
  }

  function render() {
    renderer.render(scene, camera);
    placeLabels();
  }

  function tick(dt) {
    if (!visible || document.hidden) return;
    update(Math.min(dt, 0.05));
    render();
  }

  // --- events ---
  const onPointer = (event) => {
    if (event.pointerType === 'touch') return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(container);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '80px' });
  visibility.observe(container);

  layout();
  update(0);
  render();

  return {
    tick,
    applyStatus,
    focus,
    setScroll(value) { scroll = value; if (reducedMotion) { update(0); render(); } },
    destroy() {
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      visibility.disconnect();
      renderer.dispose();
    },
  };
}
