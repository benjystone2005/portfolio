/* Benjy Stone — hero 2D canvas fallback: dusk settling into night
   Alpine blue-hour atmosphere without WebGL: an evening-sky gradient,
   a staggered starfield fading in gradually, layered mist/cloud blobs
   drifting independently with scroll parallax per depth, a soft
   cobalt-tinted horizon glow (light source only), and a drifting
   ivory snow/starlight field. Vanilla canvas, no libraries. */

(function () {
  'use strict';

  const canvas = document.getElementById('hero-scene');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero');
  const content = hero.querySelector('.hero__content');
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

  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* ---------- cloud layers: independent drift + scroll parallax ---------- */

  const LAYER_COUNT = mobile ? 3 : 5;
  const layers = [];
  for (let li = 0; li < LAYER_COUNT; li++) {
    const depthT = li / (LAYER_COUNT - 1);
    const count = mobile ? 3 : 4 + li;
    const puffs = [];
    for (let i = 0; i < count; i++) {
      puffs.push({
        baseX: rand() * 1.4 - 0.2,
        y: 0.15 + rand() * 0.55,
        r: (60 + rand() * 130) * (0.5 + depthT * 0.9),
        alpha: 0.06 + depthT * 0.16,
      });
    }
    layers.push({
      puffs: puffs,
      drift: (0.008 + rand() * 0.014) * (li % 2 ? 1 : -1),
      scrollFactor: 0.04 + depthT * 0.3,
      depthT: depthT,
    });
  }

  /* ---------- starfield: dusk-to-night staggered reveal ---------- */

  function makeStars(n, sizeMin, sizeMax, revealSpan, targetMin, targetMax) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rand(),
        y: rand() * 0.68,
        size: sizeMin + rand() * (sizeMax - sizeMin),
        revealAt: rand() * revealSpan,
        target: targetMin + rand() * (targetMax - targetMin),
        phase: rand() * Math.PI * 2,
        glow: sizeMax > 3.5, // the brighter "hero" stars get a soft halo
      });
    }
    return stars;
  }

  const starsFar = makeStars(mobile ? 60 : 150, 0.6, 1.6, 7, 0.3, 0.75);
  const starsHero = makeStars(mobile ? 2 : 6, 2, 3, 6.5, 0.8, 1);

  function drawStars(stars, t) {
    for (const s of stars) {
      const p = clamp01((t - s.revealAt) / 1.8);
      const eased = p * p * (3 - 2 * p);
      const twinkle = 0.85 + 0.15 * Math.sin(t * 1.3 + s.phase);
      const a = eased * s.target * twinkle;
      if (a <= 0.01) continue;
      const px = s.x * W;
      const py = s.y * H;
      if (s.glow) {
        const grad = ctx.createRadialGradient(px, py, 0, px, py, s.size * 6);
        grad.addColorStop(0, `rgba(${IVORY}, ${a})`);
        grad.addColorStop(1, `rgba(${IVORY}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, s.size * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${IVORY}, ${a})`;
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- snow/starlight particles ---------- */

  const PARTICLES = mobile ? 46 : 110;
  const particles = [];
  function resetParticle(p, initial) {
    p.x = rand() * W;
    p.y = initial ? rand() * H : -10;
    p.v = 0.25 + rand() * 0.6;
    p.size = 0.8 + rand() * 1.8;
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
    const intro = easeOutCubic(clamp01(t / 1.9));
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    ctx.clearRect(0, 0, W, H);

    // evening-sky gradient — dusk near the horizon, deep night at the top
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c0c14');
    sky.addColorStop(0.5, '#171721');
    sky.addColorStop(0.82, '#1e1e2c');
    sky.addColorStop(1, '#272738');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // stars gradually populate the sky, staggered
    drawStars(starsFar, t);
    drawStars(starsHero, t);

    // horizon glow — the sole cobalt note, purely atmospheric
    const glowY = H * 0.62;
    const breathe = 0.4 + Math.sin(t * 0.35) * 0.15;
    const hg = ctx.createRadialGradient(W * 0.62, glowY, 0, W * 0.62, glowY, Math.max(W, H) * 0.75);
    hg.addColorStop(0, `rgba(${COBALT}, ${0.22 * breathe})`);
    hg.addColorStop(0.5, `rgba(${COBALT}, ${0.08 * breathe})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    // cloud layers
    layers.forEach((layer) => {
      const scrollOffset = (sy * layer.scrollFactor) / W;
      layer.puffs.forEach((p) => {
        let nx = p.baseX + t * layer.drift + scrollOffset;
        nx = ((nx % 1.4) + 1.4) % 1.4 - 0.2;
        const px = nx * W;
        const py = p.y * H + (1 - intro) * 40;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        grad.addColorStop(0, `rgba(${IVORY}, ${p.alpha})`);
        grad.addColorStop(1, `rgba(${IVORY}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // drifting snow/starlight, additive
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.y += p.v;
      p.x += Math.sin(t * 1.1 + p.sway) * 0.3;
      if (p.y > H + 10) resetParticle(p, false);
      const flicker = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.6 + p.sway * 4));
      ctx.fillStyle = `rgba(${IVORY}, ${flicker})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    if (!running) return;
    const sy = window.scrollY;

    if (sy < window.innerHeight * 1.2) {
      t += 0.016;
      drawScene(sy);

      canvas.style.transform = `translateY(${sy * 0.28}px)`;
      if (content) {
        content.style.transform =
          `translate3d(${-mx * 14}px, ${sy * 0.12 - my * 8}px, 0)`;
        content.style.opacity = Math.max(0, 1 - sy / (window.innerHeight * 0.85));
      }
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
