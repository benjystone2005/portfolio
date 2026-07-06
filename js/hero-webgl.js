/* Benjy Stone — WebGL hero: dusk settling into night (Three.js r128 + UnrealBloom)
   A vertical evening-sky gradient sits behind everything, layered
   mist/cloud planes drift at independent speeds and depths with real
   scroll parallax, a starfield fades in with a gentle stagger (a
   handful of brighter "hero" stars among many small ones), and an
   ivory snow/starlight particle field drifts through the foreground.
   Camera motion is cinematic but composed — restrained rather than
   maximal, so it reads as premium rather than showy. Monochrome
   onyx/ivory throughout — the single cobalt note is a distant horizon
   glow acting purely as a light source, never a particle, star, or UI
   color. Falls back to the 2D canvas engine when WebGL is unavailable. */

(function () {
  'use strict';

  const canvas = document.getElementById('hero-scene');
  if (!canvas) return;

  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  // graceful degradation: no THREE / no WebGL → load the 2D engine
  if (!window.THREE || !webglOK()) {
    const s = document.createElement('script');
    s.src = 'js/hero3d.js';
    document.body.appendChild(s);
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const low = mobile || (navigator.hardwareConcurrency || 8) <= 4;

  const ONYX = 0x171721;
  const IVORY = 0xededf3;
  const COBALT = 0x5266eb;

  /* ---------- renderer / scene / camera ---------- */

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !low,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75));
  renderer.setClearColor(ONYX, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(ONYX, 0.0011);

  // evening-sky gradient — dusk near the horizon, deep night at the zenith
  (function () {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0c0c14');
    grad.addColorStop(0.45, '#171721');
    grad.addColorStop(0.78, '#1e1e2c');
    grad.addColorStop(1, '#272738');
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    scene.background = tex;
  })();

  const camera = new THREE.PerspectiveCamera(52, 1, 1, 6000);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  const world = new THREE.Group();
  scene.add(world);

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
  }

  /* ---------- seeded rng ---------- */

  let seedState = 20260706;
  function rand() {
    seedState = (seedState * 1664525 + 1013904223) >>> 0;
    return seedState / 4294967296;
  }

  /* ---------- soft cloud/mist texture ---------- */

  function cloudTexture(seed) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const blots = 5 + Math.floor(seed * 4);
    for (let i = 0; i < blots; i++) {
      const bx = 60 + rand() * 136;
      const by = 90 + rand() * 90;
      const br = 40 + rand() * 70;
      const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, 'rgba(237,237,243,0.55)');
      grad.addColorStop(0.5, 'rgba(237,237,243,0.22)');
      grad.addColorStop(1, 'rgba(237,237,243,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function glowTexture(inner, mid) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.4, mid);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  const cloudTex = [cloudTexture(0.3), cloudTexture(0.7), cloudTexture(1)];
  const starTex = glowTexture('rgba(237,237,243,1)', 'rgba(237,237,243,0.5)');
  const horizonTex = glowTexture('rgba(180,192,248,0.9)', 'rgba(82,102,235,0.35)');

  /* ---------- mist/cloud layers: independent drift + scroll parallax ---------- */

  const LAYER_COUNT = low ? 3 : 5;
  const layers = [];
  for (let li = 0; li < LAYER_COUNT; li++) {
    const depthT = li / (LAYER_COUNT - 1); // 0 = farthest, 1 = nearest
    const z = -2200 + depthT * 1750;
    const count = low ? 3 : 4 + li;
    const group = new THREE.Group();
    group.position.z = z;
    world.add(group);

    const puffs = [];
    for (let i = 0; i < count; i++) {
      const tex = cloudTex[Math.floor(rand() * cloudTex.length)];
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: IVORY,
        transparent: true,
        opacity: 0.1 + depthT * 0.22,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = (700 + rand() * 900) * (0.6 + depthT * 0.8);
      sprite.scale.set(scale * 1.6, scale, 1);
      const baseX = -1600 + rand() * 3200;
      sprite.position.set(baseX, -60 + rand() * 420, 0);
      group.add(sprite);
      puffs.push({ sprite: sprite, baseX: baseX });
    }

    layers.push({
      group: group,
      puffs: puffs,
      drift: (0.35 + rand() * 0.5) * (0.5 + depthT) * (li % 2 ? 1 : -1),
      scrollFactor: 0.05 + depthT * 0.4,
      z: z,
    });
  }

  /* ---------- distant horizon glow — the sole cobalt note, light-source only ---------- */

  const horizon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: horizonTex,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  horizon.scale.set(2600, 1500, 1);
  horizon.position.set(300, -180, -2400);
  world.add(horizon);

  /* ---------- starfield: dusk-to-night staggered reveal ---------- */

  function makeStars(n, size, spreadX, spreadY, z, revealSpan, targetMin, targetMax) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const revealAt = new Float32Array(n);
    const target = new Float32Array(n);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * spreadX;
      pos[i * 3 + 1] = rand() * spreadY - spreadY * 0.1;
      pos[i * 3 + 2] = z + (rand() - 0.5) * 500;
      revealAt[i] = rand() * revealSpan;
      target[i] = targetMin + rand() * (targetMax - targetMin);
      phase[i] = rand() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: size,
      map: starTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    world.add(points);
    return { geo: geo, revealAt: revealAt, target: target, phase: phase, n: n };
  }

  function updateStars(sys, t) {
    const col = sys.geo.attributes.color.array;
    for (let i = 0; i < sys.n; i++) {
      const p = clamp01((t - sys.revealAt[i]) / 1.8);
      const eased = p * p * (3 - 2 * p); // smoothstep — gentle, not a hard pop-in
      const twinkle = 0.85 + 0.15 * Math.sin(t * 1.3 + sys.phase[i]);
      const b = eased * sys.target[i] * twinkle;
      col[i * 3] = b;
      col[i * 3 + 1] = b;
      col[i * 3 + 2] = b;
    }
    sys.geo.attributes.color.needsUpdate = true;
  }

  // many small, subtle points — the general starfield
  const starsFar = makeStars(low ? 140 : 380, 2.4, 3800, 1500, -3300, 7, 0.28, 0.7);
  // a handful of brighter "hero" stars with soft glow, revealed a little later
  const starsHero = makeStars(low ? 3 : 8, 12, 3200, 1100, -2950, 6.5, 0.8, 1);

  /* ---------- ivory starlight / snow particle field ---------- */

  function makeParticles(n, size, tex, speedMin, speedMax, spreadZ) {
    const pos = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    const sway = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * 2400;
      pos[i * 3 + 1] = (rand() - 0.5) * 900;
      pos[i * 3 + 2] = -spreadZ + rand() * spreadZ * 2;
      speeds[i] = speedMin + rand() * (speedMax - speedMin);
      sway[i] = rand() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: IVORY,
      size: size,
      map: tex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    world.add(points);
    return { geo: geo, mat: mat, speeds: speeds, sway: sway, n: n };
  }

  const snow = makeParticles(low ? 500 : 2200, 7, starTex, 0.35, 1.1, 1400);
  const drift = makeParticles(low ? 220 : 900, 12, starTex, 0.12, 0.4, 2000);

  function updateParticles(sys, t) {
    const arr = sys.geo.attributes.position.array;
    for (let i = 0; i < sys.n; i++) {
      arr[i * 3 + 1] -= sys.speeds[i];
      arr[i * 3] += Math.sin(t * 0.6 + sys.sway[i]) * 0.12;
      if (arr[i * 3 + 1] < -460) arr[i * 3 + 1] = 460;
    }
    sys.geo.attributes.position.needsUpdate = true;
  }

  /* ---------- bloom composer ---------- */

  let composer = null;
  if (!low && THREE.EffectComposer && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      1.05,  // strength — a composed glow, not a blown-out wash
      0.75,  // radius
      0.38   // threshold — only the horizon glow + hero stars catch it
    ));
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- interaction: exaggerated spring parallax ---------- */

  let tmx = 0, tmy = 0, mx = 0, my = 0, vx = 0, vy = 0;
  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduced) requestAnimationFrame(frame);
  });

  /* ---------- main loop ---------- */

  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  let t = 0;
  const LOOK = new THREE.Vector3(0, -20, -600);
  const SPAN = 3200; // wrap width for seamless cloud looping

  function drawScene(scrollY) {
    const intro = easeOutCubic(clamp01(t / 2.3));

    // spring physics — present, but composed rather than heavy
    vx += (tmx - mx) * 0.05; vx *= 0.86; mx += vx;
    vy += (tmy - my) * 0.05; vy *= 0.86; my += vy;

    // clouds: independent ambient drift + per-layer scroll parallax, wrapped seamlessly
    layers.forEach((layer) => {
      const scrollOffset = scrollY * layer.scrollFactor;
      layer.puffs.forEach((p) => {
        let x = p.baseX + t * layer.drift * 22 + scrollOffset;
        x = ((((x + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;
        p.sprite.position.x = x;
      });
    });

    // horizon glow: slow atmospheric breathing
    horizon.material.opacity = 0.4 + Math.sin(t * 0.35) * 0.15;

    // stars: dusk gradually populating with night, staggered — then a gentle twinkle
    updateStars(starsFar, t);
    updateStars(starsHero, t);

    updateParticles(snow, t);
    updateParticles(drift, t);

    // world motion — never still, but calm and atmospheric (not mechanical)
    world.rotation.y = -0.06 - 0.55 * (1 - intro) + Math.sin(t * 0.09) * 0.06 + mx * 0.18;
    world.rotation.x = -0.015 + Math.sin(t * 0.065) * 0.02 + my * 0.09;

    // cinematic camera: dolly-in + composed parallax + scroll pull-away
    const syp = clamp01(scrollY / window.innerHeight);
    rig.position.set(
      -mx * 90 + 200 * syp,
      25 + 170 * (1 - intro) - my * 40 + syp * 120,
      680 + 560 * (1 - intro) + syp * 440
    );
    camera.lookAt(LOOK);
    camera.rotation.z = mx * 0.025 + Math.sin(t * 0.055) * 0.008;

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function frame() {
    if (!running) return;
    const sy = window.scrollY;
    if (sy < window.innerHeight * 1.4) {
      t += 0.016;
      drawScene(sy);
      canvas.style.transform = `translateY(${sy * 0.3}px)`;
    }
    if (!reduced) requestAnimationFrame(frame);
  }

  if (reduced) {
    t = 8;
    drawScene(window.scrollY);
  } else {
    requestAnimationFrame(frame);
  }
})();
