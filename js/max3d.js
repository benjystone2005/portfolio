/* Benjy Stone — scroll choreography (GSAP + ScrollTrigger)
   Motion is weighted per section by what that content actually is, not
   applied uniformly. Facts you need to read fast (proof cards, stat
   cards, timeline bullets, body copy) get quick, minimal entrances —
   Emil/Jakub restraint, motion that conveys arrival and nothing more,
   no infinite idle loops on things you're supposed to be reading.
   Lower-stakes, decorative content (the skills/interests marquee, the
   cricket-ball reveal) gets more personality — Jhey territory. Section
   heads get a real but brief arrival moment in between. Headline type
   enters as solid, stable blocks — no per-letter splitting, no ongoing
   drift — and settles permanently once revealed.
   Degrades to the CSS reveal system if the CDN fails. */

(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return; // CDN fallback: CSS reveals
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gsap-on'); // disables the old CSS reveal system

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const K = mobile ? 0.55 : 1; // intensity scale for small screens

  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* ================= headline type: solid entrance, then dead still ================= */

  // HOME hero title: "Benjamin" / "Stone" rise in as two stable blocks,
  // staggered once, then never move again — no per-letter drift, ever.
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) {
    const rows = heroTitle.querySelectorAll('.row');
    gsap.from(rows, {
      y: 60,
      opacity: 0,
      rotationX: -20,
      transformOrigin: '50% 100%',
      transformPerspective: 900,
      stagger: 0.12,
      duration: 1.1,
      ease: 'power3.out',
      delay: 0.1,
    });
  }

  // interior page titles: same one-block treatment
  const pageTitle = document.querySelector('.page-hero__title');
  if (pageTitle) {
    gsap.from(pageTitle, {
      y: 50,
      opacity: 0,
      rotationX: -18,
      transformOrigin: '50% 100%',
      transformPerspective: 900,
      duration: 1.1,
      ease: 'power3.out',
    });
    // parallax: title climbs faster than the page — whole element, never its letters
    gsap.to(pageTitle, {
      y: -110 * K,
      ease: 'none',
      scrollTrigger: {
        trigger: '.page-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  /* ================= hero content: scroll fade + pointer swing ================= */

  const heroContent = document.querySelector('.hero__content');
  if (heroContent) {
    gsap.set(heroContent, { transformPerspective: 1200 });
    gsap.to(heroContent, {
      y: () => window.innerHeight * 0.3,
      rotationX: 15,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '75% top',
        scrub: true,
      },
    });
    if (!mobile) {
      const qRy = gsap.quickTo(heroContent, 'rotationY', { duration: 0.7, ease: 'power2.out' });
      const qX = gsap.quickTo(heroContent, 'x', { duration: 0.7, ease: 'power2.out' });
      window.addEventListener('pointermove', (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        qRy(nx * 7);
        qX(-nx * 30);
      }, { passive: true });
    }
  }

  /* ================= nav drops in ================= */

  gsap.from('.site-nav', { y: -70, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });

  /* ================= sections: camera swings through space ================= */

  $$('.section, .site-footer').forEach((sec) => {
    gsap.set(sec, { transformPerspective: 1400, transformOrigin: '50% 0%' });
    gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })
      .fromTo(sec, { rotationX: 9 * K, z: -90 * K }, { rotationX: 0, z: 0, ease: 'none' })
      .to(sec, { rotationX: -7 * K, z: -80 * K, ease: 'none' });
  });

  /* ================= cards: quick, minimal arrival — this is content, not spectacle ================= */

  $$('.card, .stat-card').forEach((el, i) => {
    gsap.from(el, {
      y: 22,
      rotationY: (i % 2 ? 8 : -8) * K,
      opacity: 0,
      transformPerspective: 1200,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  /* ================= timeline entries: brief arrival, not a flight path ================= */

  $$('.timeline__entry').forEach((el, i) => {
    gsap.from(el, {
      x: (i % 2 ? 26 : -26) * K,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ================= headings: a real but brief moment of arrival ================= */

  $$('.section__heading, .void-reveal__heading').forEach((el) => {
    gsap.from(el, {
      z: -300 * K,
      y: 32,
      rotationX: 16,
      opacity: 0,
      transformPerspective: 1000,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ================= body copy: fast fade-rise — this is what recruiters read ================= */

  $$('.body-copy').forEach((el) => {
    if (el.closest('.hero')) return; // hero handles its own
    gsap.from(el, {
      y: 20,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  /* ================= headline stat: scroll-scrubbed depth zoom ================= */

  $$('.headline-stat').forEach((el) => {
    gsap.fromTo(el,
      { scale: 0.72, rotationX: 28, z: -220 * K, opacity: 0.15, transformPerspective: 900 },
      {
        scale: 1, rotationX: 0, z: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 45%', scrub: true },
      });
  });

  /* ================= dividers: draw with the scroll ================= */

  $$('.divider').forEach((el) => {
    gsap.fromTo(el, { scaleX: 0, transformOrigin: '0% 50%' }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 65%', scrub: true },
    });
  });

  /* ================= marquees: sweep like 3D banners ================= */

  $$('.marquee').forEach((el) => {
    gsap.fromTo(el, { rotationX: 14, transformPerspective: 900 }, {
      rotationX: -14, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ================= void objects: warp in + scroll spin ================= */

  $$('.void-reveal__object').forEach((el) => {
    gsap.from(el, {
      z: -460 * K,
      scale: 0.5,
      rotationY: 95,
      opacity: 0,
      transformPerspective: 1200,
      duration: 1.5,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ================= photo slot: full flip ================= */

  $$('.photo-slot').forEach((el) => {
    gsap.from(el, {
      rotationY: 90,
      z: -240 * K,
      opacity: 0,
      transformPerspective: 1100,
      duration: 1.3,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ================= CTA bands + footer ================= */

  $$('.cta-band').forEach((el) => {
    gsap.from(el, {
      z: -200 * K, y: 60, opacity: 0,
      transformPerspective: 1100, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ================= subtle pointer tilt on cards — a hover cue, not a stunt ================= */

  if (!mobile) {
    $$('.card, .stat-card, .photo-slot').forEach((el) => {
      const qx = gsap.quickTo(el, 'rotationX', { duration: 0.45, ease: 'power2.out' });
      const qy = gsap.quickTo(el, 'rotationY', { duration: 0.45, ease: 'power2.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qy(((e.clientX - r.left) / r.width - 0.5) * 6);
        qx(-((e.clientY - r.top) / r.height - 0.5) * 6);
      });
      el.addEventListener('pointerleave', () => {
        qx(0); qy(0);
      });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
