/* Benjamin Stone portfolio — shared interactions. No dependencies. */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const motion = hasIO && !reduced;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- Nav: scrolled state + mobile toggle ---------- */

  const nav = document.querySelector('.site-nav');
  const navRight = document.querySelector('.site-nav__right');
  const navToggle = document.querySelector('.nav-toggle');

  if (navToggle) {
    const setOpen = (open) => {
      navRight.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.textContent = open ? 'Close' : 'Menu';
    };
    navToggle.addEventListener('click', () => {
      setOpen(!navRight.classList.contains('open'));
    });
    navRight.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navRight.classList.contains('open')) {
        setOpen(false);
        navToggle.focus();
      }
    });
  }

  /* ---------- Scroll reveals ----------
     Content is visible by default; hidden states only apply under .js-reveal.
     .reveal fades up (interior pages) and is shown at once if already on
     screen. [data-reveal] hooks the home page's ruled-in effects, which play
     even when on screen at load. */

  if (motion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('in-view');
      } else {
        observer.observe(el);
      }
    });
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    document.documentElement.classList.add('js-reveal');
  }

  /* ---------- Count-up stats (final values are already in the HTML) ---------- */

  const formatNum = (v, decimals) =>
    v.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const ruleTotal = (el) => {
    const total = el.closest('[data-total]');
    if (total) total.classList.add('is-ruled');
  };

  if (motion) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countObserver.unobserve(entry.target);
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const duration = 1400;
          const start = performance.now();

          const frame = (now) => {
            const p = Math.min((now - start) / duration, 1);
            el.textContent = formatNum(target * easeOutQuart(p), decimals);
            if (p < 1) requestAnimationFrame(frame);
            else ruleTotal(el);
          };
          requestAnimationFrame(frame);
        });
      },
      { threshold: 0.6 }
    );

    document
      .querySelectorAll('[data-count]:not([data-count-manual])')
      .forEach((el) => countObserver.observe(el));
  }

  /* ---------- LWX chart (home) ----------
     Built from data-series so updating the index is a one-line edit. On
     scroll-in the line is plotted left to right; the headline figure reads
     the index at the pen's position, dip included, and lands on the total. */

  const chartFig = document.querySelector('[data-chart]');
  if (chartFig) buildChart(chartFig);

  function buildChart(fig) {
    let series;
    try {
      series = JSON.parse(fig.dataset.series).map(([d, v]) => ({
        t: Date.parse(d + 'T12:00:00Z'),
        v,
      }));
    } catch (e) {
      return;
    }
    if (series.length < 2) return;

    const NS = 'http://www.w3.org/2000/svg';
    const W = 1000;
    const H = 400;
    const t0 = series[0].t;
    const t1 = series[series.length - 1].t;
    const values = series.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 0.1;
    const lo = min - spread * 0.14;
    const hi = max + spread * 0.22;
    const xOf = (t) => ((t - t0) / (t1 - t0)) * W;
    const yOf = (v) => ((hi - v) / (hi - lo)) * H;
    const pts = series.map((p) => ({ ...p, x: xOf(p.t), y: yOf(p.v) }));
    const first = pts[0];
    const last = pts[pts.length - 1];

    const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const pct = (v) => {
      const n = (v - 1) * 100;
      return (n < 0 ? '−' : '+') + Math.abs(n).toFixed(2) + '%';
    };
    const lowPt = pts.reduce((a, b) => (b.v < a.v ? b : a));

    const el = (tag, attrs, parent) => {
      const node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(node);
      return node;
    };

    const plot = document.createElement('div');
    plot.className = 'chart__plot';
    plot.tabIndex = 0;
    plot.setAttribute('role', 'img');
    plot.setAttribute(
      'aria-label',
      `Line chart of the index: ${first.v.toFixed(4)} on ${dateFmt.format(first.t)}, ` +
        `low of ${lowPt.v.toFixed(4)} on ${dateFmt.format(lowPt.t)}, ` +
        `${last.v.toFixed(4)} on ${dateFmt.format(last.t)}. Use arrow keys to step through observations.`
    );

    // grid layer (static)
    const grid = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'chart__grid', 'aria-hidden': 'true' });
    const step = 0.05;
    for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
      const gv = Math.round(g * 100) / 100;
      const y = yOf(gv);
      const isBase = Math.abs(gv - 1) < 1e-9;
      el('line', { x1: 0, x2: W, y1: y, y2: y, class: isBase ? 'chart__base' : '' }, grid);
      const label = document.createElement('span');
      label.className = 'chart__ylabel';
      label.style.top = (y / H) * 100 + '%';
      label.textContent = gv.toFixed(2);
      plot.appendChild(label);
    }
    const guide = el('line', { x1: 0, x2: 0, y1: 0, y2: H, class: 'chart__guide' }, grid);

    // data layer (wiped in)
    const data = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'chart__data', 'aria-hidden': 'true' });
    const defs = el('defs', {}, data);
    const grad = el('linearGradient', { id: 'lwx-fill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': 'oklch(0.36 0.07 168)', 'stop-opacity': '0.22' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'oklch(0.36 0.07 168)', 'stop-opacity': '0' }, grad);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    el('path', { d: `${line} L${W} ${H} L0 ${H} Z`, class: 'chart__area' }, data);
    el('path', { d: line, class: 'chart__line' }, data);

    const dot = document.createElement('span');
    dot.className = 'chart__dot';
    const endLabel = document.createElement('span');
    endLabel.className = 'chart__end';
    endLabel.textContent = last.v.toFixed(4);
    const cursor = document.createElement('span');
    cursor.className = 'chart__cursor';
    const tip = document.createElement('span');
    tip.className = 'chart__tip';
    tip.setAttribute('aria-live', 'polite');

    const place = (node, x, y) => {
      node.style.left = (x / W) * 100 + '%';
      node.style.top = (y / H) * 100 + '%';
    };
    place(dot, last.x, last.y);
    place(endLabel, last.x, last.y);

    plot.prepend(grid);
    plot.append(data, dot, endLabel, cursor, tip);

    const x = document.createElement('div');
    x.className = 'chart__x';
    x.setAttribute('aria-hidden', 'true');
    x.innerHTML = `<span>${monthFmt.format(first.t)}</span><span>${monthFmt.format(last.t)}</span>`;

    const fallback = fig.querySelector('[data-chart-fallback]');
    fallback.replaceWith(plot);
    plot.after(x);
    const range = fig.querySelector('[data-chart-range]');
    if (range) range.textContent = `${dateFmt.format(first.t)} – ${dateFmt.format(last.t)}`;

    /* hover + keyboard read-out */
    let active = pts.length - 1;
    const show = (i) => {
      active = i;
      const p = pts[i];
      guide.setAttribute('x1', p.x);
      guide.setAttribute('x2', p.x);
      place(cursor, p.x, p.y);
      tip.textContent = `${dateFmt.format(p.t)} · ${p.v.toFixed(4)} (${pct(p.v)})`;
      const w = plot.clientWidth;
      const half = tip.offsetWidth / 2;
      const px = clamp((p.x / W) * w, half, w - half);
      tip.style.left = px + 'px';
      tip.style.top = (p.y / H) * 100 + '%';
      plot.classList.add('is-hover');
    };
    const hide = () => plot.classList.remove('is-hover');
    const nearest = (clientX) => {
      const r = plot.getBoundingClientRect();
      const fx = ((clientX - r.left) / r.width) * W;
      let best = 0;
      pts.forEach((p, i) => {
        if (Math.abs(p.x - fx) < Math.abs(pts[best].x - fx)) best = i;
      });
      return best;
    };
    plot.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
    plot.addEventListener('pointerleave', hide);
    plot.addEventListener('focus', () => show(active));
    plot.addEventListener('blur', hide);
    plot.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        show(clamp(active + (e.key === 'ArrowRight' ? 1 : -1), 0, pts.length - 1));
      }
    });

    /* the draw */
    if (!motion) return;

    const feature = fig.closest('.feature') || fig;
    const countEl = feature.querySelector('[data-count-manual]');
    const signEl = feature.querySelector('[data-sign]');
    const valueAt = (t) => {
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i].t) {
          const a = pts[i - 1];
          const b = pts[i];
          const k = (t - a.t) / (b.t - a.t);
          return a.v + (b.v - a.v) * k;
        }
      }
      return last.v;
    };

    data.style.clipPath = 'inset(0 100% 0 0)';
    endLabel.style.opacity = '0';
    place(dot, first.x, first.y);

    const drawObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        drawObserver.disconnect();
        const duration = 2200;
        const start = performance.now();
        const frame = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const f = easeInOutSine(p);
          const t = first.t + f * (last.t - first.t);
          const v = valueAt(t);
          data.style.clipPath = `inset(0 ${(100 - f * 100).toFixed(2)}% 0 0)`;
          place(dot, xOf(t), yOf(v));
          if (countEl) {
            const n = (v - 1) * 100;
            countEl.textContent = formatNum(Math.abs(n), 2);
            if (signEl) signEl.textContent = n < 0 ? '−' : '+';
          }
          if (p < 1) {
            requestAnimationFrame(frame);
          } else {
            data.style.clipPath = '';
            place(dot, last.x, last.y);
            if (countEl) countEl.textContent = formatNum((last.v - 1) * 100, 2);
            if (signEl) signEl.textContent = last.v < 1 ? '−' : '+';
            endLabel.style.opacity = '';
            endLabel.animate(
              [
                { opacity: 0, transform: 'translate(-100%, calc(-100% - 6px))' },
                { opacity: 1, transform: 'translate(-100%, calc(-100% - 12px))' },
              ],
              { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
            dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
              duration: 420,
              easing: 'ease-out',
            });
            const ring = document.createElement('span');
            ring.className = 'chart__ping';
            dot.appendChild(ring);
            ring.animate(
              [
                { opacity: 0.6, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(2.8)' },
              ],
              { duration: 1400, iterations: 3, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            ).onfinish = () => ring.remove();
            if (countEl) ruleTotal(countEl);
          }
        };
        requestAnimationFrame(frame);
      },
      { threshold: 0.45 }
    );
    drawObserver.observe(plot);
  }

  /* ---------- Chart intro (home) ----------
     Armed by the <head> script (.intro-on). The LWX quote draws itself on
     load; scrolling the runway then flies the camera into the last print.
     That dot is the hero seen through a clip-path circle, which grows until
     the hero is fully open. Scroll-scrubbed, so it also plays in reverse. */

  const root = document.documentElement;
  const intro = document.querySelector('[data-intro]');
  let introEnd = 0; // scroll the intro consumes; the hero's own effects start after it

  if (intro && root.classList.contains('intro-on')) {
    try {
      setupIntro();
    } catch (e) {
      root.classList.remove('intro-on');
      introEnd = 0;
      const hero = intro.querySelector('[data-hero]');
      if (hero) hero.style.clipPath = '';
    }
  }

  function setupIntro() {
    const src = document.querySelector('[data-chart]');
    const series = JSON.parse(src.dataset.series).map(([d, v]) => ({
      t: Date.parse(d + 'T12:00:00Z'),
      v,
    }));
    if (series.length < 2) throw new Error('intro: no series');

    const hero = intro.querySelector('[data-hero]');
    const stage = intro.querySelector('.intro__stage');
    const plotBox = intro.querySelector('[data-intro-plot]');
    const runway = intro.querySelector('.intro__runway');
    const cue = intro.querySelector('[data-intro-enter]');
    const valueEl = intro.querySelector('[data-intro-value]');
    const chgEl = intro.querySelector('[data-intro-chg]');

    const NS = 'http://www.w3.org/2000/svg';
    const AXIS_W = 76; // right-hand price axis
    const X_H = 30; // month labels under the plot
    const R0 = 7; // dot radius at rest
    const ZOOM_END = 0.8; // share of the runway spent zooming; the rest settles the panel
    const CAM_MAX = 40; // how far the camera flies into the chart
    const DRAW_MS = 1900;

    const first = series[0];
    const last = series[series.length - 1];
    const values = series.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 0.1;
    const lo = min - spread * 0.14;
    const hi = max + spread * 0.22;
    const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

    const el = (tag, attrs, parent) => {
      const node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
      if (parent) parent.appendChild(node);
      return node;
    };
    const valueAt = (t) => {
      for (let i = 1; i < series.length; i++) {
        if (t <= series[i].t) {
          const a = series[i - 1];
          const b = series[i];
          return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
        }
      }
      return last.v;
    };

    /* scene: camera group (grid, area, line) under screen-space axes and dot */
    const svg = el('svg', { class: 'intro__svg', 'aria-hidden': 'true' });
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'intro-fill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': 'oklch(0.36 0.07 168)', 'stop-opacity': '0.2' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'oklch(0.36 0.07 168)', 'stop-opacity': '0' }, grad);
    const clip = el('clipPath', { id: 'intro-clip' }, defs);
    const clipRect = el('rect', { x: 0, y: -1e5, width: 0, height: 2e5 }, clip);

    const cam = el('g', {}, svg);
    const grid = el('g', { class: 'intro__grid' }, cam);
    const ink = el('g', { 'clip-path': 'url(#intro-clip)' }, cam);
    const area = el('path', { class: 'intro__area' }, ink);
    const line = el('path', { class: 'intro__line' }, ink);

    const axes = el('g', { class: 'intro__axes' }, svg);
    const yLabels = el('g', {}, axes);
    const xLabels = el('g', {}, axes);
    const lastLine = el('line', { class: 'intro__last' }, axes);
    const tag = el('g', { class: 'intro__tag' }, axes);
    el('rect', { x: 0, y: -11, width: 60, height: 22, rx: 11 }, tag);
    const tagText = el('text', { x: 30, y: 4, 'text-anchor': 'middle' }, tag);

    const ping = el('circle', { class: 'intro__ping', r: R0 }, svg);
    const dot = el('circle', { class: 'intro__dot', r: R0 }, svg);
    const frame = el('rect', { class: 'intro__frame' }, svg); // the full-screen green settling into the hero
    stage.prepend(svg);

    /* layout: everything in stage pixels, rebuilt on resize */
    let g; // geometry for the current size
    const layout = () => {
      root.style.setProperty('--nav-h', nav.offsetHeight + 'px');
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const pad = getComputedStyle(plotBox);
      const L = plotBox.offsetLeft + parseFloat(pad.paddingLeft);
      const R = plotBox.offsetLeft + plotBox.offsetWidth - parseFloat(pad.paddingRight) - AXIS_W;
      const T = plotBox.offsetTop + 12;
      const B = Math.max(T + 40, plotBox.offsetTop + plotBox.offsetHeight - X_H);
      const xOf = (t) => L + ((t - first.t) / (last.t - first.t)) * (R - L);
      const yOf = (v) => T + ((hi - v) / (hi - lo)) * (B - T);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      const pts = series.map((p) => [xOf(p.t).toFixed(1), yOf(p.v).toFixed(1)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
      line.setAttribute('d', d);
      area.setAttribute('d', `${d} L${R} ${B} L${L} ${B} Z`);

      grid.textContent = '';
      yLabels.textContent = '';
      for (let v = Math.ceil(lo / 0.05) * 0.05; v <= hi; v += 0.05) {
        const gv = Math.round(v * 100) / 100;
        const y = yOf(gv);
        el('line', { x1: L, x2: R, y1: y, y2: y, class: Math.abs(gv - 1) < 1e-9 ? 'is-base' : '' }, grid);
        const label = el('text', { x: R + 20, y: y + 4 }, yLabels);
        label.textContent = gv.toFixed(2);
        label.dataset.y = y;
      }

      xLabels.textContent = '';
      const start = new Date(first.t);
      let m = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
      let prevX = -Infinity;
      while (m <= last.t) {
        const x = xOf(m);
        if (x - prevX >= 64) {
          const month = new Date(m);
          el('text', { x, y: B + 22, 'text-anchor': 'middle' }, xLabels).textContent =
            monthFmt.format(month) + (month.getUTCMonth() === 0 ? ' ' + month.getUTCFullYear() : '');
          prevX = x;
        }
        m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1);
      }

      // the hero, in stage pixels: the dot flies to the middle of its visible
      // part and grows until the whole stage is green
      const hx = hero.offsetLeft;
      const hy = hero.offsetTop - stage.offsetTop;
      const hw = hero.offsetWidth;
      const hh = hero.offsetHeight;
      const cx = hx + hw / 2;
      const cy = hy + Math.min(hh, H - hy) / 2;
      g = {
        W, H, L, R, B, xOf, yOf, hx, hy, hw, hh, cx, cy,
        dot: { x: xOf(last.t), y: yOf(last.v) },
        rMax: Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 2,
        radius: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 0,
      };
      introEnd = runway.offsetHeight;
    };

    /* the pen: draws the line, moves the dot, prices the quote */
    let penT = first.t;
    let drawing = true;
    const pct = (v) => (v < 1 ? '▼ ' : '▲ ') + Math.abs((v - 1) * 100).toFixed(2) + '%';
    const setPen = (t) => {
      penT = t;
      const v = valueAt(t);
      const x = g.xOf(t);
      const y = g.yOf(v);
      clipRect.setAttribute('width', Math.max(0, x + 2));
      [dot, ping].forEach((c) => {
        c.setAttribute('cx', x);
        c.setAttribute('cy', y);
      });
      lastLine.setAttribute('x1', x);
      lastLine.setAttribute('x2', g.R + 14);
      lastLine.setAttribute('y1', y);
      lastLine.setAttribute('y2', y);
      tag.setAttribute('transform', `translate(${g.R + 14} ${y})`);
      Array.prototype.forEach.call(yLabels.children, (label) => {
        label.style.opacity = Math.abs(label.dataset.y - y) < 16 ? '0' : '';
      });
      tagText.textContent = v.toFixed(4);
      valueEl.textContent = v.toFixed(4);
      chgEl.textContent = pct(v);
    };
    const finishDraw = () => {
      drawing = false;
      setPen(last.t);
      ink.removeAttribute('clip-path');
      stage.classList.add('is-drawn');
    };

    /* scroll: camera, dot-as-portal, fades */
    let opened = false;
    const render = () => {
      const p = introEnd ? clamp(window.scrollY / introEnd, 0, 1) : 1;
      if (p > 0 && drawing) finishDraw();
      stage.classList.toggle('is-moving', p > 0);
      if (drawing) return;

      const u = clamp(p / ZOOM_END, 0, 1);
      const land = easeInOutCubic(clamp((p - ZOOM_END) / (1 - ZOOM_END), 0, 1));
      const pan = easeInOutCubic(clamp(u / 0.7, 0, 1));
      const sx = g.dot.x + (g.cx - g.dot.x) * pan;
      const sy = g.dot.y + (g.cy - g.dot.y) * pan;
      const k = Math.pow(CAM_MAX, Math.pow(u, 1.5));
      const r = R0 * Math.pow(g.rMax / R0, easeInOutSine(u));

      cam.setAttribute('transform', `translate(${sx - k * g.dot.x} ${sy - k * g.dot.y}) scale(${k})`);
      [dot, ping].forEach((c) => {
        c.setAttribute('cx', sx);
        c.setAttribute('cy', sy);
      });
      dot.setAttribute('r', p > 0 ? r + 2 : R0); // its halo must sit just outside the portal's edge

      if (u >= 1) hero.style.clipPath = 'none';
      else if (p > 0) hero.style.clipPath = `circle(${r.toFixed(1)}px at ${(sx - g.hx).toFixed(1)}px ${(sy - g.hy).toFixed(1)}px)`;
      else hero.style.clipPath = '';

      // landing: the screen-filling green shrinks into the hero's rounded panel
      const landing = u >= 1;
      stage.classList.toggle('is-landing', landing);
      if (landing) {
        frame.setAttribute('x', g.hx * land);
        frame.setAttribute('y', g.hy * land);
        frame.setAttribute('width', g.W + (g.hw - g.W) * land);
        frame.setAttribute('height', g.H + (g.hh - g.H) * land);
        frame.setAttribute('rx', g.radius * land);
      }

      const reveal = r / g.rMax;
      hero.style.setProperty('--intro-o', clamp((reveal - 0.12) / 0.3, 0, 1).toFixed(3));
      if (!opened && reveal > 0.3) {
        opened = true;
        hero.classList.add('is-open');
        document.dispatchEvent(new Event('intro:open'));
      }

      stage.style.setProperty('--fade', clamp(1 - u / 0.18, 0, 1).toFixed(3));
      stage.style.visibility = p >= 1 ? 'hidden' : '';
    };

    /* "Scroll to enter" plays the same scrub for you */
    let tween = 0;
    const scrollTo = (y) => {
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      root.style.scrollBehavior = '';
    };
    const playTo = (to, duration) => {
      const from = window.scrollY;
      const id = ++tween;
      const t0 = performance.now();
      const step = (now) => {
        if (id !== tween) return;
        const f = Math.min((now - t0) / duration, 1);
        scrollTo(from + (to - from) * easeInOutCubic(f));
        if (f < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const stop = () => tween++;
    ['wheel', 'touchstart', 'keydown'].forEach((type) =>
      window.addEventListener(type, stop, { passive: true })
    );
    cue.addEventListener('click', () => playTo(introEnd, 1600));

    // tabbing into the hero skips straight to it, so focus is never hidden
    hero.addEventListener('focusin', () => {
      if (window.scrollY < introEnd) {
        stop();
        scrollTo(introEnd);
      }
    });

    layout();
    root.classList.add('intro-ready');

    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener(
      'resize',
      () => {
        layout();
        if (drawing) setPen(penT);
        render();
      },
      { passive: true }
    );

    setPen(first.t);
    render();
    if (drawing) {
      let t0 = null;
      const draw = (now) => {
        if (!drawing) return;
        if (t0 === null) t0 = now;
        const f = easeInOutSine(Math.min((now - t0) / DRAW_MS, 1));
        if (f < 1) {
          setPen(first.t + f * (last.t - first.t));
          requestAnimationFrame(draw);
        } else {
          finishDraw();
          render();
        }
      };
      // let the fonts settle so the stage doesn't reflow mid-draw
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        layout();
        requestAnimationFrame(draw);
      });
    }
  }

  /* ---------- Scroll-linked: hero recede, memo parallax, tape speed ---------- */

  if (motion) {
    const hero = document.querySelector('[data-hero]');
    const parallax = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    const track = document.querySelector('.tape__track');
    const tapeAnim = track && track.getAnimations ? track.getAnimations()[0] : null;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let rate = 1;
    let ticking = false;
    let decaying = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const now = performance.now();
      const vh = window.innerHeight;

      nav.classList.toggle('scrolled', y > 8);

      if (hero) {
        const p = clamp((y - introEnd) / hero.offsetHeight, 0, 1);
        hero.style.setProperty('--hero-p', p.toFixed(4));
      }

      parallax.forEach((node) => {
        const r = node.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const off = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        node.style.setProperty('--par', (-clamp(off, -1, 1) * 28).toFixed(2));
      });

      // tape: scrolling nudges the crawl faster, then it eases back
      if (tapeAnim) {
        const v = Math.abs(y - lastY) / Math.max(now - lastT, 1); // px per ms
        rate = Math.max(rate, 1 + Math.min(v * 3, 5));
        tapeAnim.playbackRate = rate;
        if (!decaying) decay();
      }
      lastY = y;
      lastT = now;
    };

    const decay = () => {
      decaying = true;
      rate += (1 - rate) * 0.06;
      if (Math.abs(rate - 1) < 0.01) {
        rate = 1;
        decaying = false;
      } else {
        requestAnimationFrame(decay);
      }
      tapeAnim.playbackRate = rate;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', update, { passive: true });
    update();
  } else {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Live clock (Projects, LWX section) ---------- */

  const clock = document.querySelector('.analog-clock');
  if (clock) {
    const face = clock.querySelector('.analog-clock__face');
    for (let i = 0; i < 12; i++) {
      const tick = document.createElement('div');
      tick.className = 'analog-clock__tick';
      tick.style.transform = `rotate(${i * 30}deg)`;
      face.appendChild(tick);
    }

    const hourHand = clock.querySelector('[data-clock-hour]');
    const minuteHand = clock.querySelector('[data-clock-minute]');
    const secondHand = clock.querySelector('[data-clock-second]');

    const tickClock = () => {
      const now = new Date();
      const s = now.getSeconds() + (reduced ? 0 : now.getMilliseconds() / 1000);
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      secondHand.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
      minuteHand.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
      hourHand.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
    };
    tickClock();
    if (reduced) {
      setInterval(tickClock, 1000);
    } else {
      const loop = () => {
        tickClock();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ---------- Aeroplane flyover: once per visit, not once per page ---------- */

  let flown = false;
  try {
    flown = sessionStorage.getItem('plane-flown') === '1';
    sessionStorage.setItem('plane-flown', '1');
  } catch (e) {
    /* storage blocked: fly anyway */
  }

  const fly = () => {
    const plane = document.createElement('div');
    plane.className = 'plane-flyover';
    plane.setAttribute('aria-hidden', 'true');
    plane.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">' +
      '<path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
    document.body.appendChild(plane);

    const travel = window.innerWidth + 320;
    const flight = plane.animate(
      [
        { transform: 'translate(-160px, 0) rotate(-4deg)', opacity: 0 },
        { transform: `translate(${travel * 0.1 - 160}px, 6px) rotate(-4deg)`, opacity: 0.85, offset: 0.1 },
        { transform: `translate(${travel * 0.5 - 160}px, 14px) rotate(-4deg)`, opacity: 0.85, offset: 0.5 },
        { transform: `translate(${travel * 0.88 - 160}px, 4px) rotate(-4deg)`, opacity: 0.85, offset: 0.88 },
        { transform: `translate(${travel - 160}px, 0) rotate(-4deg)`, opacity: 0 },
      ],
      { duration: 4600, delay: 1200, easing: 'linear', fill: 'both' }
    );
    flight.onfinish = () => plane.remove();
  };

  if (!reduced && !flown && 'animate' in Element.prototype) {
    // on the home page, hold it until the chart intro has opened onto the hero
    const waiting = root.classList.contains('intro-on') && !document.querySelector('.hero.is-open');
    if (waiting) document.addEventListener('intro:open', fly, { once: true });
    else fly();
  }
})();
