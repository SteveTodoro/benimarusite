/* Shared site JS: mobile nav toggle, active-link highlight, collection lightbox */
(function () {
  'use strict';

  /* ----- mobile hamburger ----- */
  var toggle = document.querySelector('.nav__toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('is-open');
    });
  }

  /* ----- active link highlight (based on current file name) ----- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach(function (a) {
    var target = a.getAttribute('href');
    if (target === here || (here === 'index.html' && target === 'index.html')) {
      a.classList.add('is-active');
    }
  });

  /* ----- lightbox for collection images (opt-in via [data-lightbox]) ----- */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    function openLb(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
    }
    function closeLb() {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      lbImg.src = '';
    }
    document.querySelectorAll('[data-lightbox]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault(); /* [data-lightbox] may sit on an <a> whose href is the no-JS fallback */
        var img = el.querySelector('img');
        if (img) openLb(img.src, img.alt);
      });
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox__close')) closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLb();
    });
  }

  /* ----- reveal-on-scroll -----
     Add the .reveal class from JS so content is never hidden when JS is off.
     Respect reduced-motion and degrade gracefully without IntersectionObserver. */
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.page-head, .section');
  if (revealEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    // Paint the hidden start-state first, otherwise sections already on screen
    // jump straight to visible and the transition never runs.
    revealEls.forEach(function (el) { el.classList.add('reveal'); });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function (el) { io.observe(el); });
      });
    });
  }

  /* ----- clips that play while they're on screen -----
     The autoplay attribute is only the no-JS fallback: browsers refuse muted
     autoplay often enough (per-site auto-play settings, low-power mode,
     off-screen throttling) that playback is driven explicitly here instead.
     Opt in per video with data-play-in-view, so the always-on station ident
     on the whitelist page keeps its own behaviour.
       - reduced motion: never plays on its own, gains controls instead
       - blocked anyway: play() rejects, so fall back to controls
     Nothing is lost without IntersectionObserver — the attribute still applies. */
  var clips = document.querySelectorAll('video[data-play-in-view]');
  if (clips.length && reduceMotion) {
    clips.forEach(function (vid) {
      vid.removeAttribute('autoplay');
      vid.autoplay = false;
      vid.controls = true;
      vid.pause();
    });
  } else if (clips.length && 'IntersectionObserver' in window) {
    var clipIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var vid = entry.target;
        if (!entry.isIntersecting) { vid.pause(); return; }
        var played = vid.play();
        if (played && played.catch) {
          played.catch(function () { vid.controls = true; });
        }
      });
    }, { threshold: 0.25 });
    clips.forEach(function (vid) { clipIo.observe(vid); });
  }
})();
