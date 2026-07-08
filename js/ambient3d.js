/* Benjy Stone — ambient 2D scene for interior page heroes
   Same alpine blue-hour language as the home hero, scaled down: an
   evening-sky gradient, a moon rendered as a shaded, slowly-spinning
   disc with its own soft halo, a realistic starfield (varied sizes,
   diffraction-spike flares on the brighter stars, organic twinkle, and
   independent slow drift so the field feels like it's floating rather
   than pinned in place), drifting mist layers, and a soft cobalt
   horizon glow (light source only). No market/finance iconography. */

(function () {
  'use strict';

  const canvas = document.querySelector('.page-hero__scene');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;

  const IVORY = '237, 237, 243';
  const COBALT = '82, 102, 235';
  const MOON_SHADOW = '150, 150, 160';

  let W, H;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  let seedState = 20260706;
  function rand() {
    seedState = (seedState * 1664525 + 1013904223) >>> 0;
    return seedState / 4294967296;
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* ---------- starfield: realistic — varied size, flares, organic drift ---------- */

  function makeStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      // size distribution weighted toward small, like a real sky
      const sizeRoll = rand() * rand();
      const spiky = sizeRoll > 0.82;
      stars.push({
        x: rand(),
        y: rand() * 0.62,
        size: 0.4 + sizeRoll * (spiky ? 2.6 : 1.5),
        spiky: spiky,
        depth: 0.3 + rand() * 0.7,
        revealAt: rand() * 6,
        target: 0.3 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
        tFreq1: 0.6 + rand() * 1.1,
        tFreq2: 1.6 + rand() * 2.2,
        driftAmp: (2 + rand() * 5) * (mobile ? 0.6 : 1),
        driftFreq: 0.05 + rand() * 0.12,
      });
    }
    return stars;
  }

  const stars = makeStars(mobile ? 55 : 130);

  function drawStars(t, mx, my) {
    for (const s of stars) {
      const p = clamp01((t - s.revealAt) / 2.2);
      const eased = p * p * (3 - 2 * p);
      // organic twinkle: two overlapping frequencies, never fully dark
      const twinkle = 0.55 + 0.25 * Math.sin(t * s.tFreq1 + s.phase) +
        0.2 * Math.sin(t * s.tFreq2 + s.phase * 1.7);
      const a = eased * s.target * Math.max(0.3, twinkle);
      if (a <= 0.01) continue;

      const fx = s.x * W + Math.sin(t * s.driftFreq + s.phase) * s.driftAmp + mx * s.depth * 16;
      const fy = s.y * H + Math.cos(t * s.driftFreq * 0.8 + s.phase * 1.3) * s.driftAmp * 0.6 + my * s.depth * 8;

      if (s.spiky) {
        const glowR = s.size * 5.5;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
        grad.addColorStop(0, `rgba(${IVORY}, ${a * 0.9})`);
        grad.addColorStop(1, `rgba(${IVORY}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, glowR, 0, Math.PI * 2);
        ctx.fill();

        const spikeLen = s.size * 7.5;
        ctx.strokeStyle = `rgba(${IVORY}, ${a * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(fx - spikeLen, fy); ctx.lineTo(fx + spikeLen, fy);
        ctx.moveTo(fx, fy - spikeLen); ctx.lineTo(fx, fy + spikeLen);
        ctx.stroke();
      }

      ctx.fillStyle = `rgba(${IVORY}, ${a})`;
      ctx.beginPath();
      ctx.arc(fx, fy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- the moon: shaded disc, slowly spinning, soft halo ---------- */

  const MOON = { x: 0.8, y: 0.24 };
  const MOON_CRATERS = [];
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const dist = rand() * 0.68;
    MOON_CRATERS.push({
      x: Math.cos(a) * dist, y: Math.sin(a) * dist,
      r: 0.07 + rand() * 0.13,
      a: 0.12 + rand() * 0.14,
    });
  }

  function drawMoon(t, mx) {
    const cx = MOON.x * W + mx * 8;
    const cy = MOON.y * H;
    const r = Math.min(W, H) * 0.072;

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.4);
    halo.addColorStop(0, `rgba(${IVORY}, 0.14)`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
    ctx.fill();

    // shaded like a lit sphere, not a flat disc
    const disc = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, r * 0.1, cx, cy, r);
    disc.addColorStop(0, 'rgba(247, 247, 250, 0.97)');
    disc.addColorStop(0.65, 'rgba(224, 224, 231, 0.9)');
    disc.addColorStop(1, 'rgba(196, 196, 206, 0.78)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // craters, clipped to the disc, slowly spinning
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.045);
    MOON_CRATERS.forEach((c) => {
      ctx.fillStyle = `rgba(${MOON_SHADOW}, ${c.a})`;
      ctx.beginPath();
      ctx.arc(c.x * r, c.y * r, c.r * r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  const LAYER_COUNT = mobile ? 2 : 4;
  const layers = [];
  for (let li = 0; li < LAYER_COUNT; li++) {
    const depthT = li / (LAYER_COUNT - 1);
    const count = mobile ? 2 : 3;
    const puffs = [];
    for (let i = 0; i < count; i++) {
      puffs.push({
        baseX: rand() * 1.4 - 0.2,
        y: 0.1 + rand() * 0.6,
        r: (50 + rand() * 110) * (0.5 + depthT * 0.8),
        alpha: 0.05 + depthT * 0.13,
      });
    }
    layers.push({
      puffs: puffs,
      drift: (0.006 + rand() * 0.012) * (li % 2 ? 1 : -1),
      scrollFactor: 0.03 + depthT * 0.22,
    });
  }

  const PARTICLES = mobile ? 30 : 70;
  const particles = [];
  function resetParticle(p, initial) {
    p.x = rand() * W;
    p.y = initial ? rand() * H : -10;
    p.v = 0.2 + rand() * 0.5;
    p.size = 0.6 + rand() * 1.5;
    p.sway = rand() * Math.PI * 2;
  }
  for (let i = 0; i < PARTICLES; i++) {
    const p = {};
    resetParticle(p, true);
    particles.push(p);
  }

  let tmx = 0, tmy = 0, mx = 0, my = 0;
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

  let t = 0;

  function drawScene(sy) {
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    ctx.clearRect(0, 0, W, H);

    // evening-sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c0c14');
    sky.addColorStop(0.5, '#171721');
    sky.addColorStop(0.82, '#1e1e2c');
    sky.addColorStop(1, '#272738');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawMoon(t, mx);
    drawStars(t, mx, my);

    const glowY = H * 0.5;
    const breathe = 0.4 + Math.sin(t * 0.3) * 0.15;
    const hg = ctx.createRadialGradient(W * 0.6 + mx * 40, glowY, 0, W * 0.6, glowY, Math.max(W, H) * 0.7);
    hg.addColorStop(0, `rgba(${COBALT}, ${0.16 * breathe})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    layers.forEach((layer) => {
      const scrollOffset = (sy * layer.scrollFactor) / W;
      layer.puffs.forEach((p) => {
        let nx = p.baseX + t * layer.drift + scrollOffset + mx * 0.02;
        nx = ((nx % 1.4) + 1.4) % 1.4 - 0.2;
        const px = nx * W;
        const py = p.y * H;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        grad.addColorStop(0, `rgba(${IVORY}, ${p.alpha})`);
        grad.addColorStop(1, `rgba(${IVORY}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.y += p.v;
      p.x += Math.sin(t * 1.1 + p.sway) * 0.25;
      if (p.y > H + 10) resetParticle(p, false);
      const flicker = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.4 + p.sway * 4));
      ctx.fillStyle = `rgba(${IVORY}, ${flicker})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    if (!running) return;
    if (window.scrollY < window.innerHeight) {
      t += 0.016;
      drawScene(window.scrollY);
      canvas.style.transform = `translateY(${window.scrollY * 0.55}px)`;
    }
    if (!reduced) requestAnimationFrame(frame);
  }

  if (reduced) {
    drawScene(window.scrollY);
  } else {
    requestAnimationFrame(frame);
  }
})();
