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
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

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
     screen. [data-reveal] hooks the home page's ruled-in effects, and
     .contact the closing panel's; these play even when on screen at load. */

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
    document.querySelectorAll('[data-reveal], .contact').forEach((el) => observer.observe(el));
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
     Armed by the <head> script (.intro-on). Plays on a clock: the LWX quote
     draws itself, holds on the last print for a beat, then the camera flies
     into that dot. The dot is the hero seen through a clip-path circle, which
     grows until the screen is green and then settles into the hero panel.
     Scrolling, a key or a tap hurries it along; tabbing into the hero skips
     it. Afterwards the stage is removed and the page is the plain home page. */

  const root = document.documentElement;
  const intro = document.querySelector('[data-intro]');

  if (intro && root.classList.contains('intro-on')) {
    try {
      setupIntro();
    } catch (e) {
      root.classList.remove('intro-on', 'intro-playing');
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
    const valueEl = intro.querySelector('[data-intro-value]');
    const chgEl = intro.querySelector('[data-intro-chg]');

    const NS = 'http://www.w3.org/2000/svg';
    const AXIS_W = 76; // right-hand price axis
    const X_H = 30; // month labels under the plot
    const R0 = 7; // dot radius at rest
    const ZOOM_END = 0.8; // share of the fly-in spent zooming; the rest settles the panel
    const CAM_MAX = 40; // how far the camera flies into the chart
    const DRAW_MS = 1500; // the line draws itself
    const HOLD_MS = 550; // a beat on the last print
    const FLY_MS = 1900; // into the dot and down onto the hero
    const HURRY = 4; // playback rate once the visitor scrolls, taps or presses a key
    const END = DRAW_MS + HOLD_MS + FLY_MS;

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
      const B = Math.max(T + 40, plotBox.offsetTop + plotBox.offsetHeight - parseFloat(pad.paddingBottom) - X_H);
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

    /* the fly-in, p from 0 to 1: camera, dot-as-portal, fades */
    let flyP = 0;
    let opened = false;
    const open = () => {
      opened = true;
      hero.classList.add('is-open');
      document.dispatchEvent(new Event('intro:open'));
    };
    const fly = (p) => {
      flyP = p;
      stage.classList.add('is-moving');
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
      dot.setAttribute('r', r + 2); // its halo must sit just outside the portal's edge

      hero.style.clipPath =
        u >= 1 ? 'none' : `circle(${r.toFixed(1)}px at ${(sx - g.hx).toFixed(1)}px ${(sy - g.hy).toFixed(1)}px)`;

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
      if (!opened && reveal > 0.3) open();

      stage.style.setProperty('--fade', clamp(1 - u / 0.18, 0, 1).toFixed(3));
    };

    const relayout = () => {
      layout();
      setPen(drawing ? penT : last.t);
      if (flyP > 0) fly(flyP);
    };

    /* the clock: draw, hold, fly. Input speeds it up rather than cutting it */
    let clock = 0;
    let rate = 1;
    let prev = null;
    let done = false;
    const hurry = () => {
      rate = HURRY;
    };
    const skip = () => {
      clock = END;
      if (prev === null) finish(); // before the clock has started
    };
    const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

    const finish = () => {
      if (done) return;
      done = true;
      if (!opened) open();
      inputs.forEach((type) => window.removeEventListener(type, hurry));
      window.removeEventListener('resize', relayout);
      hero.removeEventListener('focusin', skip);
      stage.remove();
      hero.style.clipPath = '';
      hero.style.removeProperty('--intro-o');
      root.classList.remove('intro-on', 'intro-playing');
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    };

    const tick = (now) => {
      if (done) return;
      try {
        // capped, so a stalled frame or a background tab doesn't skip the show
        if (prev !== null) clock += Math.min(now - prev, 64) * rate;
        prev = now;
        if (clock < DRAW_MS) {
          setPen(first.t + easeInOutSine(clock / DRAW_MS) * (last.t - first.t));
        } else {
          if (drawing) finishDraw();
          const p = clamp((clock - DRAW_MS - HOLD_MS) / FLY_MS, 0, 1);
          if (p > 0) fly(p);
          if (p >= 1) {
            finish();
            return;
          }
        }
        requestAnimationFrame(tick);
      } catch (e) {
        finish();
      }
    };

    layout();
    setPen(first.t);
    root.classList.add('intro-ready', 'intro-playing');
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = '';

    inputs.forEach((type) => window.addEventListener(type, hurry, { passive: true }));
    // tabbing into the hero skips straight to it, so focus is never hidden
    hero.addEventListener('focusin', skip);
    window.addEventListener('resize', relayout, { passive: true });

    // let the fonts settle so the stage doesn't reflow mid-draw, but don't
    // hold the show for a slow font; re-measure if one lands later
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 1200))]).then(() => {
      if (done) return;
      relayout();
      requestAnimationFrame(tick);
    });
    fonts.then(() => {
      if (!done) relayout();
    });
  }

  /* ---------- Pixel name (home hero) ----------
     The name is redrawn as a grid of pixels on a canvas laid over the
     heading. The heading keeps its text, transparent, for screen readers,
     search and copying. Each letter is rastered where the browser set it,
     so the pixels follow the real type. The pixels gather into the name
     left to right once the hero is on screen (after the chart intro, if it
     plays), shy away from the pointer and spring back, and drift apart as
     the hero scrolls away. Static pixels under reduced motion; the plain
     heading if anything fails. Armed early by the <head> script (.pixel-on). */

  const pixelEl = document.querySelector('[data-pixel-name]');
  if (pixelEl) {
    try {
      pixelName(pixelEl);
    } catch (e) {
      root.classList.remove('pixel-on');
    }
  }

  function pixelName(h1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || !document.createRange) throw new Error('pixel name: no canvas');

    const hero = h1.closest('[data-hero]') || h1;
    const PAD = 72; // canvas bleed around the heading: room for the pixels to move
    const DUR = 900; // each pixel's flight into place
    const SWEEP = 520; // the left-to-right stagger across the name
    const JITTER = 140; // and a little disorder within it
    const K = 15 * 15; // pointer spring stiffness (omega squared)...
    const C = 2 * 0.55 * 15; // ...and damping: just under-damped, so they settle with a small wobble

    let pixels = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let dot = 3; // drawn size of a pixel; the grid pitch less a hairline gap
    let reach = 0; // pointer radius
    let push = 0; // how far the pixels right under the pointer move
    let drift = 0; // how far they wander once the hero has scrolled away
    let hover = 0; // how far they bob near the pointer
    let ink = '#fff';
    let pointer = null;
    let scatter = 0;
    let phase = 'wait'; // wait -> enter -> live
    let enterAt = 0;
    let running = false;
    let prev = 0;
    let built = false;
    let fallback = false; // drawn before the real face arrived

    canvas.className = 'pixel-name';
    canvas.setAttribute('aria-hidden', 'true');
    h1.appendChild(canvas);
    root.classList.add('pixel-on', 'pixel-ready');

    const build = () => {
      const w = h1.offsetWidth;
      const h = h1.offsetHeight;
      if (!w || !h) return;
      const box = h1.getBoundingClientRect();
      const s = box.width / w || 1; // the hero may be scaled mid-scroll
      const cs = getComputedStyle(h1);
      const fs = parseFloat(cs.fontSize);
      fallback = !!document.fonts && !document.fonts.check(`400 ${fs}px "EB Garamond"`);
      const cell = Math.max(3, Math.round(fs / 18));
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      dot = cell - Math.max(1 / dpr, cell * 0.16);
      reach = fs * 1.2;
      push = fs * 0.12;
      drift = fs * 0.8;
      hover = fs * 0.03;
      W = w + PAD * 2;
      H = h + PAD * 2;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.cssText = `left:${-PAD}px;top:${-PAD}px;width:${W}px;height:${H}px`;

      // the hero's text colour; fall back if this canvas can't parse it
      ctx.fillStyle = '#010203';
      ctx.fillStyle = getComputedStyle(hero).color;
      ink = ctx.fillStyle === '#010203' ? '#f4f8f3' : ctx.fillStyle;

      // raster the letters, supersampled so each cell's coverage is measured
      const SS = 2;
      const off = document.createElement('canvas');
      off.width = Math.ceil(W * SS);
      off.height = Math.ceil(H * SS);
      const o = off.getContext('2d', { willReadFrequently: true });
      o.scale(SS, SS);
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      o.textBaseline = 'alphabetic';
      // a hairline stroke thickens Garamond's thin strokes to a pixel or more
      o.lineWidth = fs * 0.024;
      o.lineJoin = 'round';
      const m = o.measureText('Bj');
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      const base = asc && desc ? asc / (asc + desc) : 0.8; // baseline, as a share of a letter's box
      const range = document.createRange();
      h1.querySelectorAll('.row > span').forEach((span) => {
        const text = span.firstChild;
        if (!text || text.nodeType !== 3) return;
        for (let i = 0; i < text.length; i++) {
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          const r = range.getBoundingClientRect();
          const gx = (r.left - box.left) / s + PAD;
          const gy = (r.top - box.top + r.height * base) / s + PAD;
          o.fillText(text.data[i], gx, gy);
          o.strokeText(text.data[i], gx, gy);
        }
      });

      const data = o.getImageData(0, 0, off.width, off.height).data;
      const step = cell * SS;
      const cols = Math.floor(off.width / step);
      const rows = Math.floor(off.height / step);
      const on = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let y = r * step; y < (r + 1) * step; y++) {
            let i = (y * off.width + c * step) * 4 + 3;
            for (let x = 0; x < step; x++, i += 4) sum += data[i];
          }
          on[r * cols + c] = sum >= step * step * 255 * 0.42 ? 1 : 0;
        }
      }
      // a lone pixel is a quantised serif tip; at this size it reads as dust
      const lone = (r, c) => {
        for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++) {
          for (let x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) {
            if ((y !== r || x !== c) && on[y * cols + x]) return false;
          }
        }
        return true;
      };

      const next = [];
      let minX = Infinity;
      let maxX = -Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!on[r * cols + c] || lone(r, c)) continue;
          const a = Math.random() * Math.PI * 2;
          const far = fs * (0.25 + Math.random() * 0.75);
          const tilt = (Math.random() - 0.5) * 0.6; // so a push isn't perfectly radial
          const cx = c * cell + cell / 2;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          next.push({
            x: cx - dot / 2, // resting top-left
            y: r * cell + cell / 2 - dot / 2,
            cx,
            cy: r * cell + cell / 2,
            ox: 0, // spring offset from rest, and its velocity
            oy: 0,
            vx: 0,
            vy: 0,
            f: 0.75 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2, // for the float near the pointer
            tc: Math.cos(tilt),
            ts: Math.sin(tilt),
            ex: Math.cos(a) * far, // where it flies in from
            ey: Math.sin(a) * far,
            sx: Math.random() * 2 - 1, // where it drifts off to
            sy: Math.random() * 2 - 1.4,
            delay: 0,
          });
        }
      }
      const extent = maxX - minX || 1;
      next.forEach((p) => {
        p.delay = ((p.cx - minX) / extent) * SWEEP + Math.random() * JITTER;
      });
      pixels = next;
      built = true;
    };

    const draw = (now) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (phase === 'wait') return;
      ctx.fillStyle = ink;
      const t = now - enterAt;
      const wander = scatter * scatter * drift;
      const push2 = push * push;
      let alpha = 1;
      ctx.globalAlpha = 1;
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        let x = p.x + p.ox + p.sx * wander;
        let y = p.y + p.oy + p.sy * wander;
        let size = dot;
        let a = 1;
        if (phase === 'enter') {
          const e = clamp((t - p.delay) / DUR, 0, 1);
          if (e <= 0) continue;
          const q = easeOutExpo(e);
          x += p.ex * (1 - q);
          y += p.ey * (1 - q);
          size *= 0.6 + 0.4 * q;
          a = Math.min(1, e * 3);
        }
        // pixels the pointer has pushed lift a little off the page
        size *= 1 + 0.35 * Math.min(1, (p.ox * p.ox + p.oy * p.oy) / push2);
        if (a !== alpha) ctx.globalAlpha = alpha = a;
        const d = Math.max(1, Math.round(size * dpr));
        ctx.fillRect(Math.round((x + (dot - size) / 2) * dpr), Math.round((y + (dot - size) / 2) * dpr), d, d);
      }
    };

    const tick = (now) => {
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      if (phase === 'enter' && now - enterAt > SWEEP + JITTER + DUR) phase = 'live';
      let busy = phase === 'enter';
      const r2 = reach * reach;
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        let tx = 0;
        let ty = 0;
        if (pointer) {
          const dx = p.cx - pointer.x;
          const dy = p.cy - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1;
            const k = 1 - d / reach;
            const f = (push * k * k * p.f) / d;
            // pushed aside, and hovering: a small bob while the pointer is near
            tx = (dx * p.tc - dy * p.ts) * f + Math.sin(now * 0.004 + p.phase) * k * hover;
            ty = (dx * p.ts + dy * p.tc) * f + Math.cos(now * 0.0033 + p.phase * 1.3) * k * hover;
            busy = true;
          }
        }
        p.vx += (K * (tx - p.ox) - C * p.vx) * dt;
        p.vy += (K * (ty - p.oy) - C * p.vy) * dt;
        p.ox += p.vx * dt;
        p.oy += p.vy * dt;
        if (Math.abs(p.vx) + Math.abs(p.vy) > 1 || Math.abs(tx - p.ox) + Math.abs(ty - p.oy) > 0.1) {
          busy = true;
        } else {
          p.ox = tx;
          p.oy = ty;
          p.vx = 0;
          p.vy = 0;
        }
      }
      draw(now);
      if (busy) requestAnimationFrame(tick);
      else running = false;
    };

    const wake = () => {
      if (running || reduced) return;
      running = true;
      prev = performance.now();
      requestAnimationFrame(tick);
    };

    const rebuild = () => {
      build();
      if (reduced) draw(0);
      else wake();
    };

    const start = () => {
      try {
        build();
        if (!built) throw new Error('pixel name: nothing to draw');
      } catch (e) {
        canvas.remove();
        root.classList.remove('pixel-on');
        return;
      }
      if (reduced) {
        phase = 'live';
        draw(0);
        return;
      }
      scatter = clamp(window.scrollY / (hero.offsetHeight || 1), 0, 1); // a reload may land mid-page
      const go = () => {
        phase = 'enter';
        enterAt = performance.now();
        wake();
      };
      // on the home page, wait until the chart intro has opened onto the hero
      if (root.classList.contains('intro-on') && !hero.classList.contains('is-open')) {
        document.addEventListener('intro:open', go, { once: true });
      } else {
        go();
      }
    };

    if (!reduced) {
      const aim = (e) => {
        const r = canvas.getBoundingClientRect();
        const s = r.width / W || 1;
        pointer = { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
        wake();
      };
      const release = () => {
        pointer = null;
        wake();
      };
      hero.addEventListener('pointermove', aim, { passive: true });
      hero.addEventListener('pointerdown', aim, { passive: true });
      hero.addEventListener('pointerleave', release);
      ['pointerup', 'pointercancel'].forEach((type) =>
        hero.addEventListener(type, (e) => {
          if (e.pointerType !== 'mouse') release(); // a finger doesn't hover
        })
      );
      window.addEventListener(
        'scroll',
        () => {
          const s = clamp(window.scrollY / (hero.offsetHeight || 1), 0, 1);
          if (Math.abs(s - scatter) > 0.0005) {
            scatter = s;
            wake();
          }
        },
        { passive: true }
      );
    }

    if ('ResizeObserver' in window) {
      let queued = false;
      new ResizeObserver(() => {
        if (!built || queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          rebuild();
        });
      }).observe(h1);
    } else {
      window.addEventListener('resize', () => built && rebuild(), { passive: true });
    }

    // draw with the real face: wait for it, but not for long; redraw if it lands late
    const fs = parseFloat(getComputedStyle(h1).fontSize);
    const face = document.fonts && document.fonts.load ? document.fonts.load(`400 ${fs}px "EB Garamond"`) : Promise.resolve();
    Promise.race([face, new Promise((resolve) => setTimeout(resolve, 1500))]).then(start, start);
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (built && fallback) rebuild();
      });
    }
  }

  /* ---------- Scroll-linked: reading line, hero recede, memo parallax,
     contact arrival, ball roll, tape speed ---------- */

  // a hairline under the nav that fills as you read down the page
  const progress = document.createElement('span');
  progress.className = 'site-nav__progress';
  progress.setAttribute('aria-hidden', 'true');
  nav.appendChild(progress);
  const setProgress = (y, maxY) => {
    progress.style.transform = `scaleX(${maxY > 0 ? clamp(y / maxY, 0, 1).toFixed(4) : 0})`;
  };

  if (motion) {
    const hero = document.querySelector('[data-hero]');
    const parallax = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    const contacts = Array.prototype.slice.call(document.querySelectorAll('.contact'));
    const ball = document.querySelector('.cricket-ball');
    const track = document.querySelector('.tape__track');
    const tapeAnim = track && track.getAnimations ? track.getAnimations()[0] : null;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let rate = 1;
    let ticking = false;
    let decaying = false;
    let ballAngle = null;
    let rolling = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const now = performance.now();
      const vh = window.innerHeight;
      const maxY = root.scrollHeight - vh;

      // measure everything first, then write, so the page is laid out once
      const heroH = hero ? hero.offsetHeight : 0;
      const parRects = parallax.map((node) => node.getBoundingClientRect());
      // the closing panel grows into place, a mirror of the hero receding:
      // from its top meeting the bottom of the screen until it's well in (or
      // the page runs out)
      const arrivals = contacts.map((node) => {
        const start = node.getBoundingClientRect().top + y - vh;
        const end = Math.min(start + vh * 0.55, maxY);
        const p = end - start < 1 ? 1 : clamp((y - start) / (end - start), 0, 1);
        return 1 - (1 - p) * (1 - p);
      });

      nav.classList.toggle('scrolled', y > 8);
      setProgress(y, maxY);

      if (hero) {
        hero.style.setProperty('--hero-p', clamp(y / heroH, 0, 1).toFixed(4));
      }

      parallax.forEach((node, i) => {
        const r = parRects[i];
        if (r.bottom < -100 || r.top > vh + 100) return;
        const off = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        node.style.setProperty('--par', (-clamp(off, -1, 1) * 28).toFixed(2));
      });

      contacts.forEach((node, i) => node.style.setProperty('--arrive', arrivals[i].toFixed(4)));

      if (ball && !rolling) {
        rolling = true;
        requestAnimationFrame(roll);
      }

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

    // the cricket ball's seam rolls with the page and coasts to a stop after it
    const roll = () => {
      const target = -24 + window.scrollY * 0.35;
      if (ballAngle === null) ballAngle = target;
      ballAngle += (target - ballAngle) * 0.1;
      if (Math.abs(target - ballAngle) < 0.05) {
        ballAngle = target;
        rolling = false;
      } else {
        requestAnimationFrame(roll);
      }
      ball.style.setProperty('--roll', ballAngle.toFixed(2) + 'deg');
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
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
      setProgress(window.scrollY, root.scrollHeight - window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
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
