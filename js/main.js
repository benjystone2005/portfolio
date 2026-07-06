/* Benjy Stone portfolio — shared interactions */

(function () {
  'use strict';

  /* ---------- Nav: scrolled state + mobile toggle ---------- */

  const nav = document.querySelector('.site-nav');
  const navRight = document.querySelector('.site-nav__right');
  const navToggle = document.querySelector('.nav-toggle');

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navRight.classList.toggle('open');
      navToggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  /* ---------- Scroll reveals ---------- */

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document
    .querySelectorAll('.reveal, .reveal-stagger, .reveal-line')
    .forEach((el) => observer.observe(el));

  /* ---------- Count-up stats ---------- */

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 1600;
        const start = performance.now();

        const frame = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const value = target * easeOut(p);
          el.textContent =
            prefix +
            value.toLocaleString('en-GB', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }) +
            suffix;
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-count]').forEach((el) => {
    countObserver.observe(el);
  });

  /* ---------- Live clock (Projects — LWX section) ---------- */

  const clock = document.querySelector('.clock-pill');
  if (clock) {
    const hEl = clock.querySelector('[data-clock-h]');
    const mEl = clock.querySelector('[data-clock-m]');
    const sEl = clock.querySelector('[data-clock-s]');
    const colons = clock.querySelectorAll('[data-clock-colon]');
    const pad = (n) => String(n).padStart(2, '0');

    const tickClock = () => {
      const now = new Date();
      hEl.textContent = pad(now.getHours());
      mEl.textContent = pad(now.getMinutes());
      sEl.textContent = pad(now.getSeconds());
    };
    tickClock();
    setInterval(tickClock, 1000);

    setInterval(() => {
      colons.forEach((c) => c.classList.toggle('is-dim'));
    }, 500);
  }

  /* ---------- Memo modal ---------- */

  const modal = document.getElementById('memo-modal');
  if (modal) {
    document.querySelectorAll('[data-open-memo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });
    const close = () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    };
    modal.querySelector('.modal__close').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }
})();
