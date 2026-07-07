/* Home page: turn the vintage TV on/off with the red power knob.
   The screen starts "off" (dark, GIF not loaded). Turning it on swaps the image
   src to the real GIF so it starts from frame 1 — which also defers the ~1.6 MB
   download until someone interacts. Turning it off stops playback. */
(function () {
  'use strict';

  var row = document.querySelector('[data-tv]');
  if (!row) return;

  var power = row.querySelector('[data-tv-power]');
  var pic = row.querySelector('.tv__pic');
  if (!power || !pic) return;

  var OFF_SRC = pic.getAttribute('src');          // transparent placeholder
  var GIF_SRC = pic.getAttribute('data-gif');
  var STORE_KEY = 'benimaru-tv';

  function store(on) {
    try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch (e) {}
  }

  // animate=false restores a remembered state silently (no power-on flash)
  function setOn(on, animate) {
    row.classList.toggle('no-flash', !animate);
    row.classList.toggle('is-on', on);
    power.setAttribute('aria-pressed', on ? 'true' : 'false');
    power.setAttribute('aria-label', on ? 'Turn the TV off' : 'Turn the TV on');
    // Assigning the src (re)starts the GIF; the placeholder stops playback.
    pic.setAttribute('src', on ? GIF_SRC : OFF_SRC);
  }

  power.addEventListener('click', function () {
    var on = power.getAttribute('aria-pressed') !== 'true';
    setOn(on, true);
    store(on);
  });

  // restore the saved state on load
  var saved;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (saved === '1') setOn(true, false);
})();
