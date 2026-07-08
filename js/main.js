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

  /* ---------- Live clock (Projects — LWX section) — a physical dial ---------- */

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
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      secondHand.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
      minuteHand.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
      hourHand.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
      requestAnimationFrame(tickClock);
    };
    requestAnimationFrame(tickClock);
  }

  /* ---------- Aeroplane flyover: once per page load, every page ---------- */

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const plane = document.createElement('div');
    plane.className = 'plane-flyover';
    plane.setAttribute('aria-hidden', 'true');
    plane.innerHTML =
      '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">' +
      '<path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
    document.body.appendChild(plane);

    if (window.gsap) {
      gsap.set(plane, { left: '-10%', opacity: 0 });
      gsap.timeline({ delay: 0.8, onComplete: () => plane.remove() })
        .to(plane, { opacity: 0.85, duration: 0.5 }, 0)
        .to(plane, { left: '110%', duration: 4.6, ease: 'none' }, 0)
        .to(plane, { y: '+=14', duration: 2.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
        .to(plane, { opacity: 0, duration: 0.6 }, '-=0.6');
    } else {
      plane.remove();
    }
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
