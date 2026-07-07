/* =========================================================
   Mr Benimaru — 3x3 sliding-tile puzzle (whitelist gate)

   State model:
     board = array of 9 entries, index = grid cell (0..8, row-major),
     value = tile id (0..8). Tile id 8 is the BLANK.
     Solved when board[i] === i for all i.

   Interaction:
     Click/tap a tile orthogonally adjacent to the blank to slide it
     into the empty space. Works on desktop (click) and mobile (tap).

   NOTE: This is a light, fun bot-deterrent — NOT real bot protection.
   Wire the form to a real backend/CAPTCHA if you need genuine security.
   ========================================================= */
(function () {
  'use strict';

  var SIZE = 3;
  var COUNT = SIZE * SIZE;     // 9
  var BLANK = COUNT - 1;       // tile id 8

  // X application target — edit TWEET_ID when the pinned post is live.
  var X_HANDLE = 'MrBenimarusays';
  var TWEET_ID = 'PASTE_PINNED_TWEET_ID_HERE';

  // pick one of the two source images at random each load
  var IMAGES = ['Assets/puzzle1.jpg', 'Assets/puzzle2.jpg'];
  var imageSrc = IMAGES[Math.floor(Math.random() * IMAGES.length)];

  var boardEl   = document.getElementById('puzzle');
  var moveEl    = document.getElementById('move-count');
  var shuffleBtn = document.getElementById('shuffle-btn');
  var thumb     = document.getElementById('thumb-hint');
  var solvedBadge = document.getElementById('solved-badge');
  var formWrap  = document.getElementById('form-wrap');

  if (!boardEl) return; // not on the whitelist page

  var board = [];     // current arrangement
  var tileEls = [];   // one DOM node per grid cell
  var numEls = [];    // the corner-number span inside each tile
  var moves = 0;
  var solved = false;

  /* クリア stamp on win — same overlay the karuta game uses */
  var CLEAR_HOLD_MS = 450;   // let the solved jelly-wobble land first
  var CLEAR_MS = 2000;       // stamp animation — keep in sync with CSS
  var clearStampTimer = null;
  var prefersReduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  thumb.src = imageSrc;

  /* ---- helpers ---- */
  function isSolved(arr) {
    for (var i = 0; i < COUNT; i++) if (arr[i] !== i) return false;
    return true;
  }

  // background-position for a given tile id, at 300% background size.
  // Three steps -> 0%, 50%, 100%.
  function bgPosition(tileId) {
    var col = tileId % SIZE;
    var row = Math.floor(tileId / SIZE);
    return (col * 50) + '% ' + (row * 50) + '%';
  }

  function neighbours(index) {
    var col = index % SIZE;
    var row = Math.floor(index / SIZE);
    var out = [];
    if (row > 0)        out.push(index - SIZE); // up
    if (row < SIZE - 1) out.push(index + SIZE); // down
    if (col > 0)        out.push(index - 1);    // left
    if (col < SIZE - 1) out.push(index + 1);    // right
    return out;
  }

  function blankIndex() {
    return board.indexOf(BLANK);
  }

  /* ---- build the DOM once ---- */
  function buildBoard() {
    boardEl.innerHTML = '';
    tileEls = [];
    numEls = [];
    for (var i = 0; i < COUNT; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.setAttribute('role', 'gridcell');
      btn.style.backgroundImage = 'url("' + imageSrc + '")';
      var num = document.createElement('span');
      num.className = 'tile__num';
      num.setAttribute('aria-hidden', 'true');
      btn.appendChild(num);
      (function (cellIndex) {
        btn.addEventListener('click', function () { onTileClick(cellIndex); });
      })(i);
      boardEl.appendChild(btn);
      tileEls.push(btn);
      numEls.push(num);
    }
  }

  /* ---- render current state into the DOM ---- */
  function render() {
    for (var i = 0; i < COUNT; i++) {
      var tileId = board[i];
      var el = tileEls[i];
      if (tileId === BLANK) {
        el.classList.add('is-blank');
        el.style.backgroundImage = 'none';
        el.setAttribute('aria-label', 'empty space');
        el.tabIndex = -1;
        numEls[i].textContent = '';
      } else {
        el.classList.remove('is-blank');
        el.style.backgroundImage = 'url("' + imageSrc + '")';
        el.style.backgroundPosition = bgPosition(tileId);
        el.setAttribute('aria-label', 'tile ' + (tileId + 1));
        el.tabIndex = 0;
        numEls[i].textContent = String(tileId + 1);
      }
    }
    moveEl.textContent = String(moves);
  }

  /* ---- shuffle by applying random valid moves (always solvable) ---- */
  function shuffle() {
    board = [];
    for (var i = 0; i < COUNT; i++) board.push(i); // solved

    var prev = -1;
    for (var s = 0; s < 200; s++) {
      var blank = blankIndex();
      var opts = neighbours(blank).filter(function (n) { return n !== prev; });
      var pick = opts[Math.floor(Math.random() * opts.length)];
      // swap blank with picked neighbour
      board[blank] = board[pick];
      board[pick] = BLANK;
      prev = blank;
    }

    // extremely unlikely, but never start solved
    if (isSolved(board)) return shuffle();

    moves = 0;
    solved = false;
    boardEl.classList.remove('is-solved');
    solvedBadge.classList.remove('show');
    render();
  }

  /* ---- click handler: slide if adjacent to blank ---- */
  function onTileClick(index) {
    if (solved) return;
    var blank = blankIndex();
    if (neighbours(blank).indexOf(index) === -1) return; // not adjacent
    board[blank] = board[index];
    board[index] = BLANK;
    moves++;
    render();
    // droplet-settle on the tile that just landed in the old blank cell;
    // remove + reflow so the animation replays on rapid moves
    var landed = tileEls[blank];
    landed.classList.remove('just-moved');
    void landed.offsetWidth;
    landed.classList.add('just-moved');
    if (isSolved(board)) win();
  }

  function win() {
    solved = true;
    boardEl.classList.add('is-solved');
    // show the full picture by clearing the blank slice back to its tile
    var blank = blankIndex();
    tileEls[blank].classList.remove('is-blank');
    tileEls[blank].style.backgroundImage = 'url("' + imageSrc + '")';
    tileEls[blank].style.backgroundPosition = bgPosition(BLANK);
    numEls[blank].textContent = String(BLANK + 1);

    // reduced motion: no stamp — unlock and jump straight to the first action
    if (prefersReduce) {
      unlockForm(true);
      return;
    }

    // クリア stamp over the finished picture; the badge, form and X steps
    // unlock only once it has zoomed away, so the celebration is the star
    // (and on mobile the focus jump can't scroll it off-screen)
    clearStampTimer = setTimeout(function () {
      var overlay = document.createElement('div');
      overlay.className = 'game-clear';
      overlay.setAttribute('aria-hidden', 'true');
      var stamp = document.createElement('span');
      stamp.className = 'game-clear__stamp';
      stamp.textContent = 'クリア';
      overlay.appendChild(stamp);
      boardEl.appendChild(overlay);
      clearStampTimer = setTimeout(function () {
        overlay.remove();
        unlockForm(true);
      }, CLEAR_MS);
    }, CLEAR_HOLD_MS);
  }

  // reveal + enable the X application steps (the whitelist payoff)
  function unlockForm(focusFirst) {
    solvedBadge.classList.add('show');
    if (formWrap) formWrap.classList.add('is-unlocked');
    stepBoxes.forEach(function (box) { box.disabled = false; });
    if (focusFirst) {
      var firstStep = document.getElementById('step-follow');
      if (firstStep) firstStep.focus();
    }
  }

  /* ---- new puzzle button: also re-rolls the image ---- */
  shuffleBtn.addEventListener('click', function () {
    clearTimeout(clearStampTimer);   // drop any in-flight クリア stamp
    // if they reshuffle mid-celebration, don't swallow the unlock they earned
    if (solved && formWrap && !formWrap.classList.contains('is-unlocked')) {
      unlockForm(false);
    }
    imageSrc = IMAGES[Math.floor(Math.random() * IMAGES.length)];
    thumb.src = imageSrc;
    if (lightboxImg) lightboxImg.src = imageSrc;
    buildBoard();
    shuffle();
  });

  /* ---- click-to-zoom reference image (lightbox) ---- */
  var lightbox = document.createElement('div');
  lightbox.className = 'thumb-zoom';
  var lightboxImg = document.createElement('img');
  lightboxImg.alt = thumb ? thumb.alt : 'Completed picture';
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);

  function openZoom() {
    lightboxImg.src = imageSrc;
    lightbox.classList.add('is-open');
  }
  function closeZoom() { lightbox.classList.remove('is-open'); }

  if (thumb) {
    thumb.style.cursor = 'zoom-in';
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.addEventListener('click', openZoom);
    thumb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(); }
    });
  }
  lightbox.addEventListener('click', closeZoom);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeZoom();
  });

  /* ---- X application steps (gated behind the solved puzzle) ---- */
  var stepsWrap = document.getElementById('wl-steps-wrap');
  var stepBoxes = Array.prototype.slice.call(
    document.querySelectorAll('#wl-steps input[type="checkbox"]')
  );

  // point the action buttons at the X intent links
  var followBtn = document.getElementById('step-follow');
  var likeBtn = document.getElementById('step-like');
  var replyBtn = document.getElementById('step-reply');
  if (followBtn) followBtn.href = 'https://x.com/intent/follow?screen_name=' + X_HANDLE;
  if (likeBtn)  likeBtn.href  = 'https://x.com/intent/like?tweet_id=' + TWEET_ID;
  if (replyBtn) replyBtn.href = 'https://x.com/intent/tweet?in_reply_to=' + TWEET_ID;

  stepBoxes.forEach(function (box) {
    box.addEventListener('change', function () {
      if (!solved) { box.checked = false; return; } // only after the puzzle
      var li = box.closest('.wl-step');
      if (li) li.classList.toggle('is-done', box.checked);

      var allDone = stepBoxes.every(function (b) { return b.checked; });
      if (allDone) {
        if (stepsWrap) stepsWrap.style.display = 'none';
        var success = document.getElementById('form-success');
        if (success) success.classList.add('show');
      }
    });
  });

  /* ---- init ---- */
  buildBoard();
  shuffle();
})();
