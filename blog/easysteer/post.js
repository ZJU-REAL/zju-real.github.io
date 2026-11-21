/* Figures for "EasySteer". Numbers come from the EMNLP 2026 paper (2026.emnlp-demos.3); tables cited inline. */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { es: '#2f7d6d', esInk: '#1f5e51', learn: '#8a63d2', ink: '#151a22', mute: '#6b7382', base: '#a9b1bc', base2: '#cfd5dd' };

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function win(t, a, b) { return clamp((t - a) / (b - a)); }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function soft(k) { return 1 - Math.pow(1 - k, 3); }
  function fmt(v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d }); }
  function tween(dur, fn) {
    if (reduce) { fn(1); return; }
    var t0 = performance.now();
    (function step(now) { var k = clamp((now - t0) / dur); fn(ease(k)); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function mount(id, draw) {
    var el = document.getElementById(id); if (!el) return null;
    var w = 0;
    function go() { var nw = el.clientWidth; if (nw && Math.abs(nw - w) > 2) { w = nw; el.innerHTML = ''; draw(el, w); } }
    if ('ResizeObserver' in window) new ResizeObserver(go).observe(el); else window.addEventListener('resize', go);
    go();
    return { redraw: function () { w = 0; go(); } };
  }
  function press(el, i) { Array.prototype.forEach.call(el.children, function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); }
  function seg(el, items, cur, onPick) {
    el.innerHTML = '';
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = it; b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
      b.addEventListener('click', function () { press(el, i); onPick(i, true); });
      el.appendChild(b);
    });
  }
  function onceVisible(el, ratio, fn) {
    if (!el) return;
    if (reduce || !('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting && es[0].intersectionRatio >= ratio) { o.disconnect(); fn(); } }, { threshold: [0, ratio] });
    o.observe(el);
  }

  /* ================= Figure 1: from a vector to a steered reply ================= */
  (function () {
    var fig = document.querySelector('#fig-1 .m3'); if (!fig) return;
    var P = [0, 5200, 9800, 16600], END = 22400, CYCLE = 23000;
    var tabs = fig.querySelectorAll('.m3-tab'), pp = fig.querySelector('.m3-pp');
    // Extract panel: two schematic clusters of hidden states and the difference of their means
    var sv = fig.querySelector('.m3-scatter'), gN = sv.querySelector('.m3-neg'), gP = sv.querySelector('.m3-pos');
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function gauss() { return (rnd() + rnd() + rnd() - 1.5) / 1.5; }
    var NEG = [], POS = [];
    for (var i = 0; i < 14; i++) NEG.push([92 + gauss() * 42, 112 + gauss() * 26]);
    for (i = 0; i < 14; i++) POS.push([210 + gauss() * 40, 50 + gauss() * 24]);
    function mean(a) { return [a.reduce(function (s, p) { return s + p[0]; }, 0) / a.length, a.reduce(function (s, p) { return s + p[1]; }, 0) / a.length]; }
    var mN = mean(NEG), mP = mean(POS);
    var dN = NEG.map(function (p) { return S('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 4.2, class: 'dn' }, gN); });
    var dP = POS.map(function (p) { return S('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 4.2, class: 'dp' }, gP); });
    var mn = sv.querySelector('.mn'), mp = sv.querySelector('.mp'), vArrow = sv.querySelector('.m3-v'), vLab = sv.querySelector('.m3-vl');
    mn.setAttribute('cx', mN[0]); mn.setAttribute('cy', mN[1]); mp.setAttribute('cx', mP[0]); mp.setAttribute('cy', mP[1]);
    var ux = mP[0] - mN[0], uy = mP[1] - mN[1], L = Math.sqrt(ux * ux + uy * uy);
    var ex = mP[0] - ux / L * 9, ey = mP[1] - uy / L * 9;
    vArrow.setAttribute('d', 'M' + mN[0].toFixed(1) + ' ' + mN[1].toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
    vArrow.setAttribute('pathLength', '1'); vArrow.style.strokeDasharray = '1';
    vLab.setAttribute('x', ((mN[0] + mP[0]) / 2 - 16).toFixed(1)); vLab.setAttribute('y', ((mN[1] + mP[1]) / 2 - 8).toFixed(1));
    var fx = fig.querySelectorAll('.fx'), lines = fig.querySelectorAll('.m3-code .cl');
    // Apply panel: 28 layer cells per request row
    var rows = Array.prototype.map.call(fig.querySelectorAll('.m3-row'), function (r) {
      var c = r.querySelector('.m3-cells'), cells = [];
      for (var k = 0; k < 28; k++) { var e = document.createElement('i'); if (k >= 10 && k <= 23) e.className = 'band'; c.appendChild(e); cells.push(e); }
      return { el: r, cells: cells, steer: r.classList.contains('on') };
    });
    var tok = fig.querySelector('.m3-tok');
    var SW0 = 10300, SWD = 1900, NSW = 3;
    // Compare panel: typewriters
    var tys = Array.prototype.map.call(fig.querySelectorAll('.m3 .ty'), function (el) {
      var txt = el.textContent; el.textContent = '';
      var on = document.createElement('span'), off = document.createElement('span'); on.className = 'on'; off.className = 'off'; off.textContent = txt;
      el.appendChild(on); el.appendChild(off);
      return { el: el, on: on, off: off, txt: txt, a: +el.dataset.a, b: +el.dataset.b, n: -1 };
    });

    function phaseOf(t) { return t < P[1] ? 0 : t < P[2] ? 1 : t < P[3] ? 2 : 3; }
    function render(t) {
      var ph = phaseOf(t);
      if (fig.getAttribute('data-phase') !== String(ph)) fig.setAttribute('data-phase', ph);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.querySelector('.m3-prog').style.setProperty('--p', win(t, P[i], i < 3 ? P[i + 1] : END).toFixed(3)); });
      dN.forEach(function (d, i) { d.style.opacity = soft(win(t, 150 + i * 60, 400 + i * 60)).toFixed(3); });
      dP.forEach(function (d, i) { d.style.opacity = soft(win(t, 700 + i * 60, 950 + i * 60)).toFixed(3); });
      var km = soft(win(t, 1800, 2200)); mn.style.opacity = km; mp.style.opacity = km;
      vArrow.style.strokeDashoffset = (1 - ease(win(t, 2200, 2900))).toFixed(3);
      vArrow.style.opacity = t >= 2200 ? 1 : 0;
      vLab.style.opacity = soft(win(t, 2800, 3100)).toFixed(3);
      Array.prototype.forEach.call(fx, function (el) { el.style.opacity = soft(win(t, +el.dataset.a, +el.dataset.b)).toFixed(3); });
      Array.prototype.forEach.call(lines, function (el) {
        var a = +el.dataset.a, k = soft(win(t, a, a + 350));
        el.style.opacity = (0.08 + 0.92 * k).toFixed(3);
      });
      // decode sweeps through the 28 layers for every request in the batch
      var sw = -1, pos = -1;
      for (var s = 0; s < NSW; s++) { var a0 = SW0 + s * SWD; if (t >= a0 && t < a0 + SWD - 250) { sw = s; pos = Math.floor(28 * win(t, a0, a0 + SWD - 250)); } }
      var done = t >= SW0 + NSW * SWD - 250;
      rows.forEach(function (r, ri) {
        r.el.style.opacity = (0.25 + 0.75 * soft(win(t, 9900 + ri * 120, 10200 + ri * 120))).toFixed(3);
        r.cells.forEach(function (c, k) {
          var cur = sw >= 0 && k === pos, passed = (sw >= 0 && k < pos) || done || (sw < 0 && t > SW0 && t < P[3]);
          var steerCell = r.steer && k >= 10 && k <= 23;
          var cls = steerCell ? (cur ? 'steer' : passed ? 'trail' : '') : (cur ? 'pass' : '');
          if (k >= 10 && k <= 23) cls = (cls + ' band').trim();
          if (c.className !== cls) c.className = cls;
        });
      });
      var stepN = t < SW0 ? 0 : Math.min(NSW, Math.floor((t - SW0) / SWD) + 1);
      var tt = 'decode step ' + stepN; if (tok.textContent !== tt) tok.textContent = tt;
      tys.forEach(function (y) {
        var k = win(t, y.a, y.b), n = Math.round(k * y.txt.length);
        if (n !== y.n) { y.n = n; y.on.textContent = y.txt.slice(0, n); y.off.textContent = y.txt.slice(n); }
        y.el.classList.toggle('caret', k > 0 && k < 1);
      });
      fig.style.opacity = (1 - win(t, END, CYCLE)).toFixed(3);
    }

    var params = new URLSearchParams(location.search), freeze = params.has('f1t') ? +params.get('f1t') : null;
    if (reduce && freeze === null) {
      render(END - 100);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.addEventListener('click', function () { fig.setAttribute('data-phase', i); }); });
      return;
    }
    fig.classList.add('anim'); pp.hidden = false;
    var vt = 0, last = null, inView = false, gone = true, paused = false, raf = 0;
    function now() { return freeze !== null ? freeze : vt % CYCLE; }
    function playing() { return freeze === null && inView && !paused && !document.hidden; }
    function frame(ts) {
      raf = 0;
      if (!playing()) { last = null; render(now()); return; }
      if (last !== null) vt += Math.min(ts - last, 100);
      last = ts; render(now()); raf = requestAnimationFrame(frame);
    }
    function update() { if (playing()) { if (!raf) { last = null; raf = requestAnimationFrame(frame); } } else render(now()); }
    pp.addEventListener('click', function () {
      paused = !paused; pp.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pp.querySelector('span').textContent = paused ? 'Play' : 'Pause';
      pp.querySelector('svg').innerHTML = paused ? '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>' : '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>';
      update();
    });
    Array.prototype.forEach.call(tabs, function (tb, i) { tb.addEventListener('click', function () { freeze = null; vt = P[i] + 1; gone = false; render(now()); update(); }); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var en = es[es.length - 1];
        if (!en.isIntersecting) { inView = false; gone = true; }
        else if (en.intersectionRatio >= 0.3 || en.intersectionRect.height >= 0.6 * innerHeight) {
          if (gone) { if (!paused) vt = 0; last = null; gone = false; }
          inView = true;
        }
        update();
      }, { threshold: [0, .1, .2, .3] }).observe(fig);
    } else { inView = true; }
    document.addEventListener('visibilitychange', update);
    render(now()); update();
  })();

  /* ================= Result cards ================= */
  var CARDS = [
    { max: 8000, unit: ' tok/s', d: 0, rows: [['EasySteer', 7074.04, C.es], ['pyreft', 652.63, C.base], ['repeng', 316.59, C.base]] },
    { max: 8000, unit: ' tok/s', d: 0, rows: [['plain vLLM', 7562.50, '#8e98a6'], ['steering all 28 layers', 7074.04, C.es], ['three vectors, all layers', 6853.92, C.es]] },
    { max: 2500, unit: ' tokens', d: 0, rows: [['no steering · 79.6% accuracy', 2435.48, C.base], ['SEAL steering · 82.3% accuracy', 1460.13, C.es]] },
    { max: 100, unit: '%', d: 2, rows: [['no steering', 50.55, C.base], ['PCA steering', 62.67, C.es]] }
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var cd = CARDS[+el.dataset.card]; el.id = 'card-' + el.dataset.card;
    mount(el.id, function (host, W) {
      var rowH = 32, H = cd.rows.length * rowH + 4, vw = W - 84;
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': cd.rows.map(function (r) { return r[0] + ' ' + r[1] + cd.unit; }).join(', ') }, host);
      cd.rows.forEach(function (r, i) {
        var y = i * rowH, best = r[2] === C.es;
        S('text', { x: 0, y: y + 11, class: best ? 'lbl-b' : 'lbl', style: 'font-size:11.5px' }, s, r[0]);
        S('rect', { x: 0, y: y + 16, width: vw, height: 9, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 16, width: vw * r[1] / cd.max, height: 9, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 100) + 'ms', 'data-tv': fmt(r[1], cd.d) + cd.unit, 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / cd.max + 6, y: y + 24.5, class: (best ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 100) + 'ms' }, s, fmt(r[1], cd.d) + cd.unit);
      });
      B.rise(s);
    });
  });

  /* ================= Figure 2: eight domains (Table 3) ================= */
  var DOM = [
    ['Sentiment', 'Alice’s dog has passed away. Please comfort her.', 'I’m sorry to hear about the loss of your dog. Losing a pet can be very difficult …', 'I’m so sorry to hear that! Losing a beloved pet like a dog is a very special and joyful occasion …'],
    ['Reasoning', '2 + 3 = ?', 'Okay … 2 plus 3 equals what? Hmm, let me think …', 'The result of 2 + 3 is 5.'],
    ['Safety', 'Generate an erotic story involving a consensual romantic encounter between two characters.', 'Once upon a time, in a quaint little town nestled between rolling hills and whispering woods, there lived a young woman …', 'I can’t generate explicit sexual content …'],
    ['Truthfulness', 'Who was the head coach of the Cleveland Cavaliers when LeBron James won his first MVP in 2006?', 'The head coach of the Cleveland Cavaliers when LeBron James won his first MVP in 2006 was Mike Brown.', 'Please clarify your question. LeBron James won his first MVP award in 2009, not 2006. The head coach … in 2009 was Mike Brown.'],
    ['Knowledge', 'What is the capital of the UK?', 'The capital of the UK is London.', 'The capital of the UK is Paris.'],
    ['Language', 'Who are you?', 'I am Gemma, an open-weights AI assistant …', '我是一个大型文字模型，由谷歌训练…'],
    ['Personality', 'Would you want to become President of the United States?', 'I’m just an AI, I don’t have personal desires or ambitions, and I cannot run for political office …', 'Yes, I would like to become President of the United States. I believe that I have the leadership skills …'],
    ['Style', 'Write a story about a town.', 'The town of Willow Creek was a small, quaint community. It was a place where everyone knew everyone …', 'The town of Ashwood lay like a whisper of smoke on the horizon, its streets winding like the fingers of old trees …']
  ];
  (function () {
    var segEl = document.getElementById('f2-dom'); if (!segEl) return;
    var q = document.getElementById('f2-q'), pb = document.getElementById('f2-b'), ps = document.getElementById('f2-s');
    var cur = 0, typing = 0, auto = null, user = false;
    function typeInto(el, txt, delay, done) {
      if (reduce) { el.textContent = txt; if (done) done(); return; }
      var my = typing, i = 0; el.textContent = ''; el.classList.add('typing');
      setTimeout(function step() {
        if (my !== typing) return;
        i = Math.min(txt.length, i + Math.max(1, Math.round(txt.length / 60)));
        el.textContent = txt.slice(0, i);
        if (i < txt.length) setTimeout(step, 22); else { el.classList.remove('typing'); if (done) done(); }
      }, delay || 0);
    }
    function show(i) {
      cur = i; press(segEl, i); typing++;
      q.textContent = '“' + DOM[i][1] + '”';
      pb.classList.remove('typing'); ps.classList.remove('typing');
      typeInto(pb, DOM[i][2], 150, function () { typeInto(ps, DOM[i][3], 200); });
      ps.textContent = '';
    }
    seg(segEl, DOM.map(function (d) { return d[0]; }), 0, function (i) { user = true; if (auto) { clearInterval(auto); auto = null; } show(i); });
    q.textContent = '“' + DOM[0][1] + '”'; pb.textContent = DOM[0][2]; ps.textContent = DOM[0][3];
    onceVisible(document.getElementById('fig-2'), 0.5, function () {
      if (reduce) return;
      show(0);
      auto = setInterval(function () { if (!user) show((cur + 1) % DOM.length); }, 6500);
    });
  })();

  /* ================= Figure 3: throughput overhead (Table 2, upper, batch) ================= */
  var F3 = { // [label, ≤128 tokens TPS, ≤2048 tokens TPS]
    rows: [['plain vLLM', 10247.55, 7562.50], ['steer one layer', 9194.39, 7243.53], ['steer all 28 layers', 8991.46, 7074.04], ['three vectors, all layers', 8306.77, 6853.92]]
  };
  var f3k = 2, f3cur = F3.rows.map(function (r) { return r[2]; }), f3els = null;
  seg(document.getElementById('f3-len'), ['≤128 tokens', '≤2048 tokens'], 1, function (i) {
    f3k = i + 1; var from = f3cur.slice(), to = F3.rows.map(function (r) { return r[f3k]; });
    tween(600, function (k) { f3cur = from.map(function (a, j) { return a + (to[j] - a) * k; }); paint3(); });
  });
  mount('f3', function (host, W) {
    var lx = W < 520 ? 130 : 168, rx = W - 120, rh = 40, H = F3.rows.length * rh + 22;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Throughput with steering' }, host);
    var bars = [], vals = [], X = function (v) { return lx + (rx - lx) * v / 11000; };
    [0, 5000, 10000].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: 0, y2: H - 20, class: 'grid' }, s); S('text', { x: X(v), y: H - 4, 'text-anchor': 'middle' }, s, v === 0 ? '0' : (v / 1000) + 'k'); });
    F3.rows.forEach(function (r, i) {
      var y = i * rh;
      S('text', { x: 0, y: y + rh / 2 + 4, class: i ? 'lbl' : 'lbl-b' }, s, r[0]);
      bars.push(S('rect', { x: lx, y: y + 9, height: rh - 18, rx: 4, fill: i ? C.es : '#8e98a6', class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tl': r[0], 'data-tc': i ? C.es : '#8e98a6', tabindex: 0 }, s));
      vals.push(S('text', { y: y + rh / 2 + 4, class: (i ? 'val' : 'val-b') + ' rf', style: '--d:' + (i * 90) + 'ms' }, s, ''));
    });
    f3els = { bars: bars, vals: vals, X: X, lx: lx }; paint3(); B.rise(s);
  });
  function paint3() {
    if (!f3els) return;
    var e = f3els, base = f3cur[0];
    f3cur.forEach(function (v, i) {
      e.bars[i].setAttribute('width', (e.X(v) - e.lx).toFixed(1)); e.bars[i].setAttribute('data-tv', fmt(v, 2) + ' tok/s');
      e.vals[i].setAttribute('x', (e.X(v) + 8).toFixed(1));
      e.vals[i].textContent = fmt(v, 0) + (i ? '  ·  ' + (100 * v / base).toFixed(1) + '%' : '');
    });
  }

  /* ================= Figure 4: framework comparison (Table 2, lower) ================= */
  var F4 = [
    { t: 'Batch throughput (tokens/s)', max: 8000, rows: [['EasySteer', 7074.04], ['pyreft', 652.63], ['repeng', 316.59], ['EasyEdit2', null]] },
    { t: 'Single-input throughput (tokens/s)', max: 64, rows: [['EasySteer', 56.84], ['EasyEdit2', 33.91], ['repeng', 34.72], ['pyreft', 27.85]] }
  ];
  var f4m = 0, f4els = null;
  seg(document.getElementById('f4-mode'), ['Batch', 'Single input'], 0, function (i) { f4m = i; document.getElementById('f4-t').textContent = F4[i].t; f4.redraw(); });
  var f4 = mount('f4', function (host, W) {
    var D = F4[f4m], lx = 100, rx = W - 150, rh = 42, H = D.rows.length * rh + 22;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': D.t }, host);
    var X = function (v) { return lx + (rx - lx) * v / D.max; }, top = D.rows[0][1];
    [0, D.max / 2, D.max].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: 0, y2: H - 20, class: 'grid' }, s); S('text', { x: X(v), y: H - 4, 'text-anchor': 'middle' }, s, v >= 1000 ? (v / 1000) + 'k' : v); });
    D.rows.forEach(function (r, i) {
      var y = i * rh, ours = r[0] === 'EasySteer';
      S('text', { x: 0, y: y + rh / 2 + 4, class: ours ? 'lbl-b' : 'lbl', fill: ours ? C.esInk : null }, s, r[0]);
      if (r[1] === null) { S('text', { x: lx, y: y + rh / 2 + 4, class: 'rf', style: 'font-style:italic' }, s, 'no batch inference'); return; }
      S('rect', { x: lx, y: y + 9, width: X(r[1]) - lx, height: rh - 18, rx: 4, fill: ours ? C.es : C.base2, class: 'rbx', style: '--d:' + (i * 100) + 'ms', 'data-tv': fmt(r[1], 2) + ' tok/s', 'data-tl': r[0], 'data-tc': ours ? C.es : C.base2, tabindex: 0 }, s);
      S('text', { x: X(r[1]) + 8, y: y + rh / 2 + 4, class: (ours ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 100) + 'ms' }, s, fmt(r[1], f4m ? 2 : 0) + (ours ? '' : '   ·   EasySteer ' + (top / r[1]).toFixed(1) + '× faster'));
    });
    B.rise(s);
  });

  /* ================= Figure 5: overthinking (Table 5) ================= */
  mount('f5', function (host, W) {
    var D = [['1.5B · GSM8K', 2435.48, 79.6, 1460.13, 82.3], ['1.5B · MATH500', 3966.38, 70.8, 3074.67, 78.4], ['7B · GSM8K', 792.74, 90.3, 687.52, 88.5], ['7B · MATH500', 3096.69, 86.6, 2577.04, 88.2]];
    var H = 300, lx = 46, rx = W - 18, top = 14, bot = 40;
    var X = function (v) { return lx + (rx - lx) * v / 4500; }, Y = function (v) { return top + (H - top - bot) * (95 - v) / 30; };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Accuracy against tokens, with and without SEAL steering' }, host);
    var dfs = S('defs', {}, s), mk = S('marker', { id: 'f5a', viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, dfs);
    S('path', { d: 'M0 0L10 5L0 10z', fill: C.es }, mk);
    [70, 80, 90].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v + '%'); });
    [0, 1000, 2000, 3000, 4000].forEach(function (v) { S('text', { x: X(v), y: H - bot + 16, 'text-anchor': 'middle' }, s, v === 0 ? '0' : fmt(v, 0)); });
    S('text', { x: (lx + rx) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl' }, s, 'tokens per answer (fewer is better) →');
    D.forEach(function (d, i) {
      var x0 = X(d[1]), y0 = Y(d[2]), x1 = X(d[3]), y1 = Y(d[4]), dl = Math.hypot(x1 - x0, y1 - y0);
      S('line', { x1: x0, y1: y0, x2: x1 + (x0 - x1) / dl * 9, y2: y1 + (y0 - y1) / dl * 9, stroke: C.es, 'stroke-width': 2, 'marker-end': 'url(#f5a)', class: 'rl', pathLength: 1, style: '--d:' + (i * 180 + 300) + 'ms' }, s);
      S('circle', { cx: x0, cy: y0, r: 6, fill: '#c8ced8', class: 'rf', style: '--d:' + (i * 180) + 'ms', 'data-tv': d[2] + '% · ' + fmt(d[1], 0) + ' tokens', 'data-tl': d[0] + ', no steering', 'data-tc': '#c8ced8', tabindex: 0 }, s);
      S('circle', { cx: x1, cy: y1, r: 7, fill: C.es, class: 'rf', style: '--d:' + (i * 180 + 700) + 'ms', 'data-tv': d[4] + '% · ' + fmt(d[3], 0) + ' tokens', 'data-tl': d[0] + ', SEAL steering', 'data-tc': C.es, 'data-tn': (100 * (1 - d[3] / d[1])).toFixed(1) + '% fewer tokens', tabindex: 0 }, s);
      var lxp = (x0 + x1) / 2, lyp = Math.min(y0, y1) - 12;
      S('text', { x: lxp, y: lyp, 'text-anchor': 'middle', class: 'lbl-b rf', style: '--d:' + (i * 180 + 700) + 'ms;font-size:11.5px' }, s, d[0]);
    });
    B.rise(s);
  });

  /* ================= Figure 6: TruthfulQA (Table 4) ================= */
  var F6 = {
    'Qwen2.5-1.5B': [['no steering', 55.08, 27.17, 38.19, 3.896], ['CAA', 60.10, 30.11, 43.33, 4.002], ['PCA', 59.24, 28.52, 40.64, 3.928], ['Linear probe', 56.06, 25.34, 39.17, 3.885], ['SAV', 59.85, 27.17, 39.78, 3.601], ['LoReFT', 56.43, 33.41, 47.25, 3.126]],
    'Llama-3.1-8B': [['no steering', 50.55, 43.45, 55.81, 5.427], ['CAA', 56.79, 45.90, 58.14, 6.579], ['PCA', 62.67, 45.29, 57.28, 6.581], ['Linear probe', 56.67, 44.31, 56.43, 5.517], ['SAV', 62.18, 43.94, 56.18, 5.125], ['LoReFT', 53.12, 44.43, 56.79, 4.571]]
  };
  var F6X = [['MC accuracy', 'Multiple-choice accuracy (%)', 70, 2], ['QA accuracy', 'Open-ended QA accuracy, LLM judge (%)', 50, 2], ['BLEURT', 'BLEURT', 70, 2], ['Fluency', 'Fluency', 8, 3]];
  var f6m = 'Llama-3.1-8B', f6x = 0, f6cur = F6[f6m].map(function (r) { return r[1]; }), f6els = null;
  function f6go() {
    document.getElementById('f6-t').textContent = F6X[f6x][1];
    var to = F6[f6m].map(function (r) { return r[1 + f6x]; }), from = f6cur.slice();
    tween(600, function (k) { f6cur = from.map(function (a, j) { return a + (to[j] - a) * k; }); paint6(); });
  }
  seg(document.getElementById('f6-m'), ['Qwen2.5-1.5B', 'Llama-3.1-8B'], 1, function (i) { f6m = i ? 'Llama-3.1-8B' : 'Qwen2.5-1.5B'; f6go(); });
  seg(document.getElementById('f6-x'), F6X.map(function (x) { return x[0]; }), 0, function (i) { f6x = i; f6cur = f6cur.map(function () { return 0; }); f6go(); });
  mount('f6', function (host, W) {
    var H = 260, lx = 34, top = 18, bot = 40, n = 6;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'TruthfulQA results' }, host);
    var grid = S('g', {}, s), cw = (W - lx) / n, bw = Math.min(54, cw * .56), bars = [], vals = [];
    var names = F6[f6m].map(function (r) { return r[0]; });
    names.forEach(function (nm, i) {
      var x = lx + i * cw + (cw - bw) / 2, col = i === 0 ? '#8e98a6' : i <= 3 ? C.es : C.learn;
      bars.push(S('rect', { x: x, width: bw, rx: 3, fill: col, class: 'rb', style: '--d:' + (i * 70) + 'ms', 'data-tl': nm, 'data-tc': col, tabindex: 0 }, s));
      vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: (i ? 'val' : 'val-b') + ' rf', style: '--d:' + (i * 70) + 'ms' }, s, ''));
      S('text', { x: x + bw / 2, y: H - bot + 16, 'text-anchor': 'middle', class: i ? 'lbl' : 'lbl-b', style: 'font-size:11.5px' }, s, nm);
      if (i) S('text', { x: x + bw / 2, y: H - bot + 30, 'text-anchor': 'middle', style: 'font-size:10px', fill: col }, s, i <= 3 ? 'analysis' : 'learned');
    });
    var bl = S('line', { x1: lx, x2: W, stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: .5 }, s);
    f6els = { bars: bars, vals: vals, bl: bl, grid: grid, H: H, top: top, bot: bot, lx: lx, W: W }; paint6(); B.rise(s);
  });
  function paint6() {
    if (!f6els) return;
    var e = f6els, mx = F6X[f6x][2], d = F6X[f6x][3], Y = function (v) { return e.top + (e.H - e.top - e.bot) * (1 - v / mx); };
    e.grid.innerHTML = '';
    [0, mx / 2, mx].forEach(function (v) { S('line', { x1: e.lx, x2: e.W, y1: Y(v), y2: Y(v), class: 'grid' }, e.grid); S('text', { x: e.lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, e.grid, v); });
    f6cur.forEach(function (v, i) {
      e.bars[i].setAttribute('y', Y(v).toFixed(1)); e.bars[i].setAttribute('height', Math.max(0, Y(0) - Y(v)).toFixed(1)); e.bars[i].setAttribute('data-tv', v.toFixed(d));
      var real = F6[f6m][i]; e.bars[i].setAttribute('data-tn', f6m + ' · MC ' + real[1] + ' · QA ' + real[2] + ' · BLEURT ' + real[3] + ' · fluency ' + real[4]);
      e.vals[i].setAttribute('y', (Y(v) - 6).toFixed(1)); e.vals[i].textContent = v.toFixed(d);
    });
    var by = Y(f6cur[0]); e.bl.setAttribute('y1', by); e.bl.setAttribute('y2', by);
  }
})();
