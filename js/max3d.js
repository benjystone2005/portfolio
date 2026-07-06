/* Benjy Stone — scroll choreography (GSAP + ScrollTrigger)
   Every page reads as a considered camera move through 3D space:
   sections swing gently, cards settle in from depth, timeline entries
   arrive from alternating sides, headline stats resolve into focus,
   marquees tilt subtly, dividers draw with scroll, a restrained
   pointer tilt on cards. Tuned for "impressive and bold" without
   tipping into "gimmicky" — every value here favours composed motion
   over maximum amplitude. Headline type enters as solid, stable
   blocks — no per-letter splitting, no ongoing drift — and settles
   permanently once revealed.
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

  /* ================= cards: dramatic flips from depth ================= */

  $$('.card, .stat-card').forEach((el, i) => {
    // note: no `y` here — the idle float tween owns y
    gsap.from(el, {
      rotationY: (i % 2 ? 58 : -58) * K,
      z: -320 * K,
      opacity: 0,
      transformPerspective: 1200,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  /* ================= timeline entries: fly in from alternating sides ================= */

  $$('.timeline__entry').forEach((el, i) => {
    gsap.from(el, {
      rotationY: (i % 2 ? 46 : -46) * K,
      x: (i % 2 ? 110 : -110) * K,
      z: -260 * K,
      opacity: 0,
      transformPerspective: 1200,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ================= headings: zoom in from deep space ================= */

  $$('.section__heading, .void-reveal__heading').forEach((el) => {
    gsap.from(el, {
      z: -380 * K,
      y: 40,
      rotationX: 20,
      opacity: 0,
      transformPerspective: 1000,
      duration: 1.3,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ================= body copy: rise from depth ================= */

  $$('.body-copy').forEach((el) => {
    if (el.closest('.hero')) return; // hero handles its own
    gsap.from(el, {
      y: 50,
      z: -120 * K,
      rotationX: 12,
      opacity: 0,
      transformPerspective: 1000,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
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

  /* ================= exaggerated pointer tilt on cards ================= */

  if (!mobile) {
    $$('.card, .stat-card, .photo-slot').forEach((el) => {
      const qx = gsap.quickTo(el, 'rotationX', { duration: 0.45, ease: 'power2.out' });
      const qy = gsap.quickTo(el, 'rotationY', { duration: 0.45, ease: 'power2.out' });
      const qz = gsap.quickTo(el, 'z', { duration: 0.45, ease: 'power2.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qy(((e.clientX - r.left) / r.width - 0.5) * 15);
        qx(-((e.clientY - r.top) / r.height - 0.5) * 15);
        qz(36);
      });
      el.addEventListener('pointerleave', () => {
        qx(0); qy(0); qz(0);
      });
    });
  }

  /* ================= proof cards float idly (nothing sits still) ================= */

  $$('.card, .stat-card').forEach((el, i) => {
    gsap.to(el, {
      y: '+=' + (6 + (i % 3) * 4),
      duration: 2.2 + (i % 3) * 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: i * 0.3,
    });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
