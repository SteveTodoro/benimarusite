/* =========================================================
   Mr Benimaru — karuta-style memory matching game (collection page)

   Flow:
     1. Pick 6 random unique costumes from the pool, duplicate -> 12 cards.
     2. Shuffle, build the board, briefly show every face (the "memorize"
        preview), then flip all cards face-down to the hinomaru back.
     3. Player clicks cards to reveal them. Two of a kind -> they stay up and
        lock. A mismatch flips both back down. Clear all 6 pairs to win.

   Mirrors the structure of js/puzzle.js: IIFE, early-return guard, Math.random
   shuffle, dynamic <button> creation, and reuse of the shared design tokens.
   ========================================================= */
(function () {
  'use strict';

  var boardEl = document.getElementById('karuta-board');
  if (!boardEl) return; // not on the collection page

  var statusEl  = document.getElementById('karuta-status');
  var restartEl = document.getElementById('karuta-restart');

  var PAIRS = 6;               // unique images on the board
  var PREVIEW_MS = 1800;       // memorize hold once every card is dealt face-up
  var MISMATCH_MS = 850;       // how long a mismatched pair stays up
  var STAGGER_MS = 100;        // gap between each dealt card
  var DEAL_MS = 420;           // slide-in duration — keep in sync with CSS keyframe

  var prefersReduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The karuta deck — the 12 images in Assets/Pics/karuta. 6 are drawn per game.
  var POOL = [
    { src: 'Assets/Pics/karuta/kigae_333251.jpg', name: 'Sir Benimaru', tag: '#001' },
    { src: 'Assets/Pics/karuta/kigae_33373.jpg',  name: 'The Wanderer', tag: '#002' },
    { src: 'Assets/Pics/karuta/kigae_493097.jpg', name: 'Ginza Line',   tag: '#003' },
    { src: 'Assets/Pics/karuta/kigae_50886.jpg',  name: 'Choose Life',  tag: '#004' },
    { src: 'Assets/Pics/karuta/kigae_61882.jpg',  name: 'Mr Benimaru',  tag: '#005' },
    { src: 'Assets/Pics/karuta/kigae_621104.jpg', name: 'Mr Benimaru',  tag: '#006' },
    { src: 'Assets/Pics/karuta/kigae_680227.jpg', name: 'Tea Time',     tag: '#007' },
    { src: 'Assets/Pics/karuta/kigae_696412.jpg', name: 'Shinobeni',    tag: '#008' },
    { src: 'Assets/Pics/karuta/kigae_712663.jpg', name: 'Rising Sun',   tag: '#009' },
    { src: 'Assets/Pics/karuta/kigae_798721.jpg', name: 'Salaryman',    tag: '#010' },
    { src: 'Assets/Pics/karuta/kigae_990609.jpg', name: 'Spaceman',     tag: '#011' },
    { src: 'Assets/Pics/karuta/kigae_99716.jpg',  name: 'The Sumo',     tag: '#012' }
  ];

  /* ---- state ---- */
  var first = null;     // first revealed card el this turn
  var second = null;    // second revealed card el this turn
  var lock = true;      // ignore clicks (during preview + mismatch animation)
  var matched = 0;      // pairs found so far
  var previewTimer = null;
  var mismatchTimer = null;
  var clearStampTimer = null;  // クリア stamp + auto-redeal after a win
  var startStampTimer = null;  // スタート stamp once the preview flips down
  var dealTimers = [];  // pending per-card flip-ups, cleared on New Game

  /* ---- helpers ---- */

  // Fisher–Yates shuffle, in place.
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // 6 random unique costumes, each duplicated, then shuffled -> 12 cards.
  function buildDeck() {
    var picks = shuffle(POOL.slice()).slice(0, PAIRS);
    var deck = [];
    picks.forEach(function (entry, pairId) {
      deck.push({ pairId: pairId, data: entry });
      deck.push({ pairId: pairId, data: entry });
    });
    return shuffle(deck);
  }

  // Build one card button. The .card frame is carried by the two faces.
  function makeCard(card) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card karuta-card';
    btn.dataset.pair = String(card.pairId);
    btn.setAttribute('aria-label', 'Memory card, face down');

    var inner = document.createElement('span');
    inner.className = 'karuta-card__inner';

    var back = document.createElement('span');
    back.className = 'karuta-card__back';
    var disc = document.createElement('span');
    disc.className = 'hinomaru';
    back.appendChild(disc);

    var front = document.createElement('span');
    front.className = 'karuta-card__front';
    var img = document.createElement('img');
    img.src = card.data.src;
    img.alt = card.data.name;
    img.loading = 'lazy';
    front.appendChild(img);

    inner.appendChild(back);
    inner.appendChild(front);
    btn.appendChild(inner);

    btn.addEventListener('click', function () { onCardClick(btn); });
    return btn;
  }

  function flipUp(card) {
    card.classList.add('is-flipped');
    card.setAttribute('aria-label', 'Memory card, ' + card.querySelector('img').alt);
  }

  function flipDown(card) {
    card.classList.remove('is-flipped');
    card.setAttribute('aria-label', 'Memory card, face down');
  }

  /* ---- click handler ---- */
  function onCardClick(card) {
    if (lock) return;
    if (card === first) return;                 // same card clicked twice
    if (card.classList.contains('is-matched')) return;
    if (card.classList.contains('is-flipped')) return;

    flipUp(card);

    if (!first) { first = card; return; }       // first of the pair

    second = card;
    lock = true;

    if (first.dataset.pair === second.dataset.pair) {
      // match — keep them up, settle them, free the board
      first.classList.add('is-matched');
      second.classList.add('is-matched');
      flashCorrect(first);
      flashCorrect(second);
      matched++;
      first = second = null;
      lock = false;
      if (matched === PAIRS) win();
      else setStatus(matched === PAIRS - 1 ? 'One pair to go…' : 'Nice — keep going.');
    } else {
      // mismatch — flip both back after a beat
      setStatus('Not a match. Try again.');
      mismatchTimer = setTimeout(function () {
        flipDown(first);
        flipDown(second);
        first = second = null;
        lock = false;
      }, MISMATCH_MS);
    }
  }

  // one-shot green circle flash on a correct match
  function flashCorrect(card) {
    card.classList.remove('is-correct');
    void card.offsetWidth;            // restart the animation if re-triggered
    card.classList.add('is-correct');
    setTimeout(function () { card.classList.remove('is-correct'); }, 650);
  }

  var lastStatusEn = '';
  function tr(s) { return (window.I18N && window.I18N.t) ? window.I18N.t(s) : s; }
  function setStatus(msg) {
    lastStatusEn = msg;
    if (statusEl) statusEl.textContent = tr(msg);
  }
  // re-translate the currently shown status when the language switches
  if (window.I18N && window.I18N.onChange) {
    window.I18N.onChange(function () {
      if (statusEl && lastStatusEn) statusEl.textContent = tr(lastStatusEn);
    });
  }

  var CLEAR_HOLD_MS = 450;    // let the last pair's pop land first
  var CLEAR_MS = 2000;        // クリア stamp animation — keep in sync with CSS

  // slam the hinomaru stamp overlay over the board with the given text;
  // modifier is an optional extra class (e.g. the green start variant)
  function showStamp(text, modifier) {
    var overlay = document.createElement('div');
    overlay.className = 'game-clear' + (modifier ? ' ' + modifier : '');
    overlay.setAttribute('aria-hidden', 'true');
    var stamp = document.createElement('span');
    stamp.className = 'game-clear__stamp';
    stamp.textContent = text;
    overlay.appendChild(stamp);
    boardEl.appendChild(overlay);
    return overlay;
  }

  function win() {
    boardEl.classList.add('is-won');

    // reduced motion: no theatrics, no auto-redeal — restart stays manual
    if (prefersReduce) {
      setStatus('You found them all! 🎉 Press New Game to play again.');
      return;
    }

    setStatus('You found them all! 🎉');
    lock = true;
    clearStampTimer = setTimeout(function () {
      showStamp('クリア');
      clearStampTimer = setTimeout(newGame, CLEAR_MS);  // newGame clears the board, overlay included
    }, CLEAR_HOLD_MS);
  }

  /* ---- new game ---- */
  function newGame() {
    clearTimeout(previewTimer);
    clearTimeout(mismatchTimer);
    clearTimeout(clearStampTimer);
    clearTimeout(startStampTimer);
    dealTimers.forEach(clearTimeout);
    dealTimers = [];
    first = second = null;
    matched = 0;
    lock = true;
    boardEl.classList.remove('is-won');

    // build every card face-down; the deal flips them up one by one
    boardEl.innerHTML = '';
    var els = buildDeck().map(function (card) {
      var el = makeCard(card);
      boardEl.appendChild(el);
      return el;
    });

    setStatus('Memorize the cards…');

    // reduced motion: skip the deal, reveal all at once like before
    if (prefersReduce) {
      els.forEach(function (el) { flipUp(el); });
      previewTimer = setTimeout(function () {
        els.forEach(flipDown);
        lock = false;
        setStatus('Click on any card.');
      }, PREVIEW_MS);
      return;
    }

    // cascade deal: each card slides + tilts in, flipping face-up as it lands
    els.forEach(function (el, i) {
      el.style.setProperty('--deal-delay', (i * STAGGER_MS) + 'ms');
      el.classList.add('is-dealing');
      el.addEventListener('animationend', function onEnd() {
        el.removeEventListener('animationend', onEnd);
        el.classList.remove('is-dealing');
        el.style.removeProperty('--deal-delay');
      });
      dealTimers.push(setTimeout(function () {
        flipUp(el);
      }, i * STAGGER_MS + DEAL_MS * 0.4));
    });

    var dealTotal = (els.length - 1) * STAGGER_MS + DEAL_MS;
    previewTimer = setTimeout(function () {
      els.forEach(flipDown);
      lock = false;
      setStatus('Click on any card.');
      // stamp スタート once the flip-down lands; overlay is pointer-events:
      // none, so play can start under it
      startStampTimer = setTimeout(function () {
        var overlay = showStamp('スタート', 'game-clear--start');
        startStampTimer = setTimeout(function () { overlay.remove(); }, CLEAR_MS);
      }, CLEAR_HOLD_MS);
    }, dealTotal + PREVIEW_MS);
  }

  if (restartEl) restartEl.addEventListener('click', newGame);

  /* ---- init ---- */
  newGame();
})();
