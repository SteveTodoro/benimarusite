/* =========================================================
   Mr Benimaru — liquid goo / bloom effects

   1. Injects the shared SVG "gooey" filters into the page. External
      url(file.svg#id) filter refs are broken in Chrome/Safari, so the
      <defs> must live inline in every document — this script is that
      single shared copy.
   2. Adds .goo-ready to <html>. Every goo style in styles.css is gated
      on that class, so with JS off (or this file blocked) the site
      renders exactly as it did before.
   3. Runs the gooey nav indicator: two pills chase the hovered link
      with different lags; under the #goo filter the slow one stretches
      the merged blob into a liquid bridge between stops.
   ========================================================= */
(function () {
  'use strict';

  var SVG =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
      '<defs>' +
        /* plain goo — nav indicator */
        '<filter id="goo" x="-30%" y="-30%" width="160%" height="160%">' +
          '<feGaussianBlur in="SourceGraphic" stdDeviation="6" />' +
          '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" />' +
        '</filter>' +
        /* goo + re-synthesized 3px ink outline — button bloom.
           dilate(3) grows the merged silhouette, feFlood inks it, and the
           goo is merged back on top: one continuous cartoon outline even
           across the droplet necks. Tall filter region so droplets bobbing
           above/below the pill are never clipped. */
        '<filter id="goo-ink" x="-20%" y="-100%" width="140%" height="300%">' +
          '<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />' +
          '<feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11" />' +
          '<feMorphology in="goo" operator="dilate" radius="3" result="fat" />' +
          '<feFlood flood-color="#2B2B2B" />' +
          '<feComposite in2="fat" operator="in" result="outline" />' +
          '<feMerge><feMergeNode in="outline" /><feMergeNode in="goo" /></feMerge>' +
        '</filter>' +
        /* soft goo — hero blob field */
        '<filter id="goo-soft" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feGaussianBlur in="SourceGraphic" stdDeviation="18" />' +
          '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -5" />' +
        '</filter>' +
      '</defs>' +
    '</svg>';

  function init() {
    document.body.insertAdjacentHTML('beforeend', SVG);
    document.documentElement.classList.add('goo-ready');
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduceMotion || !finePointer) return; // pointer effects below only
    initNavGoo();
  }

  /* ----- gooey nav indicator -----
     .nav-goo-on is only added when the indicator actually runs (init()
     gates on fine pointer + reduced motion), so the plain CSS hover
     fills stay in place otherwise. */
  function initNavGoo() {
    var inner = document.querySelector('.nav__inner');
    if (!inner) return;

    var toggle = inner.querySelector('.nav__toggle');
    var goo = document.createElement('span');
    goo.className = 'nav__goo';
    goo.setAttribute('aria-hidden', 'true');
    goo.appendChild(document.createElement('i'));
    goo.appendChild(document.createElement('i'));
    inner.insertBefore(goo, inner.firstChild);
    var pills = goo.children;
    document.documentElement.classList.add('nav-goo-on');

    var visible = false;

    // ≤760px the links live in the dropdown — no indicator there
    function mobileLayout() {
      return toggle && getComputedStyle(toggle).display !== 'none';
    }

    function moveTo(el) {
      if (mobileLayout()) return;
      var host = inner.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      for (var i = 0; i < pills.length; i++) {
        var p = pills[i];
        if (!visible) p.style.transition = 'none'; // appear in place, don't fly in
        p.style.left = (r.left - host.left) + 'px';
        p.style.top = (r.top - host.top) + 'px';
        p.style.width = r.width + 'px';
        p.style.height = r.height + 'px';
        if (!visible) { void p.offsetWidth; p.style.transition = ''; }
        p.style.transform = 'scale(1)';
      }
      visible = true;
    }

    function hide() {
      for (var i = 0; i < pills.length; i++) pills[i].style.transform = 'scale(0)';
      visible = false;
    }

    inner.querySelectorAll('.nav__links a, .lang-toggle').forEach(function (el) {
      el.addEventListener('mouseenter', function () { moveTo(el); });
    });
    inner.addEventListener('mouseleave', hide);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
