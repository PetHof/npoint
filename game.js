(function () {
  "use strict";

  var COUNT = 15, PITCH = 96;                    // block pitch measured from the recording; 87px blocks
  var COLS_PORTRAIT = 3;                         // phone held upright: 3 columns x 5 rows (2 would give a tall 2 x 8 grid)
  var STORE_L = "npoint.scores.v1", STORE_P = "npoint.scores.portrait.v1", NAME_KEY = "npoint.name", MUTE_KEY = "npoint.mute";
  var mode = "l", SW = 616, SH = 352;            // mode "l" = landscape layout, "p" = portrait layout (stage size in stage units)

  // [upper bound s, level comment (from popoint.php), cell colour, text colour, result-screen text]
  var TIERS = [
    [3,  "godlike / cheating beotch", "#010101", "#fff", "You Cheating BEOTCH!!"],
    [4,  "sucka sucka ma balls",      "#01FF01", "#000", "Sucka sucka ma balls"],
    [5,  "dude impossible",           "#FFFF01", "#000", "Dude... impossible"],
    [6,  "ur a freak",                "#FFB701", "#000", "Ur a freak"],
    [7,  "that shit is wack",         "#FF5C01", "#000", "That shit is wack"],
    [8,  "damm homie, nice",          "#FF2801", "#000", "Damm homie... nice"],
    [9,  "almost there",              "#9D1E01", "#fff", "Almost there"],
    [10, "not bad",                   "#4F1101", "#fff", "Not bad"],
    [11, "not so hot",                "#0101C8", "#fff", "Not so hot"],
    [12, "forget how to count",       "#010187", "#fff", "Forget how to count"],
    [13, "wake me when ur done",      "#010138", "#fff", "Wake me when ur done"],
    [Infinity, "that sucked",         "#FFAAC1", "#000", "That sucked"]
  ];

  // Scores visible in the 2007 screenshots = starting highscore.
  var SEED = [
    { name: "Mr.Twain", time: 2.96,  date: "2007-09-18 20:50:05" },
    { name: "Peter",    time: 3.599, date: "2007-09-01 03:12:14" },
    { name: "Chris",    time: 3.954, date: "2007-08-31 20:37:22" },
    { name: "m1ng",     time: 4.259, date: "2007-08-31 21:48:41" },
    { name: "no6ody",   time: 4.344, date: "2007-08-31 20:34:35" },
    { name: "ili",      time: 4.444, date: "2007-08-30 17:49:12" },
    { name: "Max",      time: 4.618, date: "2007-08-31 01:51:50" },
    { name: "Basdi",    time: 4.929, date: "2007-09-02 23:59:35" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), wrap = $("wrap");
  var screens = { pre: $("s-pre"), ready: $("s-ready"), game: $("s-game"), res: $("s-res") };
  var nameIn = $("pname"), playerName = "";

  function tier(t) { for (var i = 0; i < TIERS.length; i++) if (t < TIERS[i][0]) return TIERS[i]; }
  function show(which) { for (var k in screens) screens[k].hidden = (k !== which); stage.setAttribute("data-screen", which); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------- scaling (keeps the 616x352 layout on any screen width) ----------
  // Phones: landscape = stage fills the screen; portrait = "please rotate" screen (browsers can't force landscape on iOS).
  var portraitOk = false;
  function isTouch() {
    return (window.matchMedia && matchMedia("(pointer: coarse)").matches) || (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  }
  var lastW = 0, DEBUG = /[?&]debug/.test(location.search), dbgEl = null;
  function dbg(t) {
    if (!dbgEl) {
      dbgEl = document.createElement("div");
      dbgEl.style.cssText = "position:fixed;left:4px;top:4px;z-index:99;background:rgba(0,0,0,.75);color:#0f0;font:11px/1.3 monospace;padding:4px 6px;max-width:90vw;pointer-events:none";
      document.body.appendChild(dbgEl);
    }
    dbgEl.textContent = t;
  }
  function fit() {
    // While the keyboard is open (name field focused) iOS shrinks the visible height: keep the layout as it is.
    var ae = document.activeElement;
    if (ae && ae.tagName === "INPUT" && innerWidth === lastW) return;
    lastW = innerWidth;
    var touch = isTouch(), portrait = innerHeight > innerWidth;
    var full = touch && Math.min(innerWidth, innerHeight) <= 500;          // phone: the game fills the whole screen
    var newMode = (full && portrait) ? "p" : "l";
    document.body.classList.toggle("ls", full);
    document.body.classList.toggle("pt", newMode === "p");
    $("rot").hidden = true;
    if (newMode !== mode) {
      mode = newMode;
      // the layout changed (phone turned): a running countdown/round can't continue, go back to the start screen
      if (!screens.game.hidden || !screens.ready.hidden) { clearTimeout(cdTimer); locked = true; show("pre"); }
    }
    if (mode === "p") { SW = 360; SH = (Math.ceil(COUNT / COLS_PORTRAIT) - 1) * PITCH + 87 + 52; } else { SW = 616; SH = 352; }
    stage.style.width = SW + "px"; stage.style.height = SH + "px";
    // CSS pins #wrap to the real visible area (position:fixed) on phones; the stage is scaled and centred INSIDE that box
    // using the box's own size, so size and centring can never disagree with each other.
    var bw = wrap.clientWidth, bh = wrap.clientHeight, s;
    if (full) {
      s = Math.min(bw / SW, bh / SH);
      stage.style.left = ((bw - SW * s) / 2) + "px"; stage.style.top = ((bh - SH * s) / 2) + "px";
    } else {
      s = bw / SW; stage.style.left = "0px"; stage.style.top = "0px";
    }
    stage.style.transform = "scale(" + s + ")";
    if (DEBUG) dbg("v33 " + (full ? "PHONE-" + mode : "desktop") + "  win " + innerWidth + "x" + innerHeight + "  box " + bw + "x" + bh +
      "  stage " + SW + "x" + SH + "  standalone " + (navigator.standalone === true) +
      "  scale " + s.toFixed(3) + "  left " + Math.round(parseFloat(stage.style.left)) + "  top " + Math.round(parseFloat(stage.style.top)));
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", function () {
    // iOS home-screen apps can keep a stale layout/touch offset after rotating. A fresh load after the turn clears it.
    var standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    if (standalone) { setTimeout(function () { location.reload(); }, 400); return; }
    [250, 700, 1400].forEach(function (t) { setTimeout(fit, t); });
  });
  $("rotSkip").addEventListener("click", function (e) { e.preventDefault(); portraitOk = true; fit(); });
  // iOS reports the final window size a moment after start. Re-measure until it stops changing, THEN show the stage.
  var lastSig = "", stable = 0, tries = 0;
  function settle() {
    fit();
    var sig = innerWidth + "x" + innerHeight + "|" + stage.style.transform + "|" + stage.style.left + "|" + stage.style.top;
    stable = (sig === lastSig) ? stable + 1 : 0; lastSig = sig; tries++;
    if (stable >= 3 || tries > 16) document.documentElement.classList.remove("boot");
    else setTimeout(settle, 60);
  }
  settle();
  window.addEventListener("load", function () { setTimeout(fit, 300); });

  // ---------- drifting rings ----------
  var rings = [];
  for (var r = 0; r < 2; r++) {
    var el = document.createElement("div"); el.className = "ring"; $("rings").appendChild(el); rings.push(el);
    el.style.left = rnd(0, SW - 20) + "px"; el.style.top = rnd(0, SH - 20) + "px";
  }
  setInterval(function () {
    rings.forEach(function (el) { el.style.left = rnd(-10, SW - 6) + "px"; el.style.top = rnd(-10, SH - 12) + "px"; });
  }, 3200);

  // ---------- sound (everything is generated here in the browser) ----------
  var ac = null, muted = false, musicTimer = null, step = 0;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}
  // iOS plays Web Audio on the "ringer" channel, so the silent switch mutes it. Two fixes, both must run inside a tap:
  // 1) audioSession "playback" (iOS 16.4+), 2) a looping silent <audio> element (older iOS) – media elements ignore the switch.
  var keepAlive = null;
  function unlockIOSAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (keepAlive) return;
    try {
      var n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      var w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true);
      v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);           // 0.1 s of silence
      keepAlive = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
      keepAlive.loop = true; keepAlive.setAttribute("playsinline", "");
      var p = keepAlive.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function audio() {
    unlockIOSAudio();
    if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state !== "running") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, when) {
    if (muted || !ac) return;
    var t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol) {
    if (muted || !ac) return;
    var n = ac.sampleRate * dur, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "lowpass"; f.frequency.value = 500; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
  }
  // ---------- music: an original composition, generated in the browser (140 BPM, A minor) ----------
  // Written for this game; free to use (CC0). Driving eighth-note pulse, heavy bass, steady full intensity.
  var BPM = 140, STEP = 60 / BPM / 4, BAR = STEP * 16, MUSIC_VOL = 0.4;
  var midiHz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  // 8 bars: Am  F  C  G | Am  F  G  E   (r = bass root, c = chord tones, last bar is E major to pull back into Am)
  var PROG = [
    { r: 45, c: [57, 60, 64] }, { r: 41, c: [57, 60, 65] }, { r: 48, c: [55, 60, 64] }, { r: 43, c: [55, 59, 62] },
    { r: 45, c: [57, 60, 64] }, { r: 41, c: [57, 60, 65] }, { r: 43, c: [55, 59, 62] }, { r: 40, c: [56, 59, 64] }
  ];
  var BASS8 = [0, 0, 12, 0, 0, 0, 12, 0];                       // bass on every eighth note: root, root, octave, root ...
  var HOOK = [                                                  // melody for bars 5-8: [16th step, midi note, length in steps]
    [[0, 81, 3], [4, 84, 2], [6, 81, 2], [8, 79, 4], [12, 76, 4]],
    [[0, 77, 3], [4, 81, 2], [6, 77, 2], [8, 76, 4], [12, 72, 4]],
    [[0, 79, 3], [4, 83, 2], [6, 79, 2], [8, 76, 4], [12, 74, 4]],
    [[0, 76, 3], [4, 80, 2], [6, 83, 2], [8, 80, 4], [12, 76, 4]]
  ];
  function mNote(c, dest, t, f, dur, type, vol, cut) {
    var o = c.createOscillator(), g = c.createGain(), out = g;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (cut) { var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cut; o.connect(lp); lp.connect(g); }
    else o.connect(g);
    out.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  }
  function mNoise(c) {
    if (c.__nb) return c.__nb;
    var n = Math.floor(c.sampleRate * 0.4), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (c.__nb = b);
  }
  function mKick(c, dest, t) {
    var o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.23);
  }
  function mTom(c, dest, t) {                              // deep "taiko" hit
    var o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.18);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.33);
  }
  function mHat(c, dest, t, vol) {
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = mNoise(c); f.type = "highpass"; f.frequency.value = 6500;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.06);
  }
  function mSnare(c, dest, t) {
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = mNoise(c); f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.18);
    mNote(c, dest, t, 185, 0.1, "triangle", 0.2);
  }
  function scheduleBar(c, dest, bar, t0) {
    var bi = bar % 8, p = PROG[bi], st;
    for (st = 0; st < 16; st++) {
      var t = t0 + st * STEP, eighth = st % 2 === 0;
      if (st % 4 === 0) mKick(c, dest, t);
      if (st === 4 || st === 12) mSnare(c, dest, t);
      if (st === 10 || st === 14) mTom(c, dest, t);
      if (st % 4 === 2) mHat(c, dest, t, 0.22); else if (st % 2 === 1) mHat(c, dest, t, 0.08);
      if (eighth) {
        var bo = BASS8[st / 2];
        mNote(c, dest, t, midiHz(p.r + bo), STEP * 1.8, "sawtooth", 0.1, 420);      // driving bass pulse
        mNote(c, dest, t, midiHz(p.r + bo - 12), STEP * 1.9, "sine", 0.42);          // sub layer
        var tones = [p.c[0], p.c[1], p.c[2], p.c[1]];
        mNote(c, dest, t, midiHz(tones[(st / 2) % 4] + 12), STEP * 1.1, "sawtooth", 0.06, 3600);   // staccato string-like ostinato
      }
    }
    p.c.forEach(function (n) { mNote(c, dest, t0, midiHz(n + 12), STEP * 3, "sawtooth", 0.035, 2600); });   // chord stab on beat 1
    if (bi >= 4) HOOK[bi - 4].forEach(function (h) { mNote(c, dest, t0 + h[0] * STEP, midiHz(h[1]), h[2] * STEP * 0.95, "sawtooth", 0.07, 4200); });
  }
  if (DEBUG) window.__music = { scheduleBar: scheduleBar, BAR: BAR };   // lets the debug page render the track offline

  var musicGain = null, musicNext = 0, barIdx = 0, musicTimer = null;
  function pumpMusic() {                                  // keeps ~0.7 s of music scheduled ahead of the clock
    while (musicNext < ac.currentTime + 0.7) { scheduleBar(ac, musicGain, barIdx++, musicNext); musicNext += BAR; }
  }
  function startMusic() {
    if (musicGain || !ac) return;
    musicGain = ac.createGain(); musicGain.gain.value = muted ? 0 : MUSIC_VOL; musicGain.connect(ac.destination);
    musicNext = ac.currentTime + 0.1; pumpMusic(); musicTimer = setInterval(pumpMusic, 150);
  }
  function setMute(m) {
    muted = m; try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) {}
    if (musicGain) musicGain.gain.value = m ? 0 : MUSIC_VOL;
    $("mute").textContent = "sound: " + (m ? "off" : "on");
  }
  $("mute").addEventListener("click", function (e) { e.preventDefault(); audio(); setMute(!muted); });
  setMute(muted);

  // ---------- game flow ----------
  var next, startTime, finalTime, sent, cdTimer, locked, gameMode = "l", viewMode = "l", lastName = "";

  function toReady() {
    show("ready"); locked = true;
    var n = 4, gr = $("gr"), cd = $("cd");
    var X = { 4: .18 * SW, 3: .326 * SW, 2: .539 * SW, 1: .776 * SW };   // horizontal centre of the number per count, from the recording
    gr.classList.remove("in"); cd.classList.remove("glide"); cd.style.left = X[4] + "px";
    void gr.offsetWidth;                              // restart the slide-in
    gr.classList.add("in");
    function tick() {
      if (n === 0) { startRound(); return; }
      cd.textContent = n;
      if (n < 4) cd.classList.add("glide");
      cd.style.left = X[n] + "px";
      tone(n === 1 ? 880 : 520, 0.15, "square", 0.05);
      n--; cdTimer = setTimeout(tick, 900);
    }
    tick();
  }

  function startRound() {
    var order = []; for (var i = 1; i <= COUNT; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var g = screens.game; g.innerHTML = "";
    gameMode = mode;
    var cols = mode === "p" ? COLS_PORTRAIT : 5, rows = Math.ceil(COUNT / cols);
    var X0 = Math.round((SW - ((cols - 1) * PITCH + 87)) / 2), Y0 = Math.round((SH - ((rows - 1) * PITCH + 87)) / 2);   // centred
    order.forEach(function (n, idx) {
      var b = document.createElement("button");
      b.className = "blk " + (n <= 5 ? "w" : n <= 10 ? "g" : "y");
      b.textContent = n; b.dataset.n = n;
      b.style.left = (X0 + (idx % cols) * PITCH) + "px";
      b.style.top = (Y0 + Math.floor(idx / cols) * PITCH) + "px";
      g.appendChild(b);
    });
    next = 1; sent = false; locked = false;
    show("game");
    startTime = performance.now();               // clock runs from the moment the blocks appear
  }

  var flashTimer;
  function wrong() {
    noise(0.35, 0.5);
    var f = $("flash"); f.hidden = false;
    clearTimeout(flashTimer); flashTimer = setTimeout(function () { f.hidden = true; }, 220);
  }

  screens.game.addEventListener("pointerdown", function (e) {
    if (locked) return;
    var b = e.target.closest(".blk");
    if (!b || b.classList.contains("gone")) { wrong(); return; }   // clicking beside the blocks also counts as a miss
    var n = +b.dataset.n;
    if (n !== next) { wrong(); return; }
    b.classList.add("gone");
    tone(500 + n * 40, 0.08, "sine", 0.12);
    next++;
    if (next > COUNT) finish();
  });

  var fmt = function (x) { return String(Math.round(x * 1000) / 1000); };
  function showStatus(res) {
    var el = $("status"), txt, cls = "";
    if (!res.ok) { txt = "Could not save the score (storage blocked or private mode)."; cls = "bad"; }
    else if (res.st === "new") { txt = "Added to the highscore \u00B7 rank " + res.rank; cls = "good"; }
    else if (res.st === "better") { txt = "New personal best! " + fmt(res.prev - finalTime) + " s faster (before: " + res.prev + " s) \u00B7 rank " + res.rank; cls = "good"; }
    else if (finalTime === res.prev) { txt = "Same as your best (" + res.prev + " s) \u00B7 rank " + res.rank; }
    else { txt = "+" + fmt(finalTime - res.prev) + " s slower than your best (" + res.prev + " s) \u00B7 rank " + res.rank; cls = "bad"; }
    el.textContent = txt; el.className = cls;
  }
  function finish() {
    finalTime = Math.round(performance.now() - startTime) / 1000;
    locked = true;
    var t = tier(finalTime);
    $("msg").textContent = "You Clicked all the blocks\nin " + finalTime + " seconds\n\n" + t[4];
    var res = submit(gameMode, playerName, finalTime);       // the name was asked before the round: compare + save automatically
    lastName = playerName; viewMode = gameMode;
    showStatus(res); render();
    $("whoName").textContent = playerName;
    show("res");
    [523, 659, 784].forEach(function (f, i) { tone(f, 0.18, "triangle", 0.1, i * 0.12); });
  }

  function startGame() {
    var name = nameIn.value.trim();
    if (!name || name === "Playername") {                    // a name is needed so the time can be compared and saved
      nameIn.classList.add("bad"); nameIn.focus();
      setTimeout(function () { nameIn.classList.remove("bad"); }, 1200);
      return;
    }
    playerName = name;
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    nameIn.blur();                                           // closes the iOS keyboard
    audio(); startMusic(); toReady();
  }
  $("play").addEventListener("click", startGame);
  nameIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); startGame(); } });
  $("again").addEventListener("click", function () { audio(); toReady(); });

  // ---------- highscore (local; replace load/save/submit with server calls later) ----------
  var keyOf = function (m) { return m === "p" ? STORE_P : STORE_L; };
  // Landscape keeps the 2007 scores; the portrait list starts empty (the original game was landscape only).
  // Stored data is untrusted (anyone can edit their own localStorage): only accept well-formed entries, clamp the lengths.
  function load(m) {
    try {
      var raw = localStorage.getItem(keyOf(m));
      if (raw) {
        var a = JSON.parse(raw);
        if (Array.isArray(a)) {
          return a.filter(function (e) {
            return e && typeof e.name === "string" && e.name.length > 0 && typeof e.time === "number" && isFinite(e.time) && e.time > 0;
          }).slice(0, 500).map(function (e) {
            return { name: e.name.slice(0, 20), time: Math.round(e.time * 1000) / 1000, date: String(e.date || "").slice(0, 19) };
          });
        }
      }
    } catch (e) {}
    return m === "p" ? [] : SEED.slice();
  }
  // returns true only if the data can really be read back (storage can be blocked or full on some phones)
  function save(m, list) {
    try { var str = JSON.stringify(list); localStorage.setItem(keyOf(m), str); return localStorage.getItem(keyOf(m)) === str; }
    catch (e) { return false; }
  }
  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  // Original rule: one entry per name; only a better time replaces the old one; "Playername" is ignored.
  // Returns what happened so the player is told: "new", "better" or "worse" (not better than their best), plus whether it was saved.
  function submit(m, name, time) {
    var list = load(m), st = "new", prev = null, found = false, i;
    for (i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        found = true; prev = list[i].time;
        if (time < prev) { list[i] = { name: name, time: time, date: stamp() }; st = "better"; } else st = "worse";
        break;
      }
    }
    if (!found) list.push({ name: name, time: time, date: stamp() });
    var ok = st === "worse" ? true : save(m, list);
    var sorted = list.slice().sort(function (a, b) { return a.time - b.time; }), rank = 0;
    for (i = 0; i < sorted.length; i++) if (sorted[i].name === name) { rank = i + 1; break; }
    return { st: st, prev: prev, ok: ok, rank: rank };
  }

  function render() {
    $("tabL").classList.toggle("on", viewMode === "l"); $("tabP").classList.toggle("on", viewMode === "p");
    var list = load(viewMode).sort(function (a, b) { return a.time - b.time; }), body = $("scores");
    body.innerHTML = "";
    list.forEach(function (s, i) {
      var t = tier(s.time), tr = document.createElement("tr");
      tr.className = (i === 0 ? "first" : "") + (lastName && s.name === lastName ? " me" : "");
      [(i + 1) + ". " + s.name, String(s.time), t[1], s.date].forEach(function (txt, c) {
        var td = document.createElement("td");
        td.textContent = txt;                              // textContent: names can't inject HTML
        if (c === 2) { td.style.background = t[2]; td.style.color = t[3]; }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  try { var saved = localStorage.getItem(NAME_KEY); if (saved) nameIn.value = saved.slice(0, 20); } catch (e) {}
  $("chgName").addEventListener("click", function (e) {
    e.preventDefault(); show("pre"); nameIn.focus(); try { nameIn.select(); } catch (err) {}
  });
  $("refresh").addEventListener("click", function (e) { e.preventDefault(); render(); });
  $("menuBtn").addEventListener("click", function () { viewMode = mode; $("hsNote").textContent = ""; render(); document.body.classList.add("menu"); });
  $("tabL").addEventListener("click", function (e) { e.preventDefault(); viewMode = "l"; render(); });
  $("tabP").addEventListener("click", function (e) { e.preventDefault(); viewMode = "p"; render(); });
  $("closeMenu").addEventListener("click", function (e) { e.preventDefault(); document.body.classList.remove("menu"); });
  $("reset").addEventListener("click", function (e) {
    e.preventDefault();
    var msg = viewMode === "p" ? "Clear the portrait highscore?" : "Reset the landscape highscore to the 2007 scores?";
    if (confirm(msg)) { try { localStorage.removeItem(keyOf(viewMode)); } catch (err) {} render(); }
  });

  // ---------- fullscreen ----------
  // Android/desktop: Fullscreen API. iPhone Safari has none for web pages: only "Add to Home Screen" gives a bar-free app.
  var root = document.documentElement;
  var reqFS = root.requestFullscreen || root.webkitRequestFullscreen;
  var inFS = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
  if (reqFS && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) $("fsWrap").hidden = false;
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && !navigator.standalone && $("fsWrap").hidden) { $("iosHint").hidden = false; $("rotTip").hidden = false; }
  // Visible hint on the start screen: phones in a normal browser are told how to get the bar-free fullscreen app.
  (function () {
    var standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    var phone = isTouch() && Math.min(screen.width, screen.height) <= 500, gone = false;
    try { gone = localStorage.getItem("npoint.a2hs") === "1"; } catch (e) {}
    if (!phone || standalone || gone) return;
    $("a2hsTxt").textContent = isIOS ? "Fullscreen: tap Share, then \u201CAdd to Home Screen\u201D."
                                     : "Fullscreen: browser menu \u22EE, then \u201CAdd to Home screen\u201D.";
    $("a2hs").hidden = false;
    $("a2hsX").addEventListener("click", function (e) {
      e.preventDefault(); $("a2hs").hidden = true;
      try { localStorage.setItem("npoint.a2hs", "1"); } catch (err) {}
    });
  })();
  $("fs").addEventListener("click", function (e) {
    e.preventDefault();
    try {
      if (inFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        var p = reqFS.call(root); if (p && p.catch) p.catch(function () {});
        try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {}); } catch (err) {}
      }
    } catch (err) {}
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (ev) {
    document.addEventListener(ev, function () { $("fs").textContent = inFS() ? "exit fullscreen" : "fullscreen"; setTimeout(fit, 150); });
  });

  show("pre");
  render();
})();
