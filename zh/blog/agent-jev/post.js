/* Figures for "Actor, Judge, or Teacher?". Every number comes from arXiv:2611.17167 (tables and text cited inline). */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { act: '#c39448', actInk: '#8a6220', jud: '#4d6bf3', judInk: '#2f49c4', tea: '#709b6a', teaInk: '#47703f', base: '#a9b1bc', base2: '#cfd5dd', ink: '#151a22', mute: '#6b7382', bad: '#c4553f', grid: '#edf0f4' };

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
  // Draw a chart at the container's real width and redraw when that width changes
  function mount(id, draw) {
    var el = document.getElementById(id); if (!el) return null;
    var w = 0;
    function go() { var nw = el.clientWidth; if (nw && Math.abs(nw - w) > 2) { w = nw; el.innerHTML = ''; draw(el, w); } }
    if ('ResizeObserver' in window) new ResizeObserver(go).observe(el); else window.addEventListener('resize', go);
    go();
    return { redraw: function () { w = 0; go(); } };
  }
  function seg(el, items, cur, onPick) {
    el.innerHTML = '';
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = it; b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
      b.addEventListener('click', function () { Array.prototype.forEach.call(el.children, function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); onPick(i); });
      el.appendChild(b);
    });
  }
  function wrapText(t, max) { // split a label into ≤2 lines of about `max` characters
    if (t.length <= max) return [t];
    var words = t.split(' '), a = '', i = 0;
    while (i < words.length && (a + ' ' + words[i]).trim().length <= max) { a = (a + ' ' + words[i]).trim(); i++; }
    return [a || words[0], words.slice(a ? i : 1).join(' ')];
  }

  /* ================= Figure 1: one model, three roles ================= */
  (function () {
    var fig = document.querySelector('#fig-1 .m1'); if (!fig) return;
    var PH = [0, 8600, 17600], END = 26200, CYCLE = 26800, HOLD = 25700;
    var BUSY = [[2550, 3150], [11900, 12500], [15300, 15900], [20600, 21200]];
    var MEAN = 0.71125, CENTER = 23200;
    var grid = fig.querySelector('.m1-grid'), band = fig.querySelector('.m1-band');
    var tabs = fig.querySelectorAll('.m1-tab'), pp = fig.querySelector('.m1-pp');
    var fx = fig.querySelectorAll('.fx'), types = [], dots = [], grows = fig.querySelectorAll('.fx-grow'), scans = fig.querySelectorAll('[data-fx="scan"]');
    var rqs = fig.querySelectorAll('.m1-rq'), cells = fig.querySelectorAll('.m1-sc');
    var traj = fig.querySelector('.m1-traj'), ctx = fig.querySelector('.m1-ctx');
    ctx.style.transition = 'none';

    Array.prototype.forEach.call(fig.querySelectorAll('.fx-type'), function (el) {
      var txt = el.textContent; el.textContent = '';
      var on = document.createElement('span'), off = document.createElement('span');
      on.className = 'on'; off.className = 'off'; off.textContent = txt;
      el.appendChild(on); el.appendChild(off);
      types.push({ el: el, on: on, off: off, txt: txt, a: +el.dataset.a, b: +el.dataset.b, n: -1 });
    });
    Array.prototype.forEach.call(fig.querySelectorAll('.m1-dot'), function (el) {
      var w = el.getAttribute('data-w').split('|').filter(Boolean).map(function (p) { return p.split(',').map(Number); });
      dots.push({ el: el, w: w });
    });
    Array.prototype.forEach.call(cells, function (c) { c.textContent = c.dataset.s; });

    function ctxHeights() {
      var lis = traj.querySelectorAll('li'), tgt = traj.querySelector('.m1-target'), last = lis[lis.length - 1];
      return [tgt.offsetTop + tgt.offsetHeight - 2, last.offsetTop + last.offsetHeight - 2];
    }
    var CH = ctxHeights();

    function phaseOf(t) { return t < PH[1] ? 0 : t < PH[2] ? 1 : 2; }
    function render(t) {
      var ph = phaseOf(t);
      if (fig.getAttribute('data-phase') !== String(ph)) fig.setAttribute('data-phase', ph);
      Array.prototype.forEach.call(tabs, function (tb, i) {
        var a = PH[i], b = i < 2 ? PH[i + 1] : END;
        tb.querySelector('.m1-prog').style.setProperty('--p', win(t, a, b).toFixed(3));
      });
      Array.prototype.forEach.call(fx, function (el) {
        var k = soft(win(t, +el.dataset.a, +el.dataset.b));
        el.style.opacity = k.toFixed(3);
        el.style.transform = k < 1 ? 'translateY(' + ((1 - k) * 6).toFixed(1) + 'px)' : '';
      });
      types.forEach(function (ty) {
        var k = win(t, ty.a, ty.b), n = Math.round(k * ty.txt.length);
        if (n !== ty.n) { ty.n = n; ty.on.textContent = ty.txt.slice(0, n); ty.off.textContent = ty.txt.slice(n); }
        ty.el.classList.toggle('caret', k > 0 && k < 1);
      });
      Array.prototype.forEach.call(scans, function (el) {
        var k = win(t, +el.dataset.a, +el.dataset.b);
        el.style.top = (k * 100).toFixed(1) + '%'; el.style.opacity = (k > 0 && k < 1) ? '1' : '0';
      });
      dots.forEach(function (d) {
        var on = false;
        d.w.forEach(function (w) { if (t >= w[0] && t <= w[1]) { on = true; d.el.style.setProperty('--k', ease(win(t, w[0], w[1])).toFixed(3)); } });
        d.el.style.opacity = on ? '1' : '0';
      });
      Array.prototype.forEach.call(grows, function (el) { el.style.setProperty('--k', soft(win(t, +el.dataset.a, +el.dataset.b)).toFixed(3)); });
      var busy = BUSY.some(function (w) { return t >= w[0] && t <= w[1]; });
      band.classList.toggle('busy', busy);
      var rq = t < PH[1] ? 0 : t < 14000 ? 1 : t < PH[2] ? 2 : 3;
      Array.prototype.forEach.call(rqs, function (r, i) { r.classList.toggle('on', i === rq); });
      // Judge: context bracket grows over the prefix, then over the whole episode
      var h = CH[0] * ease(win(t, 9400, 10000)) + (CH[1] - CH[0]) * ease(win(t, 14000, 14800));
      ctx.style.setProperty('--ch', h.toFixed(1) + 'px');
      ctx.style.opacity = h > 1 ? '1' : '0';
      // Teacher: scores appear, then are centred on the group mean
      Array.prototype.forEach.call(cells, function (c) {
        var a = +c.dataset.a, s = +c.dataset.s, k = soft(win(t, a, a + 350));
        c.style.opacity = (0.3 + 0.7 * k).toFixed(3);
        var centred = t >= CENTER;
        var txt = k <= 0 ? '' : centred ? ((s - MEAN >= 0 ? '+' : '−') + Math.abs(s - MEAN).toFixed(2)) : s.toFixed(2);
        if (c.textContent !== txt) c.textContent = txt;
        c.classList.toggle('pos', centred && s >= MEAN); c.classList.toggle('neg', centred && s < MEAN);
      });
      fig.classList.toggle('upd', t >= 24300 && t < END + 400);
      grid.style.opacity = (1 - win(t, END, CYCLE)).toFixed(3);
    }

    var params = new URLSearchParams(location.search), freeze = params.has('f1t') ? +params.get('f1t') : null;
    if (reduce && freeze === null) {
      // Static: everything revealed, tabs only choose which role is shown on narrow screens
      render(HOLD);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.addEventListener('click', function () { fig.setAttribute('data-phase', i); }); });
      return;
    }
    fig.classList.add('anim');
    pp.hidden = false;
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
      paused = !paused;
      pp.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pp.querySelector('span').textContent = paused ? '播放' : '暂停';
      pp.querySelector('svg').innerHTML = paused ? '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>' : '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>';
      update();
    });
    Array.prototype.forEach.call(tabs, function (tb, i) {
      tb.addEventListener('click', function () { freeze = null; vt = PH[i] + 1; gone = false; render(now()); update(); });
    });
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
    window.addEventListener('resize', function () { CH = ctxHeights(); render(now()); });
    render(now());
    update();
  })();

  /* ================= Result cards ================= */
  var CARDS = [
    [['JEV 自己执行', 42.9, C.act], ['JEV 教出的 1.5B 策略', 82.9, C.tea]],
    [['JEV 自己执行', 14.7, C.act], ['JEV 教出的 1.5B 策略', 86.8, C.tea]],
    [['GRPO（仅结果奖励）', 56.8, C.base], ['GRPO + JEV 作老师', 71.4, C.tea]],
    [['7B，仅 GRPO', 77.6, C.base], ['1.5B，GRPO + JEV 作老师', 82.9, C.tea]]
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var rows = CARDS[+el.dataset.card], id = 'card-' + el.dataset.card;
    el.id = id;
    mount(id, function (host, W) {
      var rowH = 36, H = rows.length * rowH + 2, vw = W - 46;
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': rows.map(function (r) { return r[0] + ' ' + r[1] + '%'; }).join(', ') }, host);
      rows.forEach(function (r, i) {
        var y = i * rowH;
        S('text', { x: 0, y: y + 11, class: i ? 'lbl-b' : 'lbl' }, s, r[0]);
        S('rect', { x: 0, y: y + 17, width: vw, height: 10, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 17, width: vw * r[1] / 100, height: 10, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 120) + 'ms', 'data-tv': fmt(r[1]) + '%', 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / 100 + 6, y: y + 26.5, class: (i ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 120) + 'ms' }, s, fmt(r[1]) + '%');
      });
      B.rise(s);
    });
  });

  /* ================= Figure 2: actor success heatmap (Table 2) ================= */
  var MODELS = ['JEV', 'Decider v1.2', 'GPT Decisions', 'Qwen prompted', 'Qwen constrained', 'GPT Luna'];
  var TASKS = ['Pick', 'Look', 'Pick2', 'Clean', 'Heat', 'Cool', '全部'];
  var T2 = [
    [77.1, 46.2, 70.8, 11.1, 18.8, 16.0, 42.9],
    [97.1, 53.8, 83.3, 55.6, 18.8, 40.0, 63.6],
    [88.6, 76.9, 62.5, 29.6, 25.0, 24.0, 52.9],
    [77.1, 53.8, 79.2, 22.2, 31.2, 20.0, 49.3],
    [77.1, 46.2, 75.0, 33.3, 6.2, 8.0, 45.0],
    [77.1, 46.2, 37.5, 18.5, 0.0, 4.0, 34.3]
  ];
  function heat(v) { // white → amber-brown
    var a = [251, 246, 236], b = [160, 109, 36], k = Math.pow(v / 100, 0.9);
    return 'rgb(' + a.map(function (x, i) { return Math.round(x + (b[i] - x) * k); }).join(',') + ')';
  }
  var f2mode = 'grid', f2 = mount('f2', function (host, W) {
    var narrow = W < 560;
    if (f2mode === 'grid') {
      var lw = narrow ? 92 : 128, top = 34, rh = narrow ? 34 : 38, gap = 3, cols = TASKS.length;
      var cw = (W - lw - 10 - 2 * gap * cols) / cols, H = top + MODELS.length * rh + 4;
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '各模型在各类任务上作为执行者的成功率' }, host);
      function cx(j) { return lw + j * (cw + 2 * gap) + (j >= 3 ? 6 : 0) + (j >= 6 ? 6 : 0); }
      S('text', { x: cx(0), y: 11, class: 'lbl' }, s, '无依赖');
      S('text', { x: cx(3), y: 11, class: 'lbl-b', fill: C.actInk }, s, '有依赖');
      TASKS.forEach(function (t, j) { S('text', { x: cx(j) + cw / 2, y: top - 8, 'text-anchor': 'middle', class: j === 6 ? 'lbl-b' : 'lbl' }, s, t); });
      MODELS.forEach(function (m, i) {
        var y = top + i * rh;
        S('text', { x: 0, y: y + rh / 2 + 4, class: 'lbl' }, s, narrow ? m.replace('constrained', 'constr.').replace('prompted', 'prompt.').replace('Decisions', 'Dec.') : m);
        T2[i].forEach(function (v, j) {
          var g = S('g', { class: 'rf', style: '--d:' + (j * 70 + i * 25) + 'ms' }, s);
          S('rect', { x: cx(j), y: y + 2, width: cw, height: rh - 5, rx: 5, fill: heat(v), 'data-tv': fmt(v) + '%', 'data-tl': m + ' · ' + TASKS[j], 'data-tc': heat(v), tabindex: 0 }, g);
          S('text', { x: cx(j) + cw / 2, y: y + rh / 2 + 3.5, 'text-anchor': 'middle', class: 'val', fill: v > 55 ? '#fff' : C.ink, style: 'pointer-events:none;' + (j === 6 ? 'font-weight:700' : '') }, g, fmt(v));
        });
      });
      B.rise(s);
    } else {
      // Pick2 against each dependent type, per model (dot plot)
      var lw2 = narrow ? 92 : 128, top2 = 26, rh2 = 34, x0 = lw2 + 8, x1 = W - 14, H2 = top2 + MODELS.length * rh2 + 22;
      var s2 = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H2, width: W, height: H2, role: 'img', 'aria-label': '各模型在 Pick2 与依赖任务上的成功率对比' }, host);
      function X(v) { return x0 + (x1 - x0) * v / 100; }
      [0, 25, 50, 75, 100].forEach(function (v) {
        S('line', { x1: X(v), x2: X(v), y1: top2 - 6, y2: H2 - 20, class: 'grid' }, s2);
        S('text', { x: X(v), y: H2 - 4, 'text-anchor': 'middle' }, s2, v);
      });
      var lg = S('g', {}, s2);
      S('circle', { cx: x0 + 6, cy: 8, r: 5.5, fill: '#fff', stroke: C.act, 'stroke-width': 2.2 }, lg);
      S('text', { x: x0 + 16, y: 12, class: 'lbl' }, lg, 'Pick2（两个子目标，顺序任意）');
      S('circle', { cx: x0 + (narrow ? 6 : 230), cy: narrow ? 8 : 8, r: 4.5, fill: C.actInk, style: narrow ? 'display:none' : '' }, lg);
      if (!narrow) S('text', { x: x0 + 240, y: 12, class: 'lbl' }, lg, 'Clean / Heat / Cool（顺序固定）');
      MODELS.forEach(function (m, i) {
        var y = top2 + i * rh2 + rh2 / 2 + 4, r = T2[i], dep = [r[3], r[4], r[5]];
        S('text', { x: 0, y: y + 4, class: 'lbl' }, s2, narrow ? m.replace('constrained', 'constr.').replace('prompted', 'prompt.').replace('Decisions', 'Dec.') : m);
        var lo = Math.min.apply(null, dep);
        S('line', { x1: X(lo), x2: X(r[2]), y1: y, y2: y, stroke: '#e8d8b8', 'stroke-width': 3, 'stroke-linecap': 'round', class: 'rl', pathLength: 1, style: '--d:' + (i * 80) + 'ms' }, s2);
        dep.forEach(function (v, j) { S('circle', { cx: X(v), cy: y, r: 4.5, fill: C.actInk, class: 'rf', style: '--d:' + (i * 80) + 'ms', 'data-tv': fmt(v) + '%', 'data-tl': m + ' · ' + TASKS[3 + j], 'data-tc': C.actInk, tabindex: 0 }, s2); });
        S('circle', { cx: X(r[2]), cy: y, r: 5.5, fill: '#fff', stroke: C.act, 'stroke-width': 2.2, class: 'rf', style: '--d:' + (i * 80) + 'ms', 'data-tv': fmt(r[2]) + '%', 'data-tl': m + ' · Pick2', 'data-tc': C.act, tabindex: 0 }, s2);
      });
      B.rise(s2);
    }
  });
  var f2seg = document.getElementById('f2-mode');
  if (f2seg) Array.prototype.forEach.call(f2seg.children, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(f2seg.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      f2mode = b.dataset.m; f2.redraw();
    });
  });

  /* ================= Figure 3a: where JEV's probability goes (Section 3.1.1) ================= */
  var F3 = [[14.6, 63.8, 21.6], [77.6, 2.5, 19.9]];
  var F3L = ['推进必须先完成的子目标的一步', '完成较容易子目标的动作', '其他动作'];
  var F3C = [C.tea, C.act, C.base2];
  var f3goal = 0, f3cur = F3[0].slice(), f3els = null, f3auto = false;
  var F3S = ['应先做的一步', '较容易的子目标', '其他动作'];
  mount('f3a', function (host, W) {
    var H = 236, top = 18, bot = 34, lx = 30;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'JEV 的概率分给了哪些动作' }, host);
    var ph = H - top - bot, Y = function (v) { return top + ph * (1 - v / 100); };
    [0, 50, 100].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var cw = (W - lx) / 3, bw = Math.min(64, cw * .56), bars = [], vals = [];
    F3S.forEach(function (l, i) {
      var x = lx + i * cw + (cw - bw) / 2;
      bars.push(S('rect', { x: x, width: bw, rx: 3, fill: F3C[i], class: 'rb', style: '--d:' + (i * 80) + 'ms', 'data-tl': F3L[i], 'data-tc': F3C[i], tabindex: 0 }, s));
      vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: (i < 2 ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 80) + 'ms' }, s, ''));
      S('text', { x: x + bw / 2, y: H - bot + 16, 'text-anchor': 'middle', class: i < 2 ? 'lbl-b' : 'lbl', fill: i === 0 ? C.teaInk : i === 1 ? C.actInk : null, style: 'font-size:12px' }, s, l);
    });
    f3els = { bars: bars, vals: vals, Y: Y };
    paint3(f3cur); B.rise(s);
  });
  function paint3(v) {
    if (!f3els) return;
    v.forEach(function (x, i) {
      var r = f3els.bars[i]; r.setAttribute('y', f3els.Y(x).toFixed(1)); r.setAttribute('height', (f3els.Y(0) - f3els.Y(x)).toFixed(1)); r.setAttribute('data-tv', fmt(x) + '%');
      var t = f3els.vals[i]; t.setAttribute('y', (f3els.Y(x) - 6).toFixed(1)); t.textContent = fmt(x) + '%';
    });
  }
  function goal3(g) {
    f3goal = g;
    var from = f3cur.slice(), to = F3[g];
    tween(900, function (k) { f3cur = from.map(function (a, i) { return a + (to[i] - a) * k; }); paint3(f3cur); });
    var segEl = document.getElementById('f3-goal');
    if (segEl) Array.prototype.forEach.call(segEl.children, function (c, j) { c.setAttribute('aria-pressed', j === g ? 'true' : 'false'); });
  }
  var f3seg = document.getElementById('f3-goal');
  if (f3seg) Array.prototype.forEach.call(f3seg.children, function (b, i) { b.addEventListener('click', function () { f3auto = true; goal3(i); }); });
  // On first view, show the shift once by itself
  if (!reduce && 'IntersectionObserver' in window) {
    var f3o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && es[0].intersectionRatio >= 0.5 && !f3auto) {
        f3auto = true; f3o.disconnect();
        setTimeout(function () { goal3(1); }, 1400);
      }
    }, { threshold: [0, 0.5] });
    f3o.observe(document.getElementById('f3a'));
  }

  /* ================= Figure 3b: hint + example (Section 3.1.2) ================= */
  var F3B = [['Decider v1.2', 89.7, 85.3], ['Qwen prompted', 46.6, 58.6], ['Qwen constrained', 41.7, 58.3], ['GPT Decisions', 20.8, 32.1], ['JEV', 19.0, 24.1]];
  function spread(ys, gap, lo, hi) { // keep labels at least `gap` apart
    var o = ys.map(function (y, i) { return { y: y, i: i }; }).sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < o.length; k++) if (o[k].y - o[k - 1].y < gap) o[k].y = o[k - 1].y + gap;
    var over = o[o.length - 1].y - hi; if (over > 0) o.forEach(function (p) { p.y -= over; });
    var r = []; o.forEach(function (p) { r[p.i] = Math.max(lo, p.y); }); return r;
  }
  mount('f3b', function (host, W) {
    var H = 236, top = 14, bot = 30, lx = 58, rx = W - (W < 360 ? 118 : 132);
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '加入顺序示例后的成功率' }, host);
    function Y(v) { return top + (H - top - bot) * (1 - v / 100); }
    [0, 50, 100].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 30, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    S('text', { x: lx, y: H - 8, 'text-anchor': 'middle', class: 'lbl' }, s, '原提示');
    S('text', { x: rx, y: H - 8, 'text-anchor': 'middle', class: 'lbl' }, s, '提示 + 示例');
    var ly = spread(F3B.map(function (d) { return Y(d[1]) + 4; }), 13, 0, H - bot), ry = spread(F3B.map(function (d) { return Y(d[2]) + 4; }), 13, 0, H - bot);
    F3B.forEach(function (d, i) {
      var col = d[0] === 'JEV' ? C.act : (d[2] < d[1] ? '#8b95a3' : '#5d6878'), wd = d[0] === 'JEV' ? 2.6 : 1.8;
      S('line', { x1: lx, y1: Y(d[1]), x2: rx, y2: Y(d[2]), stroke: col, 'stroke-width': wd, class: 'rl', pathLength: 1, style: '--d:' + (i * 120) + 'ms' }, s);
      S('circle', { cx: lx, cy: Y(d[1]), r: 4, fill: col, class: 'rf', style: '--d:' + (i * 120) + 'ms', 'data-tv': fmt(d[1]) + '%', 'data-tl': d[0] + ' · 原提示', 'data-tc': col, tabindex: 0 }, s);
      S('circle', { cx: rx, cy: Y(d[2]), r: 4, fill: col, class: 'rf', style: '--d:' + (i * 120 + 300) + 'ms', 'data-tv': fmt(d[2]) + '%', 'data-tl': d[0] + ' · 提示 + 示例', 'data-tc': col, tabindex: 0 }, s);
      S('text', { x: lx - 8, y: ly[i], 'text-anchor': 'end', class: 'val rf', style: '--d:' + (i * 120) + 'ms' }, s, fmt(d[1]));
      S('text', { x: rx + 8, y: ry[i], class: (d[0] === 'JEV' ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 120 + 300) + 'ms' }, s, fmt(d[2]) + '  ' + d[0]);
    });
    B.rise(s);
  });

  /* ================= Figure 4: Value vs Progress per judge (Appendix E.2) ================= */
  var F4 = { // [milestone, other, no-op] for Value, then Progress
    'JEV': [[0.632, 0.604, 0.577], [0.659, 0.440, 0.298]],
    'Decider v1.2': [[0.608, 0.505, 0.439], [0.729, 0.283, 0.099]],
    'GPT Decisions': [[0.667, 0.561, 0.509], [0.667, 0.429, 0.214]],
    'Qwen prompted': [[0.625, 0.576, 0.492], [0.650, 0.200, 0.048]],
    'Qwen constrained': [[0.516, 0.470, 0.460], [0.638, 0.383, 0.189]],
    'GPT Luna': [[0.560, 0.441, 0.352], [0.531, 0.241, 0.048]]
  };
  var F4C = ['#2f49c4', '#8fa2f3', '#d3daf6'], F4L = ['里程碑', '其他', '无效动作'];
  var f4m = 'JEV', f4cur = [F4.JEV[0].slice(), F4.JEV[1].slice()], f4els = null;
  seg(document.getElementById('f4-model'), MODELS, 0, function (i) {
    var to = F4[MODELS[i]], from = [f4cur[0].slice(), f4cur[1].slice()];
    f4m = MODELS[i];
    tween(650, function (k) { f4cur = [0, 1].map(function (q) { return from[q].map(function (a, j) { return a + (to[q][j] - a) * k; }); }); paint4(); });
  });
  mount('f4', function (host, W) {
    var H = 250, top = 22, bot = 40, lx = 34;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '两种问题下动作的平均得分' }, host);
    var ph = H - top - bot, Y = function (v) { return top + ph * (1 - v); };
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v === 0 ? '0' : v.toFixed(2).replace(/0$/, '')); });
    var gw = (W - lx) / 2, bw = Math.min(54, (gw - 70) / 3), els = { bars: [], vals: [], brk: [], Y: Y };
    ['Value：任务会成功吗？', 'Progress：这个动作有帮助吗？'].forEach(function (q, g) {
      var gx = lx + g * gw + (gw - 3 * bw - 2 * 10) / 2;
      S('text', { x: lx + g * gw + gw / 2, y: H - 12, 'text-anchor': 'middle', class: g ? 'lbl-b' : 'lbl' }, s, W < 520 ? q.split('：')[0] : q);
      var bars = [], vals = [];
      [0, 1, 2].forEach(function (j) {
        var x = gx + j * (bw + 10);
        bars.push(S('rect', { x: x, width: bw, rx: 3, fill: F4C[j], class: 'rb', style: '--d:' + (g * 200 + j * 60) + 'ms', 'data-tl': F4L[j] + ' · ' + (g ? 'Progress' : 'Value'), 'data-tc': F4C[j], tabindex: 0 }, s));
        vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: 'val rf', style: '--d:' + (g * 200 + j * 60) + 'ms' }, s, ''));
        S('text', { x: x + bw / 2, y: H - bot + 14, 'text-anchor': 'middle', style: 'font-size:11px' }, s, F4L[j]);
      });
      var bx = gx + 3 * bw + 2 * 10 + 8;
      var br = { line: S('path', { fill: 'none', stroke: C.ink, 'stroke-width': 1.2, class: 'rf', style: '--d:' + (g * 200 + 300) + 'ms' }, s), txt: S('text', { x: bx + 8, class: 'val-b rf', style: '--d:' + (g * 200 + 300) + 'ms' }, s, ''), x: bx };
      els.bars.push(bars); els.vals.push(vals); els.brk.push(br);
    });
    f4els = els; paint4(); B.rise(s);
  });
  function paint4() {
    if (!f4els) return;
    var Y = f4els.Y;
    [0, 1].forEach(function (g) {
      f4cur[g].forEach(function (v, j) {
        var r = f4els.bars[g][j]; r.setAttribute('y', Y(v).toFixed(1)); r.setAttribute('height', (Y(0) - Y(v)).toFixed(1)); r.setAttribute('data-tv', v.toFixed(3));
        var t = f4els.vals[g][j]; t.setAttribute('y', (Y(v) - 6).toFixed(1)); t.textContent = v.toFixed(2);
      });
      var hi = Y(f4cur[g][0]), lo = Y(f4cur[g][2]), b = f4els.brk[g], x = b.x;
      b.line.setAttribute('d', 'M' + (x - 4) + ' ' + hi + 'H' + x + 'V' + lo + 'H' + (x - 4));
      b.txt.setAttribute('y', ((hi + lo) / 2 + 4).toFixed(1));
      b.txt.textContent = (f4cur[g][0] - f4cur[g][2] >= 0 ? '+' : '') + (f4cur[g][0] - f4cur[g][2]).toFixed(3);
    });
  }

  /* ================= Figure 5: scores as the episode becomes visible (Table 9) ================= */
  var F5A = ['查看', '再次查看', '去咖啡机', '拿起杯子', '去柜子', '放入柜子', '取回杯子', '去微波炉', '打开微波炉', '加热杯子', '去柜子', '放入柜子'];
  var F5 = [ // rows = steps 1..12, columns = Prefix, +FB, +25%, +50%, +75%, Full
    [.47, .57, .62, .61, .56, .54], [.25, .25, .24, .23, .24, .23], [.49, .72, .46, .40, .46, .44], [.92, .92, .90, .82, .83, .85],
    [.80, .81, .69, .67, .66, .68], [.79, .90, .52, .47, .52, .60], [.22, .25, .34, .43, .49, .50], [.23, .22, .19, .40, .46, .50],
    [.20, .18, .66, .66, .76, .76], [.42, .67, .47, .47, .70, .70], [.63, .45, .80, .80, .80, .80], [.68, .85, .85, .85, .85, .85]
  ];
  var F5S = ['Prefix', '+ 反馈', '+ 25%', '+ 50%', '+ 75%', '完整'];
  var F5N = [
    '只看<b>前缀</b>时，过早放置（6）得 0.79，走向微波炉（8）和打开微波炉（9）只有 0.23 和 0.20：执行者对较容易子目标的偏好，到了裁判这里依然存在。',
    '加入<b>即时反馈</b>反而更糟：放置（6）升到 0.90，微波炉相关的两步降到 0.22 和 0.18。',
    '一旦看到<b>加热</b>（10），打开微波炉（9）跳到 0.66，过早放置（6）降到 0.52。',
    '后续步骤可见<b>一半</b>时，走向微波炉（8）升到 0.40，取回杯子（7）升到 0.43。',
    '可见 <b>75%</b> 时，加热（10）达到 0.70，打开微波炉（9）达到 0.76。',
    '看到<b>完整回合</b>后，为加热所做的步骤（7 到 10）得分在 0.50 到 0.76 之间。重复的查看（2）始终停在 0.23 到 0.25，因为仅凭前缀就能看出它重复了第 1 步。'
  ];
  function f5col(i) { return i === 5 ? C.act : (i >= 6 && i <= 9) ? C.jud : C.base2; }
  var f5lv = 0, f5cur = F5.map(function (r) { return r[0]; }), f5els = null, f5timer = null, f5played = false;
  var f5steps = document.getElementById('f5-steps'), f5note = document.getElementById('f5-note'), f5play = document.getElementById('f5-play');
  seg(f5steps, F5S, 0, function (i) { stop5(); level5(i); });
  function level5(i) {
    f5lv = i;
    Array.prototype.forEach.call(f5steps.children, function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    f5note.innerHTML = F5N[i];
    var from = f5cur.slice();
    tween(600, function (k) { f5cur = from.map(function (a, j) { return a + (F5[j][i] - a) * k; }); paint5(); });
  }
  mount('f5', function (host, W) {
    var narrow = W < 640, H = narrow ? 250 : 290, top = 18, bot = narrow ? 34 : 62, lx = 30;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '12 个步骤的 Progress 得分' }, host);
    var ph = H - top - bot, Y = function (v) { return top + ph * (1 - v); };
    [0, 0.5, 1].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v === 0 ? '0' : v); });
    var cw = (W - lx) / 12, bw = Math.min(40, cw * 0.62), bars = [], vals = [];
    F5A.forEach(function (a, i) {
      var x = lx + i * cw + (cw - bw) / 2;
      bars.push(S('rect', { x: x, width: bw, rx: 3, fill: f5col(i), class: 'rb', style: '--d:' + (i * 40) + 'ms', 'data-tl': '第 ' + (i + 1) + ' 步 · ' + a, 'data-tc': f5col(i), tabindex: 0 }, s));
      vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: 'val rf', style: '--d:' + (i * 40) + 'ms;font-size:' + (narrow ? 10 : 11.5) + 'px' }, s, ''));
      S('text', { x: x + bw / 2, y: H - bot + 15, 'text-anchor': 'middle', class: 'lbl-b' }, s, i + 1);
      if (!narrow) wrapText(a, 11).forEach(function (ln, k) { S('text', { x: x + bw / 2, y: H - bot + 31 + k * 13, 'text-anchor': 'middle', style: 'font-size:11px' }, s, ln); });
    });
    if (narrow) S('text', { x: lx, y: H - 4, style: 'font-size:11px' }, s, '横轴为步骤序号，悬停或点按柱子可查看对应动作。');
    var lg = S('g', {}, s), lx2 = W - (narrow ? 210 : 320);
    [[C.act, '过早放置'], [C.jud, '为加热所做的步骤']].forEach(function (p, k) {
      var x = lx2 + k * (narrow ? 105 : 160);
      S('rect', { x: x, y: 2, width: 10, height: 10, rx: 3, fill: p[0] }, lg);
      S('text', { x: x + 15, y: 11, style: 'font-size:11.5px' }, lg, p[1]);
    });
    f5els = { bars: bars, vals: vals, Y: Y }; paint5(); B.rise(s);
  });
  function paint5() {
    if (!f5els) return;
    f5cur.forEach(function (v, i) {
      var r = f5els.bars[i]; r.setAttribute('y', f5els.Y(v).toFixed(1)); r.setAttribute('height', (f5els.Y(0) - f5els.Y(v)).toFixed(1)); r.setAttribute('data-tv', v.toFixed(2));
      var t = f5els.vals[i]; t.setAttribute('y', (f5els.Y(v) - 5).toFixed(1)); t.textContent = v.toFixed(2);
    });
  }
  function setPlay(on) {
    f5play.querySelector('span').textContent = on ? '暂停' : (f5lv === 5 ? '重播' : '播放');
    f5play.querySelector('svg').innerHTML = on ? '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>' : '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>';
  }
  function stop5() { if (f5timer) { clearInterval(f5timer); f5timer = null; } setPlay(false); }
  function play5() {
    if (f5lv === 5) level5(0);
    setPlay(true);
    f5timer = setInterval(function () { if (f5lv >= 5) { stop5(); return; } level5(f5lv + 1); if (f5lv >= 5) stop5(); }, 2300);
  }
  f5note.innerHTML = F5N[0];
  f5play.addEventListener('click', function () { if (f5timer) stop5(); else play5(); });
  if (!reduce && 'IntersectionObserver' in window) {
    var f5o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && es[0].intersectionRatio >= 0.55 && !f5played) { f5played = true; f5o.disconnect(); setTimeout(play5, 1200); }
    }, { threshold: [0, 0.55] });
    f5o.observe(document.getElementById('fig-5'));
  }

  /* ================= Figure 6: what the teacher adds (Eq. 2, Figure 1 example scores) ================= */
  var F6 = [['拿起杯子', .85, 1], ['再拿(无效)', .07, 1], ['加热杯子', .95, 1], ['放下', .98, 1], ['放下冷杯子', .10, 2], ['取回杯子', .82, 2], ['加热杯子', .93, 2], ['放下', .99, 2]];
  var F6M = F6.reduce(function (a, d) { return a + d[1]; }, 0) / F6.length, f6lam = 0.5, f6els = null;
  mount('f6', function (host, W) {
    var narrow = W < 600, H = 250, top = 16, bot = narrow ? 40 : 56, lx = 40, R = 0.7;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '每个动作上的老师项' }, host);
    var mid = top + (H - top - bot) / 2, Y = function (v) { return mid - (H - top - bot) / 2 * v / R; };
    [-0.5, 0, 0.5].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: v === 0 ? 'axis' : 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v > 0 ? '+' + v : v === 0 ? '0' : '−' + Math.abs(v)); });
    var gap = 22, cw = (W - lx - gap) / 8, bw = Math.min(42, cw * .6), bars = [], vals = [];
    F6.forEach(function (d, i) {
      var x = lx + i * cw + (i >= 4 ? gap : 0) + (cw - bw) / 2;
      bars.push(S('rect', { x: x, width: bw, rx: 3, class: 'f6-bar', 'data-tl': 'Rollout ' + d[2] + ' · ' + d[0], tabindex: 0 }, s));
      vals.push(S('text', { x: x + bw / 2, 'text-anchor': 'middle', class: 'val-b f6-v' }, s, ''));
      if (narrow) S('text', { x: x + bw / 2, y: H - bot + 16, 'text-anchor': 'middle', style: 'font-size:10.5px' }, s, 's=' + d[1].toFixed(2));
      else wrapText(d[0], 12).forEach(function (ln, k) { S('text', { x: x + bw / 2, y: H - bot + 16 + k * 13, 'text-anchor': 'middle', style: 'font-size:11px' }, s, ln); });
    });
    S('text', { x: lx + cw * 2, y: H - 4, 'text-anchor': 'middle', class: 'lbl-b' }, s, 'Rollout 1');
    S('text', { x: lx + gap + cw * 6, y: H - 4, 'text-anchor': 'middle', class: 'lbl-b' }, s, 'Rollout 2');
    f6els = { bars: bars, vals: vals, Y: Y }; paint6(); B.rise(s);
  });
  function paint6() {
    if (!f6els) return;
    F6.forEach(function (d, i) {
      var v = f6lam * (d[1] - F6M), y0 = f6els.Y(0), y = f6els.Y(v), r = f6els.bars[i], col = v >= 0 ? C.tea : C.bad;
      r.setAttribute('y', Math.min(y, y0).toFixed(1)); r.setAttribute('height', Math.max(0.5, Math.abs(y - y0)).toFixed(1)); r.setAttribute('fill', col);
      r.setAttribute('data-tv', (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3)); r.setAttribute('data-tc', col);
      r.setAttribute('data-tn', '得分 ' + d[1].toFixed(2) + '，组均值 ' + F6M.toFixed(2));
      var t = f6els.vals[i]; t.setAttribute('y', (v >= 0 ? y - 6 : y + 14).toFixed(1)); t.textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2); t.setAttribute('fill', col);
    });
  }
  var f6in = document.getElementById('f6-l'), f6lv = document.getElementById('f6-lv');
  if (f6in) f6in.addEventListener('input', function () { f6lam = +f6in.value; f6lv.textContent = f6lam.toFixed(2); paint6(); });

  /* ================= Figure 7: trained policies (Table 3) ================= */
  var F7G = ['Pick', 'Look', 'Pick2', 'Clean', 'Heat', 'Cool', 'ALFWorld 总体', 'WebShop'];
  var F7 = { // [mean, std] per group; WebShop = success rate
    grpo: [[85.3, 1.5], [53.7, 8.0], [53.5, 5.6], [84.5, 6.8], [78.2, 7.9], [59.7, 5.0], [72.8, 3.6], [56.8, 3.8]],
    pv: [[95.2, 4.4], [66.7, 11.8], [73.6, 4.8], [81.5, 9.8], [77.1, 7.2], [66.7, 2.3], [79.0, 3.6], [67.7, 0.5]],
    pp: [[87.6, 1.6], [56.4, 4.4], [72.2, 4.8], [81.5, 3.7], [83.3, 7.2], [76.0, 4.0], [78.3, 0.4], [66.6, 0.2]],
    hv: [[84.8, 1.6], [59.0, 4.4], [48.6, 8.7], [72.8, 2.1], [68.8, 6.2], [69.3, 2.3], [69.3, 0.7], [68.3, 1.5]],
    hp: [[90.5, 1.6], [74.4, 11.8], [65.3, 6.4], [88.9, 7.4], [89.6, 3.6], [82.7, 2.3], [82.9, 2.9], [71.4, 0.7]],
    grpo7: [[90.8, 5.1], [66.1, 6.7], [64.7, 7.3], [89.3, 5.4], [74.7, 6.9], [72.5, 5.4], [77.6, 5.2], [66.1, 3.7]],
    hp7: [[91.4, 5.7], [74.4, 11.8], [75.0, 7.2], [92.6, 0.0], [77.1, 9.5], [81.3, 2.3], [83.8, 1.6], [73.6, 0.3]]
  };
  var F7S = [['Hindsight + Progress', 'hp', 'grpo', C.tea], ['Hindsight + Value', 'hv', 'grpo', '#8fb08a'], ['Prefix + Progress', 'pp', 'grpo', '#9ab9a0'], ['Prefix + Value', 'pv', 'grpo', '#a9c2a5'], ['7B，Hindsight + Progress', 'hp7', 'grpo7', C.tea]];
  var f7s = 0, f7cur = { a: F7.hp.map(function (d) { return d.slice(); }), b: F7.grpo.map(function (d) { return d.slice(); }) }, f7els = null;
  seg(document.getElementById('f7-set'), F7S.map(function (d) { return d[0]; }), 0, function (i) {
    f7s = i;
    var to = { a: F7[F7S[i][1]], b: F7[F7S[i][2]] }, from = { a: f7cur.a.map(function (d) { return d.slice(); }), b: f7cur.b.map(function (d) { return d.slice(); }) };
    document.getElementById('f7-name').textContent = F7S[i][0];
    document.getElementById('f7-key').style.background = F7S[i][3];
    tween(600, function (k) {
      ['a', 'b'].forEach(function (s) { f7cur[s] = from[s].map(function (d, j) { return [d[0] + (to[s][j][0] - d[0]) * k, d[1] + (to[s][j][1] - d[1]) * k]; }); });
      paint7();
    });
  });
  mount('f7', function (host, W) {
    var narrow = W < 640, H = narrow ? 260 : 290, top = 20, bot = narrow ? 44 : 40, lx = 30;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '策略成功率' }, host);
    var ph = H - top - bot, Y = function (v) { return top + ph * (1 - v / 100); };
    [0, 25, 50, 75, 100].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var gap = 18, gw = (W - lx - gap) / 8, bw = Math.min(30, gw * .34), els = { a: [], b: [], ea: [], va: [], Y: Y };
    F7G.forEach(function (g, i) {
      var gx = lx + i * gw + (i >= 6 ? gap : 0), x1 = gx + gw / 2 - bw - 2, x2 = gx + gw / 2 + 2;
      els.b.push(S('rect', { x: x1, width: bw, rx: 3, fill: C.base2, class: 'rb', style: '--d:' + (i * 50) + 'ms', 'data-tc': C.base2, tabindex: 0 }, s));
      els.a.push(S('rect', { x: x2, width: bw, rx: 3, class: 'rb', style: '--d:' + (i * 50 + 120) + 'ms', tabindex: 0 }, s));
      els.ea.push(S('path', { stroke: C.ink, 'stroke-width': 1, fill: 'none', class: 'rf', style: '--d:' + (i * 50 + 120) + 'ms', opacity: .55 }, s));
      els.va.push(S('text', { x: x2 + bw / 2, 'text-anchor': 'middle', class: 'val-b rf', style: '--d:' + (i * 50 + 120) + 'ms;font-size:' + (narrow ? 9.5 : 11.5) + 'px' }, s, ''));
      var lab = narrow ? g.replace('ALFWorld 总体', 'ALF 总体').replace('WebShop', 'Web') : g;
      S('text', { x: gx + gw / 2, y: H - bot + 16, 'text-anchor': 'middle', class: i >= 6 ? 'lbl-b' : 'lbl', style: narrow ? 'font-size:10.5px' : '' }, s, lab);
    });
    S('line', { x1: lx + 6 * gw + gap / 2, x2: lx + 6 * gw + gap / 2, y1: top - 6, y2: H - bot + 22, stroke: C.base2, 'stroke-dasharray': '3 3' }, s);
    if (!narrow) { S('text', { x: lx + 3 * gw, y: H - 6, 'text-anchor': 'middle', style: 'font-size:11.5px' }, s, 'ALFWorld 各任务类型'); S('text', { x: lx + gap + 7 * gw, y: H - 6, 'text-anchor': 'middle', style: 'font-size:11.5px' }, s, '总体'); }
    f7els = els; paint7(); B.rise(s);
  });
  function paint7() {
    if (!f7els) return;
    var Y = f7els.Y, col = F7S[f7s][3];
    F7G.forEach(function (g, i) {
      var a = f7cur.a[i], b = f7cur.b[i];
      var rb = f7els.b[i]; rb.setAttribute('y', Y(b[0]).toFixed(1)); rb.setAttribute('height', (Y(0) - Y(b[0])).toFixed(1));
      rb.setAttribute('data-tv', fmt(b[0]) + ' ± ' + fmt(b[1])); rb.setAttribute('data-tl', (f7s === 4 ? '7B GRPO' : 'GRPO') + ' · ' + g);
      var ra = f7els.a[i]; ra.setAttribute('y', Y(a[0]).toFixed(1)); ra.setAttribute('height', (Y(0) - Y(a[0])).toFixed(1)); ra.setAttribute('fill', col);
      ra.setAttribute('data-tv', fmt(a[0]) + ' ± ' + fmt(a[1])); ra.setAttribute('data-tl', F7S[f7s][0] + ' · ' + g); ra.setAttribute('data-tc', col);
      ra.setAttribute('data-tn', '相对 GRPO ' + (a[0] - b[0] >= 0 ? '+' : '−') + fmt(Math.abs(a[0] - b[0])));
      var x = +ra.getAttribute('x') + +ra.getAttribute('width') / 2, w = 4;
      f7els.ea[i].setAttribute('d', 'M' + x + ' ' + Y(a[0] + a[1]) + 'V' + Y(Math.max(0, a[0] - a[1])) + 'M' + (x - w) + ' ' + Y(a[0] + a[1]) + 'h' + 2 * w + 'M' + (x - w) + ' ' + Y(Math.max(0, a[0] - a[1])) + 'h' + 2 * w);
      var tv = f7els.va[i]; tv.setAttribute('y', (Y(Math.min(100, a[0] + a[1])) - 6).toFixed(1)); tv.textContent = fmt(a[0]);
    });
  }

  /* ================= Figure 8: JEV acting vs the policy it taught (Tables 2 and 3) ================= */
  var F8 = [['Pick', 77.1, 90.5], ['Look', 46.2, 74.4], ['Pick2', 70.8, 65.3], ['Clean', 11.1, 88.9], ['Heat', 18.8, 89.6], ['Cool', 16.0, 82.7], ['全部', 42.9, 82.9]];
  mount('f8', function (host, W) {
    var narrow = W < 520, lx = narrow ? 52 : 74, rx = W - (narrow ? 44 : 60), top = 10, rh = 34, H = top + F8.length * rh + 34;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'JEV 自己执行与它教出的策略对比' }, host);
    function X(v) { return lx + (rx - lx) * v / 100; }
    var dfs = S('defs', {}, s), mk = S('marker', { id: 'f8a', viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, dfs);
    S('path', { d: 'M0 0L10 5L0 10z', fill: '#9aa3ae' }, mk);
    [0, 25, 50, 75, 100].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: top - 4, y2: H - 24, class: 'grid' }, s); S('text', { x: X(v), y: H - 8, 'text-anchor': 'middle' }, s, v + (v === 100 ? '%' : '')); });
    F8.forEach(function (d, i) {
      var y = top + i * rh + rh / 2 + (i >= 3 ? 4 : 0) + (i >= 6 ? 8 : 0), dep = i >= 3 && i <= 5;
      if (i === 6) S('line', { x1: 0, x2: W, y1: y - rh / 2 - 2, y2: y - rh / 2 - 2, stroke: C.base2 }, s);
      S('text', { x: 0, y: y + 4, class: dep || i === 6 ? 'lbl-b' : 'lbl', fill: dep ? C.actInk : null }, s, d[0]);
      var up = d[2] >= d[1];
      S('line', { x1: X(d[1]), x2: X(d[2]) + (up ? -7 : 7), y1: y, y2: y, stroke: '#9aa3ae', 'stroke-width': 1.6, 'marker-end': 'url(#f8a)', class: 'rl', pathLength: 1, style: '--d:' + (i * 110 + 250) + 'ms' }, s);
      S('circle', { cx: X(d[1]), cy: y, r: 5.5, fill: C.act, class: 'rf', style: '--d:' + (i * 110) + 'ms', 'data-tv': fmt(d[1]) + '%', 'data-tl': 'JEV 作执行者 · ' + d[0], 'data-tc': C.act, tabindex: 0 }, s);
      S('circle', { cx: X(d[2]), cy: y, r: 6, fill: C.tea, class: 'rf', style: '--d:' + (i * 110 + 650) + 'ms', 'data-tv': fmt(d[2]) + '%', 'data-tl': 'JEV 教出的策略 · ' + d[0], 'data-tc': C.tea, tabindex: 0 }, s);
      var dv = d[2] - d[1];
      S('text', { x: rx + 10, y: y + 4, class: (dv > 0 ? 'val-b' : 'val') + ' rf', fill: dv > 0 ? C.teaInk : C.bad, style: '--d:' + (i * 110 + 650) + 'ms' }, s, (dv > 0 ? '+' : '−') + fmt(Math.abs(dv)));
    });
    B.rise(s);
  });
})();
