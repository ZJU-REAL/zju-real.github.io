/* Figures for "GPD". Numbers come from arXiv:2610.12355 (tables and figures cited inline). */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { gp: '#b5653a', gpInk: '#8f4a26', grpo: '#8fa3b8', opsd: '#c9b8dd', base: '#c6ccd4', ink: '#151a22', mute: '#6b7382', sem: '#2e7d5b' };

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function win(t, a, b) { return clamp((t - a) / (b - a)); }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function soft(k) { return 1 - Math.pow(1 - k, 3); }
  function fmt(v, d) { return v.toFixed(d === undefined ? 1 : d); }
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
      b.addEventListener('click', function () { press(el, i); onPick(i); });
      el.appendChild(b);
    });
  }

  /* ================= Figure 1: route, student, teacher, update ================= */
  (function () {
    var fig = document.querySelector('#fig-1 .m4'); if (!fig) return;
    var P = [0, 5600, 10400, 16400], END = 21800, CYCLE = 22400;
    var tabs = fig.querySelectorAll('.m4-tab'), pp = fig.querySelector('.m4-pp');
    var Q = [ // example questions; routes follow the paper's routing analysis (Figure 5, right)
      ['counting', 'How many chairs are in this room?', ['Semantics']],
      ['distance', 'How far apart are the bicycle and the guitar, in meters?', ['Depth']],
      ['room size', 'What is the size of this room, in square meters?', ['BEV']],
      ['direction', 'Facing the chair, is the microwave on its left or right?', ['Semantics', 'BEV']]
    ];
    var routeEl = document.getElementById('m4-route'), qs = [];
    Q.forEach(function (q, i) {
      var r = document.createElement('div'); r.className = 'm4-rq';
      r.innerHTML = '<span class="q"><b>' + q[0] + '</b>' + q[1] + '</span><span class="m4-mods">' + ['Depth', 'Semantics', 'BEV'].map(function (m) { return '<i class="m4-mod" data-m="' + m + '">' + m + '</i>'; }).join('') + '</span>';
      routeEl.appendChild(r);
      qs.push({ el: r, mods: r.querySelectorAll('.m4-mod'), on: q[2], a: 300 + i * 650 });
    });
    var ANS = ['A', 'B', 'A', 'A', 'B', 'A', 'B', 'A'], rollsEl = document.getElementById('m4-rolls'), rolls = [];
    ANS.forEach(function (a, i) {
      var d = document.createElement('div'); d.className = 'm4-roll';
      d.innerHTML = '<span>#' + (i + 1) + '</span><b>' + a + '</b><span class="r"></span>';
      rollsEl.appendChild(d); rolls.push({ el: d, r: d.querySelector('.r'), ok: a === 'B' });
    });
    var TOK = [ // the paper's Figure 3 trajectory, abridged; agreement falls where the reasoning goes astray
      ['bed is on the right side of the room, near the wall.', .92], ['chair is at the desk in the center, also near the bed.', .86],
      ['microwave is in the kitchen on the other side of the room.', .74], ['If I stand near the bed and face the chair, I am looking toward the desk.', .58],
      ['From this view, the kitchen appears off to the right,', .26], ['so the microwave should be on the chair’s right.', .1], ['Therefore, the answer is A.', .05]
    ];
    var toksEl = document.getElementById('m4-toks'), toks = [];
    TOK.forEach(function (ph, pi) {
      ph[0].split(' ').forEach(function (w, wi) {
        var s = document.createElement('span'); s.textContent = w; toksEl.appendChild(s); toksEl.appendChild(document.createTextNode(' '));
        var jitter = ((pi * 7 + wi * 13) % 9 - 4) / 60;
        toks.push({ el: s, v: clamp(ph[1] + jitter) });
      });
    });
    var TA = P[2] + 300, TD = 55;
    toks.forEach(function (o, k) { o.a = TA + k * TD; });
    function tint(v) { // red (disagree) → green (agree)
      var lo = [245, 207, 196], hi = [207, 232, 217];
      return 'rgb(' + lo.map(function (x, i) { return Math.round(x + (hi[i] - x) * v); }).join(',') + ')';
    }
    var fx = fig.querySelectorAll('.fx');
    function phaseOf(t) { return t < P[1] ? 0 : t < P[2] ? 1 : t < P[3] ? 2 : 3; }
    function render(t) {
      var ph = phaseOf(t);
      if (fig.getAttribute('data-phase') !== String(ph)) fig.setAttribute('data-phase', ph);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.querySelector('.m4-prog').style.setProperty('--p', win(t, P[i], i < 3 ? P[i + 1] : END).toFixed(3)); });
      qs.forEach(function (q) {
        q.el.style.opacity = (0.15 + 0.85 * soft(win(t, q.a, q.a + 300))).toFixed(3);
        Array.prototype.forEach.call(q.mods, function (m) { m.classList.toggle('on', t >= q.a + 450 && q.on.indexOf(m.dataset.m) !== -1); });
      });
      rolls.forEach(function (r, i) {
        var a = P[1] + 300 + i * 220;
        r.el.style.opacity = (0.15 + 0.85 * soft(win(t, a, a + 250))).toFixed(3);
        var shown = t >= P[1] + 2400 + i * 90;
        var txt = shown ? (r.ok ? '✓' : '✗') : '';
        if (r.r.textContent !== txt) r.r.textContent = txt;
        r.el.classList.toggle('ok', shown && r.ok); r.el.classList.toggle('bad', shown && !r.ok);
        r.el.classList.toggle('flag', t >= P[1] + 3300 && !r.ok);
      });
      toks.forEach(function (o) {
        var k = soft(win(t, o.a, o.a + 200));
        o.el.style.background = k > 0 ? tint(o.v) : 'transparent';
        o.el.style.opacity = (0.35 + 0.65 * (t >= o.a ? 1 : 0)).toFixed(2);
      });
      Array.prototype.forEach.call(fx, function (el) { el.style.opacity = soft(win(t, +el.dataset.a, +el.dataset.b)).toFixed(3); });
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
    { max: 60, rows: [['Qwen3-VL-4B base', 55.4, C.base], ['+ GRPO', 56.4, C.grpo], ['+ OPSD, answer privilege', 55.7, C.opsd], ['+ GPD', 57.1, C.gp]] },
    { max: 40, rows: [['Qwen3-VL-4B base', 30.9, C.base], ['+ GRPO', 35.7, C.grpo], ['+ OPSD, answer privilege', 31.5, C.opsd], ['+ GPD', 37.6, C.gp]] },
    { max: 60, rows: [['RGB only', 49.1, C.base], ['+ all 3D cues as text', 48.3, C.base], ['+ routed 3D cues as text', 52.2, C.gp]] },
    { max: 2.5, unit: ' pts', rows: [['GRPO', 2.1, C.grpo], ['GPD', 0.6, C.gp]] }
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var cd = CARDS[+el.dataset.card]; el.id = 'card-' + el.dataset.card;
    mount(el.id, function (host, W) {
      var rowH = 30, H = cd.rows.length * rowH + 4, vw = W - 60, u = cd.unit || '';
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': cd.rows.map(function (r) { return r[0] + ' ' + r[1] + u; }).join(', ') }, host);
      cd.rows.forEach(function (r, i) {
        var y = i * rowH, best = r[2] === C.gp;
        S('text', { x: 0, y: y + 10, class: best ? 'lbl-b' : 'lbl', style: 'font-size:11.5px' }, s, r[0]);
        S('rect', { x: 0, y: y + 15, width: vw, height: 8, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 15, width: vw * r[1] / cd.max, height: 8, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tv': (u ? '+' : '') + fmt(r[1]) + u, 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / cd.max + 6, y: y + 22.5, class: (best ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 90) + 'ms' }, s, (u ? '+' : '') + fmt(r[1]) + u);
      });
      B.rise(s);
    });
  });

  /* ================= Figure 2: forms of 3D input, zero-shot (Figure 5, left) ================= */
  mount('f2', function (host, W) {
    var D = [['RGB only', 49.1, C.base], ['+ all 3D cues as images', 47.4, '#d9c3b2'], ['+ routed 3D cues as images', 48.3, '#d9c3b2'], ['+ all 3D cues as text', 48.3, '#d9c3b2'], ['+ routed 3D cues as text', 52.2, C.gp]];
    var lx = W < 520 ? 150 : 186, rx = W - 60, rh = 38, H = D.length * rh + 24, lo = 40, hi = 56;
    var X = function (v) { return lx + (rx - lx) * (v - lo) / (hi - lo); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Zero-shot accuracy by form of 3D input' }, host);
    [40, 44, 48, 52, 56].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: 0, y2: H - 22, class: 'grid' }, s); S('text', { x: X(v), y: H - 6, 'text-anchor': 'middle' }, s, v); });
    D.forEach(function (d, i) {
      var y = i * rh, best = d[2] === C.gp;
      S('text', { x: 0, y: y + rh / 2 + 4, class: best ? 'lbl-b' : 'lbl', fill: best ? C.gpInk : null }, s, d[0]);
      S('rect', { x: lx, y: y + 9, width: X(d[1]) - lx, height: rh - 18, rx: 4, fill: d[2], class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tv': fmt(d[1]) + '%', 'data-tl': d[0], 'data-tc': d[2], 'data-tn': (d[1] - 49.1 >= 0 ? '+' : '−') + fmt(Math.abs(d[1] - 49.1)) + ' vs RGB only', tabindex: 0 }, s);
      S('text', { x: X(d[1]) + 7, y: y + rh / 2 + 4, class: (best ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 90) + 'ms' }, s, fmt(d[1]));
    });
    S('line', { x1: X(49.1), x2: X(49.1), y1: 2, y2: H - 22, stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: .5 }, s);
    B.rise(s);
  });

  /* ================= Figure 3: controlled results (Tables 1 and 2) ================= */
  var BENCH = ['VSI-Bench', 'MindCube', 'SPAR', 'MMSI', 'ViewSpatial', 'Average of four'];
  var F3 = { // [base, GRPO, OPSD, GPD]
    '4B': [[55.4, 56.4, 55.7, 57.1], [21.5, 33.0, 21.9, 38.0], [35.2, 41.4, 36.3, 43.4], [27.7, 28.7, 27.5, 29.4], [39.1, 39.6, 40.4, 39.8], [30.9, 35.7, 31.5, 37.6]],
    '2B': [[51.3, 51.3, 50.8, 51.7], [31.7, 35.8, 31.2, 38.4], [31.8, 38.5, 30.9, 38.2], [24.3, 19.8, 21.7, 21.1], [36.6, 36.7, 36.8, 36.8], [31.1, 32.7, 30.2, 33.6]]
  };
  var F3N = ['Base', 'GRPO', 'OPSD (answer)', 'GPD'], F3C = [C.base, C.grpo, C.opsd, C.gp];
  var f3m = '4B', f3b = 0, f3cur = F3['4B'][0].slice(), f3els = null;
  function f3go() {
    document.getElementById('f3-t').textContent = BENCH[f3b] + (f3b === 0 ? ', average accuracy' : f3b === 5 ? ': MindCube, SPAR, MMSI, ViewSpatial' : ', accuracy');
    var from = f3cur.slice(), to = F3[f3m][f3b];
    tween(600, function (k) { f3cur = from.map(function (a, j) { return a + (to[j] - a) * k; }); paint3(); });
  }
  seg(document.getElementById('f3-m'), ['Qwen3-VL-4B', 'Qwen3-VL-2B'], 0, function (i) { f3m = i ? '2B' : '4B'; f3go(); });
  seg(document.getElementById('f3-b'), BENCH, 0, function (i) { f3b = i; f3go(); });
  mount('f3', function (host, W) {
    var H = 250, top = 18, bot = 30, lx = 30;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Controlled comparison' }, host);
    var grid = S('g', {}, s), cw = (W - lx) / 4, bw = Math.min(80, cw * .55), bars = [], vals = [];
    F3N.forEach(function (n, i) {
      var x = lx + i * cw + (cw - bw) / 2;
      bars.push(S('rect', { x: x, width: bw, rx: 4, fill: F3C[i], class: 'rb', style: '--d:' + (i * 90) + 'ms', 'data-tl': n, 'data-tc': F3C[i], tabindex: 0 }, s));
      vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: (i === 3 ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 90) + 'ms' }, s, ''));
      S('text', { x: x + bw / 2, y: H - bot + 18, 'text-anchor': 'middle', class: i === 3 ? 'lbl-b' : 'lbl', fill: i === 3 ? C.gpInk : null }, s, n);
    });
    f3els = { bars: bars, vals: vals, grid: grid, H: H, top: top, bot: bot, lx: lx, W: W };
    paint3(); B.rise(s);
  });
  function paint3() {
    if (!f3els) return;
    var e = f3els, mx = Math.max.apply(null, F3[f3m][f3b]), hi = Math.ceil((mx + 6) / 10) * 10;
    var Y = function (v) { return e.top + (e.H - e.top - e.bot) * (1 - v / hi); };
    e.grid.innerHTML = '';
    [0, hi / 2, hi].forEach(function (v) { S('line', { x1: e.lx, x2: e.W, y1: Y(v), y2: Y(v), class: 'grid' }, e.grid); S('text', { x: e.lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, e.grid, v); });
    f3cur.forEach(function (v, i) {
      e.bars[i].setAttribute('y', Y(v).toFixed(1)); e.bars[i].setAttribute('height', Math.max(0, Y(0) - Y(v)).toFixed(1));
      e.bars[i].setAttribute('data-tv', fmt(v)); e.bars[i].setAttribute('data-tn', 'Qwen3-VL-' + f3m + ' · ' + BENCH[f3b]);
      e.vals[i].setAttribute('y', (Y(v) - 7).toFixed(1)); e.vals[i].textContent = fmt(v);
    });
  }

  /* ================= Figure 4: ablations (Figure 4) ================= */
  mount('f4a', function (host, W) {
    var D = [['Base', 35.8, C.base, 'averaged from Tables 1–2'], ['OPSD (answer)', 36.4, C.opsd, 'averaged from Tables 1–2'], ['GRPO', 39.8, C.grpo], ['+ answer only', 40.2, '#d9c3b2'], ['+ routed 3D text only', 40.5, '#d9c3b2'],
      ['+ all 3D text + answer', 39.8, '#d9c3b2'], ['+ routed 3D images + answer', 40.4, '#d9c3b2'], ['+ routed 3D text + answer (GPD)', 41.5, C.gp]];
    var lx = W < 380 ? 150 : 176, rx = W - 40, rh = 27, H = D.length * rh + 22, lo = 34, hi = 42;
    var X = function (v) { return lx + (rx - lx) * (v - lo) / (hi - lo); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Privilege ablation' }, host);
    [34, 38, 42].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: 0, y2: H - 20, class: 'grid' }, s); S('text', { x: X(v), y: H - 5, 'text-anchor': 'middle' }, s, v); });
    D.forEach(function (d, i) {
      var y = i * rh, best = d[2] === C.gp;
      S('text', { x: 0, y: y + rh / 2 + 4, class: best ? 'lbl-b' : 'lbl', style: 'font-size:11.5px', fill: best ? C.gpInk : null }, s, d[0]);
      S('rect', { x: lx, y: y + 6, width: X(d[1]) - lx, height: rh - 12, rx: 3, fill: d[2], class: 'rbx', style: '--d:' + (i * 60) + 'ms', 'data-tv': fmt(d[1]), 'data-tl': d[0], 'data-tc': d[2], 'data-tn': d[3] || null, tabindex: 0 }, s);
      S('text', { x: X(d[1]) + 5, y: y + rh / 2 + 4, class: (best ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 60) + 'ms;font-size:11px' }, s, fmt(d[1]));
    });
    B.rise(s);
  });
  mount('f4b', function (host, W) {
    var P = [[0.001, 39.6], [0.003, 41.5], [0.004, 40.2], [0.005, 39.6]];
    var H = 236, lx = 34, rx = W - 14, top = 14, bot = 38, lo = 39, hi = 42;
    var X = function (v) { return lx + (rx - lx) * (v - 0.0005) / 0.005; }, Y = function (v) { return top + (H - top - bot) * (hi - v) / (hi - lo); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Distillation weight sweep' }, host);
    [39, 40, 41, 42].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    P.forEach(function (p) { S('text', { x: X(p[0]), y: H - bot + 16, 'text-anchor': 'middle' }, s, p[0]); });
    S('text', { x: (lx + rx) / 2, y: H - 4, 'text-anchor': 'middle', class: 'lbl' }, s, 'λ, distillation on incorrect rollouts only');
    S('line', { x1: lx, x2: rx, y1: Y(39.8), y2: Y(39.8), stroke: '#8e98a6', 'stroke-width': 1.3, 'stroke-dasharray': '4 4' }, s);
    S('text', { x: lx + 6, y: Y(39.8) - 6, style: 'font-size:11px' }, s, 'GRPO 39.8');
    S('path', { d: P.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join(''), fill: 'none', stroke: C.gp, 'stroke-width': 2.4, class: 'rl', pathLength: 1 }, s);
    P.forEach(function (p, i) {
      S('circle', { cx: X(p[0]), cy: Y(p[1]), r: p[0] === 0.003 ? 6 : 4.5, fill: C.gp, class: 'rf', style: '--d:' + (i * 120) + 'ms', 'data-tv': fmt(p[1]), 'data-tl': 'λ = ' + p[0] + ', incorrect rollouts only', 'data-tc': C.gp, tabindex: 0 }, s);
      S('text', { x: X(p[0]), y: Y(p[1]) - 10, 'text-anchor': 'middle', class: (p[0] === 0.003 ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 120) + 'ms' }, s, fmt(p[1]));
    });
    S('rect', { x: X(0.003) - 5, y: Y(40.6) - 5, width: 10, height: 10, fill: '#fff', stroke: '#d2873a', 'stroke-width': 2, transform: 'rotate(45 ' + X(0.003) + ' ' + Y(40.6) + ')', class: 'rf', style: '--d:500ms', 'data-tv': '40.6', 'data-tl': 'λ = 0.003, all rollouts', 'data-tc': '#d2873a', tabindex: 0 }, s);
    S('text', { x: X(0.003) - 12, y: Y(40.6) + 4, 'text-anchor': 'end', style: 'font-size:11px', class: 'rf', fill: '#b06a1f' }, s, 'all rollouts 40.6');
    B.rise(s);
  });

  /* ================= Figure 5: test-time privilege dependence (Figure 7) ================= */
  mount('f5', function (host, W) {
    var G = [['GRPO', 54.9, 57.0, C.grpo], ['GPD', 56.3, 56.9, C.gp]];
    var H = 230, top = 18, bot = 34, lx = 30, lo = 50, hi = 58, Y = function (v) { return top + (H - top - bot) * (hi - v) / (hi - lo); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Accuracy with and without 3D text at test time' }, host);
    [50, 54, 58].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var gw = (W - lx) / 2, bw = Math.min(60, gw * .26);
    G.forEach(function (g, gi) {
      var gx = lx + gi * gw + gw / 2;
      [[g[1], 'RGB only'], [g[2], '+ 3D text at test']].forEach(function (b, i) {
        var x = gx + (i ? 6 : -bw - 6), col = i ? g[3] : '#e4e7ec';
        S('rect', { x: x, y: Y(b[0]), width: bw, height: Y(lo) - Y(b[0]), rx: 3, fill: col, stroke: i ? 'none' : g[3], 'stroke-width': 1.5, class: 'rb', style: '--d:' + (gi * 200 + i * 120) + 'ms', 'data-tv': fmt(b[0]), 'data-tl': g[0] + ' · ' + b[1], 'data-tc': g[3], tabindex: 0 }, s);
        S('text', { x: x + bw / 2, y: Y(b[0]) - 6, 'text-anchor': 'middle', class: 'val rf', style: '--d:' + (gi * 200 + i * 120) + 'ms' }, s, fmt(b[0]));
        S('text', { x: x + bw / 2, y: H - bot + 15, 'text-anchor': 'middle', style: 'font-size:10.5px' }, s, b[1]);
      });
      S('text', { x: gx, y: H - 4, 'text-anchor': 'middle', class: 'lbl-b', fill: gi ? C.gpInk : null }, s, g[0]);
      S('text', { x: gx + bw + 14, y: Y(g[2]) + 4, class: 'val-b rf', style: '--d:' + (gi * 200 + 400) + 'ms', fill: gi ? C.gpInk : '#5b6b7d' }, s, '+' + fmt(g[2] - g[1]));
    });
    B.rise(s);
  });
})();
