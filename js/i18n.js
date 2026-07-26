/* =========================================================
   Mr Benimaru — lightweight EN/JA i18n

   - Translatable elements carry data-i18n="key" (or data-i18n-ph for an
     input placeholder). English is the source of truth in the HTML; this
     script snapshots it on load and swaps in Japanese on demand.
   - The choice is saved in localStorage so it persists across pages.
   - The flag button (#lang-toggle) in the nav switches languages.
   - Game scripts read window.I18N.t(en) for their dynamic strings and may
     subscribe via window.I18N.onChange().
   ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'benimaru-lang';

  /* ---- static element translations, keyed by data-i18n ---- */
  var JA = {
    // nav (shared)
    'nav.skip': 'コンテンツへスキップ',
    'nav.home': 'ホーム',
    'nav.inspiration': 'インスピレーション',
    'nav.collection': 'インタラクション',
    'nav.whitelist': 'ホワイトリスト',
    // footer (shared)
    'footer.copy': '© 2026 Wabi Sabi Corporation.',

    // index
    'home.lead': 'フィールグッドNFTプロジェクト。<br>p5.jsで愛を込めてハンドコード。',
    'cta.whitelist': 'ホワイトリストに登録',
    'home.launch': '🌊 OpenSeaで見る',
    'home.stat.benimarus': 'ベニマルの数',
    'home.stat.mint': '未定',
    'home.stat.date': 'ミント日',
    'home.stat.free': '無料',
    'home.stat.price': 'WL価格',
    'home.intro.eyebrow': 'フェスティブ・ロード52番地より',
    'home.intro.h2': 'ベニマルごとに、新しい冒険を',
    'home.intro.lead': '愛された1970年代のテレビシリーズに着想を得て、それぞれのMr Benimaruは異なる衣装をまとい、異なる世界へと足を踏み入れます。すっきりとした線、あたたかいパステルカラー、そして紛れもないレトロな魅力。',

    // collection
    'col.eyebrow': 'ドアの向こうをのぞいてみよう',
    'col.h1': 'インタラクション',
    'col.lead': 'カルタをやりましょう！',
    'col.status': 'カードを覚えて…',
    'col.newgame': '新しいゲーム',
    'col.cta': '気に入ったら、ドアは開いています。',

    // inspiration
    'insp.eyebrow': 'これまでの物語',
    'insp.h1': 'インスピレーション',
    'insp.lead': 'Mr Benimaruの原点と、すべてが始まった魔法のドア。',
    'insp.p1': '子供の頃に夢中になったテレビ番組は、誰にでもひとつはあるのではないでしょうか？私にとって、それが<strong>Mr Benn</strong>でした。幼い日本の子供だった私は、この山高帽の英国紳士が仮装に着替え、着替え部屋のドアをくぐって、ダイバーや海賊、マジシャンとして幻想的な冒険へ出かける姿に、すっかり心を奪われていました。英国紳士Mr Bennは、私の子供時代のアイコンになったのです。自分の名前「ベニマル」が彼の名前と重なるのは、ただの偶然だったのでしょうか？言うまでもなく、英国で暮らし働くチャンスが訪れたとき、私はそれを両手でしっかりとつかみました！',
    'insp.p2': 'Mr Benimaruは、英国で暮らすごく普通の日本人男性の物語。ノスタルジックで、風変わりで、恥ずかしげもなく心温まるNFTコレクションです。ひとつひとつ丁寧に、p5.jsで愛を込めてハンドコードされています。',
    'insp.p3': 'それぞれの衣装は、Mr Benimaruの冒険の記録から切り取った一瞬のスナップショット。Mr Bennの名エピソードへのオマージュもあれば、より現代的な英国文化を垣間見せるものもあります。人気NFTプロジェクトへのトリビュートや、お気に入りのテレビ番組へのコスプレ挑戦も。同じ衣装はふたつとなく、どれも新しい何かをもたらす、唯一無二の1点ものです！',
    'insp.p4': 'アーティストであり、Wabi Sabiコーポレーション創業者のSteve Todorokiは、日本のビデオゲーム業界で20年間働いてきました。Xアカウントは<a href="https://x.com/SteveTodoro" target="_blank" rel="noopener">こちら</a>。「レジェンド」と呼ばれることもあるようですが、この界隈でその言葉がどれほど気軽に使われているかを見ると、話半分に聞いておくのがよいでしょう！個人的には、アートは上品に仕上がっていると思いますが、もちろん私の欲目です。',
    'insp.cap1': 'オリジナルのMr Benn——すべての原点。',
    'insp.cap2': '冒険ごとに、ひとつの衣装。',
    'insp.cap3': 'まるで魔法のように、店主が登場！',
    'insp.cap4': '学生時代を過ごした東京にて。',
    'insp.cap5': 'ヴィンテージなオリジナル、Mr Bennのキャラクター。',
    'insp.cap6': 'オンチェーン・ベニマル！',
    'insp.cap7': '早送りで——コードの一行ずつ、衣装が自ら描かれていきます。',
    'insp.cta': 'コレクションを見る →',

    // whitelist
    'wl.eyebrow': 'このドアの先にボットは通さない',
    'wl.h1': 'ホワイトリストに登録',
    'wl.lead': 'Mr Benimaruは Wabi Sabi Corp のジェネシスリリース。私たちの価値観に共鳴するデジタルアーティストとのコラボも、すでに進行中です。下のスライドパズルを解いて、今後のドロップに向けたホワイトリスト応募を送信しよう。またね！',
    'wl.newpuzzle': '新パズル',
    'wl.moves': '手数:',
    'wl.goal': '上の絵に合わせよう。',
    'wl.solved': '✓ 完成！応募フォームが解除されました。',
    'wl.lock1': '立入禁止',
    'wl.lock2': 'パズルを解いて解除',
    'wl.stepsh2': 'ホワイトリストまで3ステップ',
    'wl.stepssub': 'すべてX上で完結——フォームなし。各ステップを終えたらチェックを入れてね。',
    'wl.step1': 'Xで @MrBenimarusays をフォロー。',
    'wl.step1.cta': 'Xでフォロー →',
    'wl.step2': '固定ポストにいいね。',
    'wl.step2.cta': 'ポストにいいね →',
    'wl.step3': '固定ポストにウォレットアドレスを返信。',
    'wl.step3.cta': 'Xで返信 →',
    'wl.done': '完了',
    'wl.success.h2': 'エントリー完了！',
    'wl.success.body': '固定ポストへの返信は手作業で確認します。@MrBenimarusays をチェックしてね。',

    // 404
    'nf.eyebrow': 'コスチュームは見つかりません',
    'nf.h1': 'このドアはどこにも通じていません',
    'nf.lead': 'お探しのページは、別の冒険に出かけてしまったようです。着替え部屋のドアから帰りましょう。',
    'nf.cta': 'ホームへ戻る →'
  };

  /* ---- dynamic JS strings, keyed by their English source text ---- */
  var DYN_JA = {
    'Memorize the cards…': 'カードを覚えて…',
    'Click on any card.': '好きなカードをめくってね。',
    'Not a match. Try again.': '残念、もう一度。',
    'Nice — keep going.': 'いいね、その調子！',
    'One pair to go…': 'あと1ペア…',
    'You found them all! 🎉 Press New Game to play again.': '全部そろった！🎉 もう一度遊ぶには「新しいゲーム」を押してね。',
    'You found them all! 🎉': '全部そろった！🎉',
    'Please enter a valid email address.': '有効なメールアドレスを入力してください。',
    'Please enter your X / Twitter handle.': 'X / Twitter ハンドルを入力してください。',
    'Please enter your wallet address.': 'ウォレットアドレスを入力してください。'
  };

  /* Japanese-first: every visitor starts in 日本語; switching to English is
     remembered across pages/visits. (The HTML stays English — it's the
     translation source of truth and the no-JS fallback.) */
  var lang = 'ja';
  try { if (localStorage.getItem(STORE_KEY) === 'en') lang = 'en'; } catch (e) {}

  /* ---- English baselines, captured once ---- */
  var baseHTML = new Map();
  var basePH = new Map();
  function snapshot() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      baseHTML.set(el, el.innerHTML);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      basePH.set(el, el.getAttribute('placeholder') || '');
    });
  }

  function apply() {
    document.documentElement.lang = lang;
    baseHTML.forEach(function (en, el) {
      var key = el.getAttribute('data-i18n');
      el.innerHTML = (lang === 'ja' && JA[key] != null) ? JA[key] : en;
    });
    basePH.forEach(function (en, el) {
      var key = el.getAttribute('data-i18n-ph');
      el.setAttribute('placeholder', (lang === 'ja' && JA[key] != null) ? JA[key] : en);
    });
    updateToggle();
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
  }

  var btn;
  function updateToggle() {
    if (!btn) return;
    var toJa = lang === 'en';               // button shows the language you switch TO
    var flag = btn.querySelector('.lang-toggle__flag');
    var label = btn.querySelector('.lang-toggle__label');
    if (flag) flag.textContent = toJa ? '🇯🇵' : '🇬🇧';
    if (label) label.textContent = toJa ? '日本語' : 'English';
    btn.setAttribute('aria-label', toJa ? 'Switch to Japanese' : 'Switch to English');
    btn.setAttribute('aria-pressed', lang === 'ja' ? 'true' : 'false');
  }

  function setLang(next) {
    lang = next === 'ja' ? 'ja' : 'en';
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    apply();
  }

  /* ---- public API for the game scripts ---- */
  window.I18N = {
    get lang() { return lang; },
    t: function (en) { return (lang === 'ja' && DYN_JA[en] != null) ? DYN_JA[en] : en; },
    onChange: function (cb) { document.addEventListener('i18n:change', cb); }
  };

  function init() {
    btn = document.getElementById('lang-toggle');
    if (btn) btn.addEventListener('click', function () {
      setLang(lang === 'en' ? 'ja' : 'en');
    });
    snapshot();
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
