/* Home page: turn the vintage TV on/off with the red power knob.
   The screen starts "off" (dark, nothing loaded). Powering on shows the test
   card ("please stand by", channel 1). The small knob is an easter egg: it
   hops to channel 2 — a flipbook that hard-cuts through the karuta costume
   stills (Mr Benn never morphs — he walks through the door already changed)
   — with a blip of static in between. The stills only fetch when the channel
   is first tuned.
   Foley is synthesized with Web Audio (no files): knob thunks, a static hiss
   while tuning, and a barely-there mains hum while the set is on. Everything
   is gesture-triggered, so the site stays silent until a knob is clicked. */
(function () {
  'use strict';

  var row = document.querySelector('[data-tv]');
  if (!row) return;

  var power = row.querySelector('[data-tv-power]');
  var knob = row.querySelector('[data-tv-channel]');
  var pic = row.querySelector('.tv__pic');
  if (!power || !pic) return;

  var OFF_SRC = pic.getAttribute('src');          // transparent placeholder
  var CARD_SRC = pic.getAttribute('data-card');   // test card (channel 1)
  var STORE_KEY = 'benimaru-tv';
  var TUNE_MS = 280;                              // static blip length
  var FLIP_MS = 1700;                             // channel 2: hold per costume
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var tuning = false;

  // Channel 2 deck — the karuta exports: alternative p5.js rolls that mostly
  // didn't make the final collection, so broadcasting them spoils nothing.
  var FLIP_SRCS = [
    'Assets/Pics/karuta/kigae_333251.jpg',
    'Assets/Pics/karuta/kigae_33373.jpg',
    'Assets/Pics/karuta/kigae_493097.jpg',
    'Assets/Pics/karuta/kigae_50886.jpg',
    'Assets/Pics/karuta/kigae_61882.jpg',
    'Assets/Pics/karuta/kigae_989850.png',
    'Assets/Pics/karuta/kigae_680227.jpg',
    'Assets/Pics/karuta/kigae_696412.jpg',
    'Assets/Pics/karuta/kigae_712663.jpg',
    'Assets/Pics/karuta/kigae_798721.jpg',
    'Assets/Pics/karuta/kigae_990609.jpg',
    'Assets/Pics/karuta/kigae_99716.jpg'
  ];
  var flipTimer = null;
  var flipIndex = 0;
  var flipPreloaded = false;

  function preloadFlip() {
    if (flipPreloaded) return;
    flipPreloaded = true;
    FLIP_SRCS.forEach(function (src) {
      var img = new Image();
      img.src = src;
    });
  }

  function stopFlip() {
    clearInterval(flipTimer);
    flipTimer = null;
  }

  function startFlip() {
    stopFlip();
    flipTimer = setInterval(function () {
      flipIndex = (flipIndex + 1) % FLIP_SRCS.length;
      pic.setAttribute('src', FLIP_SRCS[flipIndex]);
    }, FLIP_MS);
  }

  /* ---- foley ----
     The AudioContext is created lazily inside a click handler (a user
     gesture), which satisfies browser autoplay policy. Visitors who never
     touch the TV never hear a thing. */
  var actx = null;
  var humNodes = null;   // oscillators + gain while the hum is playing

  function getCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  // short filtered white-noise burst — knob clicks / the tuning hiss.
  // delay (seconds, optional) schedules the burst slightly in the future.
  function noiseBurst(ctx, dur, filterType, freq, vol, delay) {
    var len = Math.ceil(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    var gain = ctx.createGain();
    var t = ctx.currentTime + (delay || 0);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur);
  }

  // mechanical knob thunk: a pitched thump plus a click of noise
  function thunk(freq) {
    var ctx = getCtx();
    if (!ctx) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
    noiseBurst(ctx, 0.04, 'lowpass', 900, 0.12);
  }

  // crisp rotary-detent click for the channel knob: a sharp high tick and a
  // lighter one right behind it (the detent engaging, then settling) — no
  // low-frequency body, which is what read as a snare drum
  function knobClick() {
    var ctx = getCtx();
    if (!ctx) return;
    noiseBurst(ctx, 0.012, 'highpass', 3000, 0.2);
    noiseBurst(ctx, 0.01, 'highpass', 3500, 0.07, 0.045);
  }

  // faint hiss matching the visual static while the channel tunes. Unlike
  // noiseBurst it fades IN — an instant broadband onset reads as a snare
  // hit, a swelling one reads as interference
  function staticHiss() {
    var ctx = getCtx();
    if (!ctx) return;
    var dur = TUNE_MS / 1000;
    var len = Math.ceil(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    var gain = ctx.createGain();
    var t = ctx.currentTime + 0.05;   // let the knob click read first
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.02, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur);
  }

  // barely-there mains hum while the set is on (50 Hz — it's a British
  // telly — with harmonics so laptop speakers can render something)
  function humStart() {
    var ctx = getCtx();
    if (!ctx || humNodes) return;
    var t = ctx.currentTime;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.012, t + 0.6);
    gain.connect(ctx.destination);
    var oscs = [50, 100, 150].map(function (f, i) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.value = [1, 0.5, 0.25][i];
      o.connect(g);
      g.connect(gain);
      o.start(t);
      return o;
    });
    humNodes = { oscs: oscs, gain: gain };
  }

  function humStop() {
    if (!humNodes || !actx) return;
    var t = actx.currentTime;
    var n = humNodes;
    humNodes = null;
    n.gain.gain.cancelScheduledValues(t);
    n.gain.gain.setValueAtTime(Math.max(n.gain.gain.value, 0.0001), t);
    n.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    n.oscs.forEach(function (o) { o.stop(t + 0.3); });
  }

  // a real TV would keep humming, but a mystery buzz from a background tab
  // is how easter eggs get sites closed — pause it, resume on return
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) humStop();
    else if (actx && row.classList.contains('is-on')) humStart();
  });

  /* ---- controls ---- */

  function store(on) {
    try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch (e) {}
  }

  // animate=false restores a remembered state silently (no power-on flash)
  function setOn(on, animate) {
    row.classList.toggle('no-flash', !animate);
    row.classList.toggle('is-on', on);
    row.classList.remove('is-ch2', 'is-tuning');  // always start on the test card
    stopFlip();
    tuning = false;
    power.setAttribute('aria-pressed', on ? 'true' : 'false');
    power.setAttribute('aria-label', on ? 'Turn the TV off' : 'Turn the TV on');
    pic.setAttribute('src', on ? CARD_SRC : OFF_SRC);
  }

  function setChannel(ch2) {
    row.classList.toggle('is-ch2', ch2);
    stopFlip();
    if (ch2) {
      preloadFlip();
      pic.setAttribute('src', FLIP_SRCS[flipIndex]);
      startFlip();
    } else {
      pic.setAttribute('src', CARD_SRC);
    }
  }

  power.addEventListener('click', function () {
    var on = power.getAttribute('aria-pressed') !== 'true';
    setOn(on, true);
    store(on);
    thunk(on ? 110 : 80);   // power-on lands slightly brighter than power-off
    if (on) humStart(); else humStop();
  });

  if (knob && CARD_SRC) {
    knob.addEventListener('click', function () {
      if (!row.classList.contains('is-on') || tuning) return;
      var ch2 = !row.classList.contains('is-ch2');
      knobClick();
      humStart();   // covers a set restored "on" from a previous visit
      if (reduceMotion.matches) { setChannel(ch2); return; }
      staticHiss();
      tuning = true;
      row.classList.add('is-tuning');             // burst of static...
      setChannel(ch2);                            // ...hides the swap + load
      setTimeout(function () {
        row.classList.remove('is-tuning');
        tuning = false;
      }, TUNE_MS);
    });
  }

  // restore the saved state on load (silently — no gesture, no audio)
  var saved;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (saved === '1') setOn(true, false);
})();
