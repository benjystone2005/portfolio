/* Benjy Stone — hero 2D canvas fallback: assembly / hold / explode
   Simplified, screen-space version of the WebGL particle sequence for
   browsers without WebGL: a few hundred small triangles drift in from a
   scattered field, assemble into a globe (traced as meridian/parallel
   lines, flattened into 2D), hold, then burst outward with real
   per-particle velocity and drag before settling into the ambient drift —
   then gather again. Green, amber, dark blue particles. Particle count kept
   low deliberately; this path exists for weak or incompatible browsers.
   Vanilla canvas, no libraries. */

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
  const GREEN = '52, 211, 153';
  const AMBER = '251, 146, 60';
  const DARKBLUE = '30, 64, 175';

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

  const starsFar = makeStars(mobile ? 40 : 90, 0.6, 1.6, 7, 0.25, 0.55);
  const starsHero = makeStars(mobile ? 1 : 3, 2, 3, 6.5, 0.7, 0.9);

  /* ---------- the signature moment: particles assemble into a globe ---------- */

  const SHAPE_CENTER = { x: 0.6, y: 0.5 };
  const N = mobile ? 150 : 360;

  // Flat approximation of a wireframe globe: particles trace a handful of
  // vertical "meridian" ellipses (width varies by longitude, so ones facing
  // the viewer are wide and ones near the edge are thin) and horizontal
  // "parallel" ellipses (flattened, to suggest curvature) instead of
  // filling a disc — that reads as "globe," not just "circle."
  function sampleGlobe() {
    const R = 0.15;
    const MERIDIANS = 14;
    const PARALLELS = 9;
    let x, y;
    if (rand() < 0.55) {
      const idx = Math.floor(rand() * MERIDIANS);
      const w = Math.abs(Math.cos((idx / MERIDIANS) * Math.PI));
      const a = rand() * Math.PI * 2;
      x = R * w * Math.sin(a);
      y = R * Math.cos(a);
    } else {
      const band = Math.floor(rand() * PARALLELS) + 1;
      const lat = (band / (PARALLELS + 1) - 0.5) * Math.PI;
      const cy = R * Math.sin(lat);
      const rx = R * Math.cos(lat);
      const a = rand() * Math.PI * 2;
      x = rx * Math.cos(a);
      y = cy + rx * Math.sin(a) * 0.3;
    }
    return { x: x, y: y };
  }

  const particles = [];
  for (let i = 0; i < N; i++) {
    const roll = rand();
    const hot = roll > 0.88;
    const color = roll > 0.68 ? DARKBLUE : roll > 0.32 ? AMBER : GREEN;
    const shape = sampleGlobe();
    particles.push({
      x: rand() * 1.4 - 0.2, y: rand() * 1.1 - 0.05,
      cx: 0, cy: 0,
      tx: SHAPE_CENTER.x + shape.x, ty: SHAPE_CENTER.y + shape.y,
      vx: 0, vy: 0,
      color: color, hot: hot,
      size: hot ? 1.9 + rand() * 0.8 : 1.0 + rand() * 0.9,
      spin: rand() * Math.PI * 2, spinVel: (rand() - 0.5) * (hot ? 2.4 : 1),
      phaseOffset: (rand() - 0.5) * 0.7,
      burstInit: false, burstCycle: -1,
    });
    particles[i].cx = particles[i].x; particles[i].cy = particles[i].y;
  }

  const CYCLE = 13.5, ASSEMBLE_END = 4.2, HOLD_END = 6.6, EXPLODE_END = 7.6;
  let cycleStart = 0;

  function drawParticleField(t) {
    let ct = t - cycleStart;
    if (ct > CYCLE) {
      cycleStart = t - (ct % CYCLE);
      ct = t - cycleStart;
      for (const p of particles) { p.cx = p.x; p.cy = p.y; }
    }

    for (const p of particles) {
      const localT = ct + p.phaseOffset;

      if (localT < ASSEMBLE_END) {
        const prog = easeOutCubic(clamp01(localT / ASSEMBLE_END));
        p.x = p.cx + (p.tx - p.cx) * prog;
        p.y = p.cy + (p.ty - p.cy) * prog;
        p.vx = 0; p.vy = 0;
      } else if (localT < HOLD_END) {
        p.x = p.tx + Math.cos(t * 1.7 + p.spin) * 0.0015;
        p.y = p.ty + Math.sin(t * 2.2 + p.spin) * 0.002;
      } else if (localT < EXPLODE_END) {
        if (!p.burstInit || p.burstCycle !== cycleStart) {
          const dx = p.tx - SHAPE_CENTER.x, dy = p.ty - SHAPE_CENTER.y;
          const dl = Math.hypot(dx, dy) || 1;
          const speed = (p.hot ? 0.34 : 0.2) + rand() * (p.hot ? 0.22 : 0.14);
          p.vx = (dx / dl) * speed + (rand() - 0.5) * 0.08;
          p.vy = (dy / dl) * speed + (rand() - 0.5) * 0.08;
          p.burstInit = true; p.burstCycle = cycleStart;
        }
        p.x += p.vx * 0.016; p.y += p.vy * 0.016;
        p.vx *= 0.965; p.vy *= 0.965;
      } else {
        p.x += p.vx * 0.016; p.y += p.vy * 0.016;
        p.vx *= 0.983; p.vy *= 0.983; p.vy += 0.0006;
        p.burstInit = false;
      }
      p.spin += p.spinVel * 0.016;

      const px = p.x * W, py = p.y * H;
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = clamp01(speed / 0.5);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.spin);
      const alpha = p.hot ? 0.95 : 0.7;
      ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
      const s = p.size * (1 + stretch * 1.4);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.8, s * 0.6);
      ctx.lineTo(s * 0.8, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

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

    // black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // stars gradually populate the sky, staggered
    drawStars(starsFar, t);
    drawStars(starsHero, t);

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

    // the signature moment: particles assemble, hold, explode, drift as ambient field
    ctx.globalCompositeOperation = 'lighter';
    drawParticleField(t);
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
    t = ASSEMBLE_END + 1; // settled: shape formed and held, no burst cycling
    drawScene(window.scrollY);
  } else {
    requestAnimationFrame(frame);
  }
})();
