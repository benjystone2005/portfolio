/* Benjy Stone — ambient 2D scene for interior page heroes
   Same alpine blue-hour language as the home hero, scaled down: an
   evening-sky gradient, a light staggered starfield, drifting mist
   layers, a soft cobalt horizon glow (light source only), and a thin
   ivory starlight field. No market/finance iconography. */

(function () {
  'use strict';

  const canvas = document.querySelector('.page-hero__scene');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;

  const IVORY = '237, 237, 243';
  const COBALT = '82, 102, 235';

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

  /* ---------- starfield: staggered reveal ---------- */

  function makeStars(n, sizeMin, sizeMax, revealSpan, targetMin, targetMax) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rand(),
        y: rand() * 0.6,
        size: sizeMin + rand() * (sizeMax - sizeMin),
        revealAt: rand() * revealSpan,
        target: targetMin + rand() * (targetMax - targetMin),
        phase: rand() * Math.PI * 2,
      });
    }
    return stars;
  }

  const starsFar = makeStars(mobile ? 30 : 80, 0.5, 1.4, 6, 0.25, 0.65);

  function drawStars(stars, t) {
    for (const s of stars) {
      const p = clamp01((t - s.revealAt) / 1.8);
      const eased = p * p * (3 - 2 * p);
      const twinkle = 0.85 + 0.15 * Math.sin(t * 1.3 + s.phase);
      const a = eased * s.target * twinkle;
      if (a <= 0.01) continue;
      ctx.fillStyle = `rgba(${IVORY}, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
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

  let tmx = 0, mx = 0;
  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
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

    ctx.clearRect(0, 0, W, H);

    // evening-sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c0c14');
    sky.addColorStop(0.5, '#171721');
    sky.addColorStop(0.82, '#1e1e2c');
    sky.addColorStop(1, '#272738');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawStars(starsFar, t);

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
