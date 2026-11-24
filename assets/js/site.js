/* Papatya Sigorta — scroll story */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = window.gsap && window.ScrollTrigger;

  /* ---------- text splitting (word masks, keeps <em>) ---------- */
  function splitWords(el, masked) {
    var out = d.createDocumentFragment();
    function walk(node, parentEm) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(d.createTextNode(' ')); return; }
            var w = d.createElement('span');
            if (masked) {
              w.className = 'line';
              var inner = d.createElement('span');
              inner.textContent = part;
              w.appendChild(inner);
            } else { w.className = 'w'; w.textContent = part; }
            if (parentEm) { var em = d.createElement('em'); em.appendChild(w); out.appendChild(em); }
            else out.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          walk(n, n.tagName === 'EM' || parentEm);
        }
      });
    }
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    walk(el, false);
    el.textContent = '';
    el.appendChild(out);
    el.setAttribute('aria-label', label);
    el.querySelectorAll('.line,.w').forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
  }
  d.querySelectorAll('[data-split]').forEach(function (el) { splitWords(el, true); });
  d.querySelectorAll('[data-words]').forEach(function (el) { splitWords(el, false); });

  /* ---------- small UI (works without GSAP) ---------- */
  var hdr = d.getElementById('hdr');
  var menuBtn = d.querySelector('.menu-btn');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  }
  menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });

  // quote form → WhatsApp / e-mail
  var form = d.getElementById('qf');
  function buildMsg() {
    var f = new FormData(form);
    var urun = f.getAll('urun');
    var lines = ['Merhaba, Papatya Sigorta web sitesinden teklif istiyorum.', '',
      'Ad soyad: ' + (f.get('ad') || '').trim(),
      'Telefon: ' + (f.get('tel') || '').trim()];
    if (urun.length) lines.push('Sigorta: ' + urun.join(', '));
    var not = (f.get('not') || '').trim();
    if (not) lines.push('Not: ' + not);
    return lines.join('\n');
  }
  function valid() {
    var ok = true;
    ['ad', 'tel'].forEach(function (n) {
      var i = form.elements[n];
      i.setCustomValidity(i.value.trim() ? '' : (n === 'ad' ? 'Lütfen adınızı yazın.' : 'Lütfen telefon numaranızı yazın.'));
      if (ok && !i.checkValidity()) { i.reportValidity(); ok = false; }
    });
    return ok;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valid()) return;
    window.open('https://wa.me/905324249680?text=' + encodeURIComponent(buildMsg()), '_blank', 'noopener');
  });
  d.getElementById('qf-mail').addEventListener('click', function () {
    if (!valid()) return;
    location.href = 'mailto:papatyasigorta@hotmail.com?subject=' + encodeURIComponent('Teklif talebi') + '&body=' + encodeURIComponent(buildMsg());
  });
  d.querySelectorAll('.svc[data-urun]').forEach(function (a) {
    a.addEventListener('click', function () {
      var cb = form.querySelector('input[name="urun"][value="' + a.dataset.urun + '"]');
      if (cb) cb.checked = true;
    });
  });

  /* ---------- hero emblem geometry (SVG in viewport pixels) ---------- */
  var hsvg = d.getElementById('hsvg'), hg = d.getElementById('hg');
  var VB = { x: 60, y: 170, w: 610, h: 625 }, P = { x: 468, y: 488 }; // P: centre of the tall petal
  var geo = {};
  function measure() {
    var W = hsvg.parentNode.clientWidth, H = hsvg.parentNode.clientHeight;
    hsvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    hsvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    var mobile = W <= 900, ew, ex, ey;
    if (mobile) {
      var copy = d.querySelector('.hero-copy');
      var copyTop = copy ? copy.getBoundingClientRect().top - hsvg.parentNode.getBoundingClientRect().top : H * 0.4;
      var room = copyTop - 28 - 84; // space between header and copy
      ew = Math.max(80, Math.min(W * 0.56, 300, room * VB.w / VB.h));
      ex = W - ew - Math.min(Math.max(20, W * 0.05), 72);
      ey = 84 + Math.max(0, (room - ew * VB.h / VB.w) / 2);
    } else {
      var gut = Math.min(Math.max(20, W * 0.05), 72);
      ew = Math.min(W * 0.36, 520);
      var right = Math.max(gut, (W - 1200) / 2 - 20);
      ex = W - right - ew;
      ey = H / 2 - ew * (VB.h / VB.w) / 2 + 30;
    }
    var k = ew / VB.w;
    geo = {
      W: W, H: H, k0: k,
      p0x: ex + (P.x - VB.x) * k, p0y: ey + (P.y - VB.y) * k,
      // big enough that the petal opening covers the viewport diagonal
      kEnd: (Math.hypot(W, H) * 1.25) / 46
    };
  }
  var hs = { t: 0, m: 0 }; // t: zoom progress, m: move-to-centre progress
  function drawEmblem() {
    var k = geo.k0 * Math.pow(geo.kEnd / geo.k0, hs.t);
    var px = geo.p0x + (geo.W / 2 - geo.p0x) * hs.m;
    var py = geo.p0y + (geo.H / 2 - geo.p0y) * hs.m;
    var tx = px - (P.x - VB.x) * k - VB.x * k, ty = py - (P.y - VB.y) * k - VB.y * k;
    hg.setAttribute('transform', 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + k.toFixed(5) + ')');
  }
  measure(); drawEmblem();

  /* ---------- no animation fallback ---------- */
  var loader = d.querySelector('.loader');
  if (!hasGsap) {
    if (loader) loader.remove();
    root.classList.remove('js');
    window.addEventListener('resize', function () { measure(); drawEmblem(); });
    var wa0 = d.querySelector('.wa'); if (wa0) wa0.classList.add('on');
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  /* ---------- Lenis smooth scroll, driven by GSAP's ticker ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, syncTouch: false, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var t = id === '#top' ? 0 : d.querySelector(id);
      if (t === null) return;
      e.preventDefault();
      if (root.classList.contains('menu-open')) setMenu(false);
      if (lenis) lenis.scrollTo(t, { offset: 0, duration: 1.6 });
      else window.scrollTo({ top: t === 0 ? 0 : t.getBoundingClientRect().top + scrollY, behavior: 'smooth' });
    });
  });

  /* ---------- initial states ---------- */
  gsap.set('.hero .line>span', { yPercent: 115 });
  gsap.set('.hero .h-eb, .hero .h-fade', { autoAlpha: 0, y: 24 });
  gsap.set('.hero-emblem', { autoAlpha: 0 });
  gsap.set('.hero .bg-base img', { scale: 1.12 });

  /* safety net: never leave the visitor behind the loader */
  setTimeout(function () {
    if (loader && loader.style.display !== 'none') {
      loader.style.display = 'none';
      gsap.set('.hero .line>span', { yPercent: 0 });
      gsap.set('.hero .h-eb, .hero .h-fade, .hero-emblem', { autoAlpha: 1, y: 0 });
      gsap.set('.hero .bg-base img', { scale: 1 });
      if (lenis) lenis.start();
    }
  }, 9000);

  /* ---------- loader → intro ---------- */
  var ready = Promise.all([
    d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve(),
    new Promise(function (r) { var im = d.querySelector('.hero .bg-base img'); if (im.complete) r(); else { im.addEventListener('load', r); im.addEventListener('error', r); } }),
    new Promise(function (r) { setTimeout(r, 700); })
  ]);
  var bar = gsap.to('.loader-bar i', { scaleX: 0.85, duration: 1.4, ease: 'power2.out' });
  gsap.from('.loader svg', { autoAlpha: 0, scale: .8, duration: .9, ease: 'expo.out' });
  var failsafe = new Promise(function (r) { setTimeout(r, 3500); });
  Promise.race([ready, failsafe]).then(function () {
    bar.kill();
    var tl = gsap.timeline({ onComplete: function () { if (lenis) lenis.start(); } });
    tl.to('.loader-bar i', { scaleX: 1, duration: .35, ease: 'power2.inOut' })
      .to('.loader-in', { autoAlpha: 0, y: -20, duration: .45, ease: 'power2.in' })
      .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=.1')
      .add(function () { loader.style.display = 'none'; })
      .to('.hero .bg-base img', { scale: 1, duration: 2.2, ease: 'expo.out' }, '<')
      .to('.hero-emblem', { autoAlpha: 1, duration: 1.4, ease: 'power2.out' }, '<.35')
      .fromTo(hs, { t: -0.06 }, { t: 0, duration: 1.8, ease: 'expo.out', onUpdate: drawEmblem }, '<')
      .to('.hero .h-eb', { autoAlpha: 1, y: 0, duration: .9, ease: 'expo.out' }, '<.1')
      .to('.hero .line>span', { yPercent: 0, duration: 1.2, stagger: .08, ease: 'expo.out' }, '<.05')
      .to('.hero .h-fade', { autoAlpha: 1, y: 0, duration: 1, stagger: .1, ease: 'expo.out' }, '<.35');
  });

  /* ---------- HERO pinned zoom-through-the-petal ---------- */
  var mm = gsap.matchMedia();
  ST.addEventListener('refreshInit', function () { measure(); drawEmblem(); });

  var heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=170%', pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: function (self) { if (self.isActive) hdr.classList.toggle('light', self.progress > 0.62); } }
  });
  heroTl
    .to('.hero-copy', { y: -90, autoAlpha: 0, duration: .26, ease: 'power1.in' }, 0)
    .to('.hero-scroll, .hero-meta', { autoAlpha: 0, duration: .12 }, 0)
    .to(hs, { m: 1, duration: .34, ease: 'power2.inOut', onUpdate: drawEmblem }, 0.04)
    .to(hs, { t: 1, duration: .78, ease: 'power3.in', onUpdate: drawEmblem }, 0.12)
    .to('.hero .bg-base img', { scale: 1.18, duration: .7 }, 0)
    .to('.hero .bg-next', { autoAlpha: 1, duration: .2 }, 0.56)
    .to('.hero-emblem', { autoAlpha: 0, duration: .1 }, 0.9);

  /* ---------- header: theme + solid + hide on scroll down ---------- */
  d.querySelectorAll('[data-theme]').forEach(function (sec) {
    ST.create({
      trigger: sec, start: 'top 40px', end: 'bottom 40px',
      onToggle: function (self) { if (self.isActive) hdr.classList.toggle('light', sec.dataset.theme === 'light'); }
    });
  });
  var wa = d.querySelector('.wa');
  ST.create({
    trigger: '.story', start: 'top 80px', end: 'max',
    onUpdate: function (self) {
      hdr.classList.toggle('hide', self.direction === 1 && self.scroll() > window.innerHeight * 2.2 && !root.classList.contains('menu-open'));
    },
    onToggle: function (self) { hdr.classList.toggle('solid', self.isActive); wa.classList.toggle('on', self.isActive); }
  });

  /* ---------- generic reveals ---------- */
  gsap.set('.rv', { autoAlpha: 0, y: 40 });
  ST.batch('.rv', {
    start: 'top 88%', once: true,
    onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: .09, ease: 'expo.out', overwrite: true }); }
  });
  d.querySelectorAll('[data-split]').forEach(function (h) {
    if (h.closest('.hero')) return;
    var w = h.querySelectorAll('.line>span');
    gsap.set(w, { yPercent: 115 });
    ST.create({
      trigger: h, start: 'top 86%', once: true,
      onEnter: function () { gsap.to(w, { yPercent: 0, duration: 1.15, stagger: .055, ease: 'expo.out' }); }
    });
  });
  // scrubbed word-by-word reading
  d.querySelectorAll('[data-words]').forEach(function (p) {
    gsap.to(p.querySelectorAll('.w'), {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 48%', scrub: true }
    });
  });

  /* ---------- parallax backgrounds ---------- */
  d.querySelectorAll('section .bg img, footer .bg img').forEach(function (img) {
    if (img.closest('.hero')) return;
    gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.closest('section,footer'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- VALUES: horizontal journey (desktop) ---------- */
  mm.add('(min-width: 901px)', function () {
    var track = d.querySelector('.values-track');
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.values', start: 'top top', end: function () { return '+=' + (dist() + window.innerHeight * 0.5); }, pin: '.values-pin', scrub: true, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    tl.to(track, { x: function () { return -dist(); }, duration: 1 }, 0.08)
      .to('.values-progress i', { scaleX: 1, duration: 1.08 }, 0)
      .to('.vcard .dz', { rotation: 160, duration: 1.08 }, 0);
    return function () { gsap.set(track, { clearProps: 'transform' }); };
  });
  mm.add('(max-width: 900px)', function () {
    gsap.utils.toArray('.vcard').forEach(function (c) {
      gsap.from(c, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } });
      gsap.to(c.querySelector('.dz'), { rotation: 90, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ---------- RIBBONS ---------- */
  d.querySelectorAll('.rib').forEach(function (r) {
    var dir = +r.dataset.dir;
    gsap.fromTo(r, { x: function () { return dir < 0 ? 0 : -(r.scrollWidth - window.innerWidth); } }, {
      x: function () { return dir < 0 ? -(r.scrollWidth - window.innerWidth) : 0; }, ease: 'none',
      scrollTrigger: { trigger: '.ribbons', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });
  });

  /* ---------- SERVICES ---------- */
  gsap.set('.svc', { autoAlpha: 0, y: 60 });
  ST.batch('.svc', {
    start: 'top 92%', once: true,
    onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: .08, ease: 'expo.out', overwrite: true, onComplete: function () { gsap.set(els, { clearProps: 'transform' }); } }); }
  });

  /* ---------- PROCESS ---------- */
  gsap.to('.steps-line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 55%', scrub: true } });
  gsap.utils.toArray('.step').forEach(function (s) {
    gsap.from(s, { x: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%', once: true } });
  });

  /* ---------- QUOTE daisy ---------- */
  gsap.fromTo('.quote .daisy-deco', { rotation: -40 }, { rotation: 60, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- refresh once everything settled ---------- */
  window.addEventListener('load', function () { ST.refresh(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); });
})();
