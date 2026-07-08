/* Benjy Stone — hero WebGL: assembly / hold / explode (Three.js r128 + UnrealBloom)
   Thousands of individually-instanced triangular particles drift in from a
   scattered field and converge into a single silhouette — a globe, traced
   as a grid of meridians and parallels rather than a filled ball, so it
   reads clearly as "globe": scattered data resolving into one coherent
   world view. The shape holds, fully legible, for a
   beat. Then it bursts outward with real per-particle velocity and drag,
   streaking as it goes, and the burst settles into the same ambient
   particle field that surrounds it the rest of the time — before slowly
   gathering itself back into the shape and repeating. The moment is the
   headline; the resting state is calm.

   Particles render in three solid colors — green, amber, dark blue — via three
   separate InstancedMesh groups (a plain material.color per mesh, no
   per-instance vertex-color attribute), which is the more broadly
   compatible pattern and avoids any renderer-version sensitivity around
   instanced color buffers. Falls back to the 2D canvas engine when WebGL
   is unavailable, and to the same fallback if anything here throws
   unexpectedly. */

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

  if (!window.THREE || !webglOK()) {
    const s = document.createElement('script');
    s.src = 'js/hero3d.js';
    document.body.appendChild(s);
    return;
  }

  // Defensive: if anything in this WebGL setup throws for a reason we
  // didn't anticipate (an unsupported API on some browser/GPU driver
  // combination), fall back to the 2D canvas engine rather than leaving
  // a blank hero.
  try {

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const low = mobile || (navigator.hardwareConcurrency || 8) <= 4;

  const ONYX = 0x000000;
  const IVORY = 0xededf3;

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
  scene.fog = new THREE.FogExp2(ONYX, 0.0009);

  scene.background = new THREE.Color(ONYX);

  const camera = new THREE.PerspectiveCamera(48, 1, 1, 6000);
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

  /* ---------- textures ---------- */

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

  /* ---------- mist/cloud layers: independent drift + scroll parallax ---------- */

  const LAYER_COUNT = low ? 3 : 4;
  const layers = [];
  for (let li = 0; li < LAYER_COUNT; li++) {
    const depthT = li / (LAYER_COUNT - 1);
    const z = -2500 + depthT * 1400;
    const count = low ? 3 : 3 + li;
    const group = new THREE.Group();
    group.position.z = z;
    world.add(group);

    const puffs = [];
    for (let i = 0; i < count; i++) {
      const tex = cloudTex[Math.floor(rand() * cloudTex.length)];
      const mat = new THREE.SpriteMaterial({
        map: tex, color: IVORY, transparent: true,
        opacity: 0.06 + depthT * 0.14, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = (700 + rand() * 900) * (0.6 + depthT * 0.8);
      sprite.scale.set(scale * 1.6, scale, 1);
      const baseX = -1600 + rand() * 3200;
      sprite.position.set(baseX, 20 + rand() * 460, 0);
      group.add(sprite);
      puffs.push({ sprite: sprite, baseX: baseX });
    }
    layers.push({
      puffs: puffs,
      drift: (0.25 + rand() * 0.4) * (0.5 + depthT) * (li % 2 ? 1 : -1),
      scrollFactor: 0.04 + depthT * 0.3,
    });
  }

  /* ---------- distant starfield: sparse backdrop, staggered reveal ---------- */

  const STAR_N = low ? 90 : 220;
  const starPos = new Float32Array(STAR_N * 3);
  const starCol = new Float32Array(STAR_N * 3);
  const starReveal = new Float32Array(STAR_N);
  const starTarget = new Float32Array(STAR_N);
  const starPhase = new Float32Array(STAR_N);
  for (let i = 0; i < STAR_N; i++) {
    starPos[i * 3] = (rand() - 0.5) * 3600;
    starPos[i * 3 + 1] = rand() * 1200 + 60;
    starPos[i * 3 + 2] = -3200 + (rand() - 0.5) * 500;
    starReveal[i] = rand() * 6;
    starTarget[i] = 0.2 + rand() * 0.45;
    starPhase[i] = rand() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 2.2, map: starTex, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  world.add(starPoints);

  function updateStars(t) {
    for (let i = 0; i < STAR_N; i++) {
      const p = clamp01((t - starReveal[i]) / 1.8);
      const eased = p * p * (3 - 2 * p);
      const twinkle = 0.85 + 0.15 * Math.sin(t * 1.3 + starPhase[i]);
      const b = eased * starTarget[i] * twinkle;
      starCol[i * 3] = b; starCol[i * 3 + 1] = b; starCol[i * 3 + 2] = b;
    }
    starGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- the signature moment: thousands of particles, one shape ---------- */

  const N = low ? 1500 : 4400;
  const SHAPE_CENTER = new THREE.Vector3(0, 30, -180);

  // A globe: particles trace meridian and parallel lines over a sphere,
  // the classic wireframe-globe grid, rather than filling the volume —
  // that's what reads as "globe" instead of just "ball." International
  // reach, a world of scattered data resolving into one coherent shape.
  function sampleGlobe(n) {
    const R = 92;
    const MERIDIANS = 18;
    const PARALLELS = 11;
    const pts = [];
    for (let i = 0; i < n; i++) {
      let theta, phi;
      if (rand() < 0.55) {
        // a meridian: fixed longitude, sweeping the full pole-to-pole arc
        theta = (Math.floor(rand() * MERIDIANS) / MERIDIANS) * Math.PI * 2;
        phi = (rand() - 0.5) * Math.PI;
      } else {
        // a parallel: fixed latitude, sweeping all the way around
        const band = Math.floor(rand() * PARALLELS) + 1;
        phi = (band / (PARALLELS + 1) - 0.5) * Math.PI;
        theta = rand() * Math.PI * 2;
      }
      const r = R * (1 + (rand() - 0.5) * 0.05);
      pts.push(new THREE.Vector3(
        r * Math.cos(phi) * Math.cos(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.sin(theta)
      ));
    }
    return pts;
  }
  const shapePoints = sampleGlobe(N);

  // a small flat triangle — the particle's own geometry
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 1.7, 0, -1.4, -1.1, 0, 1.4, -1.1, 0,
  ]), 3));

  // Three solid-color instanced meshes — green, amber, dark blue — instead of a
  // single mesh with per-instance vertex colors. This is the more robust,
  // widely-supported InstancedMesh pattern (a plain material.color per
  // mesh), and it sidesteps any renderer-version sensitivity around
  // per-instance color attributes entirely.
  const GREEN = 0x34d399;
  const AMBER = 0xfb923c;
  const DARKBLUE = 0x1e40af;
  const GROUPS = [
    { color: GREEN, share: 0.4 },
    { color: AMBER, share: 0.32 },
    { color: DARKBLUE, share: 0.28 },
  ];

  const counts = GROUPS.map((g) => Math.round(N * g.share));
  counts[counts.length - 1] += N - counts.reduce((a, b) => a + b, 0); // exact total

  const meshes = GROUPS.map((g, gi) => {
    const mat = new THREE.MeshBasicMaterial({
      color: g.color, transparent: true, opacity: 0.95,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.InstancedMesh(triGeo, mat, counts[gi]);
    world.add(mesh);
    return mesh;
  });

  const particles = [];
  let shapeIdx = 0;
  GROUPS.forEach((g, gi) => {
    for (let li = 0; li < counts[gi]; li++) {
      const roll = rand();
      const hot = roll > 0.88; // brighter, bigger, catch the light on the burst
      const scatter = new THREE.Vector3(
        (rand() - 0.5) * 1600,
        (rand() - 0.5) * 900 + 100,
        SHAPE_CENTER.z + (rand() - 0.5) * 1400
      );
      particles.push({
        mesh: meshes[gi],
        localIndex: li,
        current: scatter.clone(),
        cycleStart: scatter.clone(),
        target: shapePoints[shapeIdx].clone().add(SHAPE_CENTER),
        velocity: new THREE.Vector3(),
        hot: hot,
        scale: hot ? 1.15 + rand() * 0.4 : 0.6 + rand() * 0.45,
        spin: rand() * Math.PI * 2,
        spinVel: (rand() - 0.5) * (hot ? 3 : 1.2),
        phaseOffset: (rand() - 0.5) * 0.7,
      });
      shapeIdx++;
    }
  });

  // one continuous cycle: assemble -> hold -> explode -> drift (= ambient field) -> repeat
  const CYCLE = 13.5;
  const ASSEMBLE_END = 4.2;
  const HOLD_END = 6.6;
  const EXPLODE_END = 7.6;
  // after EXPLODE_END, particles are just integrating velocity + drag: that IS the drift/ambient phase

  let cycleStart = 0;
  const dummy = new THREE.Object3D();
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOutCubic = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  function updateField(t, bloomState) {
    let ct = (t - cycleStart);
    if (ct > CYCLE) {
      cycleStart = t - (ct % CYCLE);
      ct = t - cycleStart;
      // lock in each particle's actual position as the new assembly start,
      // so the loop never teleports — it always flows from wherever it is
      for (let i = 0; i < N; i++) particles[i].cycleStart.copy(particles[i].current);
    }

    let holdAmount = 0, burstAmount = 0;

    for (let i = 0; i < N; i++) {
      const p = particles[i];
      const localT = ct + p.phaseOffset;

      if (localT < ASSEMBLE_END) {
        const prog = easeOutCubic(clamp01(localT / ASSEMBLE_END));
        p.current.lerpVectors(p.cycleStart, p.target, prog);
        p.velocity.set(0, 0, 0);
        if (prog > 0.94) holdAmount += 1;
      } else if (localT < HOLD_END) {
        // held: fully formed, a small living jitter, nothing more
        const j = Math.sin(t * 2.2 + p.spin) * 0.35;
        p.current.copy(p.target);
        p.current.y += j * 0.4;
        p.current.x += Math.cos(t * 1.7 + p.spin) * 0.3;
        holdAmount += 1;
      } else if (localT < EXPLODE_END) {
        // the burst: radial velocity kicked once, then integrated
        if (!p.burstInit || cycleStart !== p.burstCycle) {
          const dir = p.target.clone().sub(SHAPE_CENTER).normalize();
          if (dir.lengthSq() < 0.001) dir.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
          const speed = (p.hot ? 55 : 30) + rand() * (p.hot ? 40 : 26);
          p.velocity.copy(dir).multiplyScalar(speed);
          p.velocity.x += (rand() - 0.5) * 14;
          p.velocity.y += (rand() - 0.5) * 14 + 6;
          p.burstInit = true;
          p.burstCycle = cycleStart;
        }
        p.current.addScaledVector(p.velocity, 0.016);
        p.velocity.multiplyScalar(0.965);
        burstAmount += 1;
      } else {
        // drift: same integration, heavier drag — this IS the ambient field
        p.current.addScaledVector(p.velocity, 0.016);
        p.velocity.multiplyScalar(0.983);
        p.velocity.y -= 0.01; // gentle settle
        p.current.x += Math.sin(t * 0.4 + p.spin) * 0.04;
        p.burstInit = false;
      }

      p.spin += p.spinVel * 0.016 * (1 + p.velocity.length() * 0.01);

      const speed = p.velocity.length();
      const stretch = clamp01(speed / 40);
      dummy.position.copy(p.current);
      dummy.rotation.set(p.spin * 0.6, p.spin, p.spin * 0.3);
      const s = p.scale * (0.85 + (p.hot ? 0.3 : 0));
      dummy.scale.set(s * (1 + stretch * 1.8), s * (1 + stretch * 2.6), s);
      dummy.updateMatrix();
      p.mesh.setMatrixAt(p.localIndex, dummy.matrix);
    }

    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

    bloomState.hold = holdAmount / N;
    bloomState.burst = burstAmount / N;
  }

  /* ---------- bloom composer ---------- */

  let composer = null;
  let bloomPass = null;
  if (!low && THREE.EffectComposer && THREE.UnrealBloomPass) {
    // Defensive: a bloom-pipeline construction failure must never take the
    // whole scene down with it — fall back to a plain render rather than
    // throwing before the render loop ever starts.
    try {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
        1.0, 0.7, 0.32
      );
      composer.addPass(bloomPass);
    } catch (e) {
      composer = null;
      bloomPass = null;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- interaction ---------- */

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

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  let t = 0;
  const bloomState = { hold: 0, burst: 0 };
  const LOOK = new THREE.Vector3().copy(SHAPE_CENTER);

  function drawScene(scrollY) {
    const introIn = easeOutCubic(clamp01(t / 2.2));

    vx += (tmx - mx) * 0.05; vx *= 0.86; mx += vx;
    vy += (tmy - my) * 0.05; vy *= 0.86; my += vy;

    layers.forEach((layer) => {
      const scrollOffset = scrollY * layer.scrollFactor;
      layer.puffs.forEach((p) => {
        let x = p.baseX + t * layer.drift * 18 + scrollOffset;
        x = ((((x + 3200) % 3200) + 3200) % 3200) - 1600;
        p.sprite.position.x = x;
      });
    });

    updateStars(t);
    updateField(t, bloomState);

    // bloom flares during the hold and the burst — the statement moments —
    // and settles calm the rest of the time
    if (bloomPass) {
      const target = 1.0 + bloomState.hold * 0.55 + bloomState.burst * 0.95;
      bloomPass.strength += (target - bloomPass.strength) * 0.08;
    }

    world.rotation.y = -0.02 + Math.sin(t * 0.07) * 0.03 + mx * 0.09;
    world.rotation.x = -0.01 + Math.sin(t * 0.055) * 0.014 + my * 0.045;

    const syp = clamp01(scrollY / window.innerHeight);
    rig.position.set(
      SHAPE_CENTER.x - mx * 45 + 50 * syp,
      SHAPE_CENTER.y + 20 + 160 * (1 - introIn) - my * 25 + syp * 120,
      SHAPE_CENTER.z + 260 + 480 * (1 - introIn) + syp * 400
    );
    camera.lookAt(LOOK);
    camera.rotation.z = mx * 0.012 + Math.sin(t * 0.045) * 0.005;

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
    t = ASSEMBLE_END + 1; // settled: shape formed and held, no burst cycling
    drawScene(window.scrollY);
  } else {
    requestAnimationFrame(frame);
  }

  } catch (e) {
    // something in the WebGL path failed unexpectedly — hand off to the
    // 2D engine rather than leaving the hero blank. A canvas that already
    // has a WebGL context can't hand out a 2D one, so swap in a fresh
    // canvas first.
    const fresh = canvas.cloneNode(false);
    canvas.parentNode.replaceChild(fresh, canvas);
    const s = document.createElement('script');
    s.src = 'js/hero3d.js';
    document.body.appendChild(s);
  }
})();
