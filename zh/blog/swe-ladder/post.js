/* Figures for "SWE-Ladder". Every number comes from arXiv:2610.33667 (tables and figures cited inline). */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { loc: '#3b7fe0', locInk: '#1f5fbf', rep: '#2fa874', repInk: '#1d7a52', patch: '#e3693f', patchInk: '#b8481f', ver: '#8a63d2',
    ink: '#151a22', mute: '#6b7382', base: '#a9b1bc', base2: '#cfd5dd', bad: '#c4553f' };
  var STC = { LOC: C.loc, REP: C.rep, PATCH: C.patch };

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function win(t, a, b) { return clamp((t - a) / (b - a)); }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function soft(k) { return 1 - Math.pow(1 - k, 3); }
  function fmt(v, d) { return v.toFixed(d === undefined ? 1 : d); }
  function sgn(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d === undefined ? 1 : d); }
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
  function seg(el, items, cur, onPick) {
    el.innerHTML = '';
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = it; b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
      b.addEventListener('click', function () { press(el, i); onPick(i); });
      el.appendChild(b);
    });
  }
  function press(el, i) { Array.prototype.forEach.call(el.children, function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); }
  function playIcon(btn, on, label) {
    btn.querySelector('span').textContent = label;
    btn.querySelector('svg').innerHTML = on ? '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>' : '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>';
  }
  function onceVisible(el, ratio, fn) {
    if (reduce || !('IntersectionObserver' in window) || !el) return;
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting && es[0].intersectionRatio >= ratio) { o.disconnect(); fn(); } }, { threshold: [0, ratio] });
    o.observe(el);
  }

  /* ================= Figure 1: rollout, router and the three phases ================= */
  (function () {
    var fig = document.querySelector('#fig-1 .m2'); if (!fig) return;
    var STEPS = [ // paper Table 7: a 21-step oauthlib trajectory labelled by the rule-based router
      ['1–3', 'search', 'nonce, add_id_token, …', 'LOC'],
      ['4–7', 'view', 'grant_types/', 'LOC'],
      ['8', 'create', 'reproduce_issue.py', 'REP'],
      ['9', 'run', 'python3 reproduce_issue.py', 'REP'],
      ['10–11', 'str_replace', 'grant_types/', 'PATCH'],
      ['12', 'run', 'python3 reproduce_issue.py', 'REP', '第 12 步：修补中途重新运行复现脚本，状态从 PATCH 退回 REP。'],
      ['13–14', 'view', 'request_validator.py', 'REP'],
      ['15', 'view', 'tokens.py', 'LOC', '第 15 步：连续第三次查看代码，状态从 REP 回到 LOC。'],
      ['16–20', 'edit / run', 'reproduce_issue.py', 'REP'],
      ['21', 'submit', 'finish', 'REP']
    ];
    var EV = {
      LOC: ['定位证据：该看哪里', ['{', '  <span class="key">"file"</span>: <span class="str">"oauthlib/common.py"</span>,', '  <span class="key">"removed_lines"</span>: [', '    <span class="str">"310: key = self.proxy.get(k.upper(), k)"</span>', '  ]', '}']],
      REP: ['复现证据：怎样触发故障', ['<span class="key">test_cmd.py</span>', 'def test_login():', '    ...', '    assert user.role == <span class="str">"admin"</span>']],
      PATCH: ['补丁证据：该改什么', ['--- a/auth.py', '+++ b/auth.py', '@@ def login(user):', '<span class="del">-    if user.is_admin:</span>', '<span class="add">+    if user.role == "admin":</span>']]
    };
    var STAGES = ['LOC', 'REP', 'PATCH'];
    var P = [0, 7600, 12800, 18000], END = 23200, CYCLE = 23800, A0 = 300, DT = 640;
    var stepsEl = document.getElementById('m2-steps'), cellsEl = document.getElementById('m2-cells'), note = document.getElementById('m2-note');
    var evEl = document.getElementById('m2-ev'), evT = evEl.querySelector('.m2-ev-t'), evPre = evEl.querySelector('pre'), lossEl = document.getElementById('m2-loss');
    var tabs = fig.querySelectorAll('.m2-tab'), pp = fig.querySelector('.m2-pp'), fsm = fig.querySelectorAll('.m2-st'), rungs = {}, grpo = fig.querySelector('.m2-grpo');
    Array.prototype.forEach.call(fig.querySelectorAll('.m2-rung'), function (r) { rungs[r.dataset.r] = r; });
    var chips = STEPS.map(function (s, i) {
      var d = document.createElement('div'); d.className = 'm2-step'; d.setAttribute('data-tv', s[3]); d.setAttribute('data-tl', '第 ' + s[0] + ' 步 · ' + s[1] + ' ' + s[2]); d.setAttribute('data-tc', STC[s[3]]);
      d.innerHTML = '<span class="n">' + s[0] + '</span><span class="t">' + s[1] + '</span><span class="a">' + s[2] + '</span><span class="lab">' + s[3] + '</span>';
      stepsEl.appendChild(d);
      var c = document.createElement('div'); c.className = 'm2-cell'; c.setAttribute('data-st', s[3]); c.textContent = '0'; cellsEl.appendChild(c);
      return { el: d, cell: c, lab: d.querySelector('.lab'), st: s[3], note: s[4], a: A0 + i * DT };
    });
    var evKey, evLines = [];
    function setEvidence(st) {
      if (st === evKey) return; evKey = st;
      if (!st) { evT.textContent = '阶段 0：教师尚未加入'; evPre.innerHTML = '<span style="color:#8b95a3">智能体端到端生成 rollout。\n到了训练阶段，教师才介入。</span>'; evLines = []; return; }
      evT.textContent = EV[st][0];
      evPre.innerHTML = EV[st][1].map(function (l) { return '<span class="ln">' + l + '</span>'; }).join('\n');
      evLines = Array.prototype.slice.call(evPre.querySelectorAll('.ln'));
    }
    function phaseOf(t) { return t < P[1] ? 0 : t < P[2] ? 1 : t < P[3] ? 2 : 3; }
    function render(t) {
      var ph = phaseOf(t);
      if (fig.getAttribute('data-phase') !== String(ph)) fig.setAttribute('data-phase', ph);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.querySelector('.m2-prog').style.setProperty('--p', win(t, P[i], i < 3 ? P[i + 1] : END).toFixed(3)); });
      // Phase 0: steps appear and get labelled one by one
      var state = null, cur = -1, msg = '';
      chips.forEach(function (c, i) {
        var k = soft(win(t, c.a, c.a + 260)), lab = t >= c.a + 300;
        c.el.style.opacity = (0.15 + 0.85 * k).toFixed(3);
        c.el.style.transform = k < 1 ? 'translateY(' + ((1 - k) * 6).toFixed(1) + 'px)' : '';
        c.lab.style.visibility = lab ? 'visible' : 'hidden';
        c.el.setAttribute('data-st', lab ? c.st : '');
        c.el.style.borderColor = lab ? STC[c.st] : '';
        c.el.classList.toggle('back', lab && !!c.note);
        if (lab) { state = c.st; cur = i; if (c.note && t < c.a + 300 + 2600) msg = c.note; }
      });
      chips.forEach(function (c, i) { c.el.classList.toggle('cur', ph === 0 && i === cur && t < A0 + STEPS.length * DT + 300); });
      if (ph > 0) state = STAGES[ph - 1];
      Array.prototype.forEach.call(fsm, function (n) { n.classList.toggle('on', n.dataset.s === state); });
      if (ph === 0 && !msg && t > A0 + STEPS.length * DT + 300) msg = '标签会来回切换，但从不限制智能体做什么，只决定教师能看到哪些证据。';
      if (ph > 0) msg = '';
      if (note.textContent !== (msg || ' ')) note.textContent = msg || ' ';
      grpo.style.opacity = (0.35 + 0.65 * soft(win(t, 6700, 7200))).toFixed(3);
      // Phases 1–3: the active rung, its evidence, and the distillation mask
      var active = ph > 0 ? STAGES[ph - 1] : null, s0 = ph > 0 ? P[ph] : 0;
      STAGES.forEach(function (st, i) { rungs[st].classList.toggle('on', st === active); rungs[st].classList.toggle('done', ph > i + 1); });
      setEvidence(active);
      evLines.forEach(function (ln, j) { var k = soft(win(t, s0 + 300 + j * 230, s0 + 500 + j * 230)); ln.style.opacity = k.toFixed(3); });
      var lit = 0;
      chips.forEach(function (c) {
        var on = !!active && c.st === active;
        var k = on ? t >= s0 + 1900 + lit * 160 : false;
        if (on) lit++;
        c.cell.classList.toggle('on', k);
        c.cell.textContent = k ? '1' : '0';
        if (ph > 0) { c.el.style.opacity = on ? '1' : '0.35'; }
      });
      lossEl.textContent = active && t >= s0 + 1900 ? active + ' 步骤' : '当前阶段';
      fig.style.opacity = (1 - win(t, END, CYCLE)).toFixed(3);
    }

    var params = new URLSearchParams(location.search), freeze = params.has('f1t') ? +params.get('f1t') : null;
    if (reduce && freeze === null) {
      render(P[1] - 400);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.addEventListener('click', function () { render(i ? P[i] + 2600 : P[1] - 400); }); });
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
      paused = !paused; pp.setAttribute('aria-pressed', paused ? 'true' : 'false'); playIcon(pp, !paused, paused ? '播放' : '暂停'); update();
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
    render(now());
    update();
  })();

  /* ================= Result cards ================= */
  var CARDS = [
    { max: 20, rows: [['Qwen3-4B 基座', 9.6, C.base], ['GRPO', 10.4, C.base], ['GRPO + OPSD（完整补丁）', 12.4, C.base], ['SWE-Ladder', 16.4, C.loc]] },
    { max: 20, rows: [['Qwen3-4B 基座', 13.0, C.base], ['GRPO', 11.2, C.base], ['GRPO + OPSD（完整补丁）', 12.4, C.base], ['SWE-Ladder', 17.6, C.loc]] },
    { max: 20, rows: [['LOC → REP → PATCH', 16.4, C.loc], ['REP → LOC → PATCH', 12.6, C.base], ['PATCH → REP → LOC', 11.4, C.base]] },
    { max: 100, rows: [['Qwen3-4B 基座', 84.2, C.base], ['GRPO', 36.0, C.base], ['SWE-Ladder', 98.6, C.loc]] }
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var cd = CARDS[+el.dataset.card]; el.id = 'card-' + el.dataset.card;
    mount(el.id, function (host, W) {
      var rowH = 30, H = cd.rows.length * rowH + 16, vw = W - 46;
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': cd.rows.map(function (r) { return r[0] + ' ' + r[1] + '%'; }).join(', ') }, host);
      cd.rows.forEach(function (r, i) {
        var y = i * rowH, best = r[2] === C.loc;
        S('text', { x: 0, y: y + 10, class: best ? 'lbl-b' : 'lbl', style: 'font-size:11.5px' }, s, r[0]);
        S('rect', { x: 0, y: y + 15, width: vw, height: 8, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 15, width: vw * r[1] / cd.max, height: 8, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tv': fmt(r[1]) + '%', 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / cd.max + 6, y: y + 22.5, class: (best ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 90) + 'ms' }, s, fmt(r[1]) + '%');
      });
      S('text', { x: vw, y: H - 1, 'text-anchor': 'end', style: 'font-size:10px' }, s, '横轴 0–' + cd.max + '%');
      B.rise(s);
    });
  });

  /* ================= Figure 2: main results (Table 2) ================= */
  var F2M = ['基座', 'GRPO', 'GRPO+OPSD', 'SDAR', 'SWE-Ladder'];
  var F2 = { // [pass@1, avg steps, env_done]
    'R2E-Gym': [[9.6, 26.5, 84.2], [10.4, 82.9, 36.0], [12.4, 39.7, 67.4], [4.6, 34.5, 88.0], [16.4, 19.3, 98.6]],
    'OpenHands': [[13.0, 40.8, 79.2], [11.2, 56.2, 78.6], [12.4, 15.4, 99.0], [6.8, 37.4, 92.8], [17.6, 16.6, 99.4]]
  };
  var F2X = [['pass@1', 20, 'pass@1 (%)', '%'], ['平均步数', 90, '每条轨迹的平均步数（越低越好）', ''], ['env_done', 100, '轨迹完成率 env_done（%）', '%']];
  var f2s = 'R2E-Gym', f2m = 0, f2cur = F2['R2E-Gym'].map(function (r) { return r[0]; }), f2els = null;
  function f2target() { return F2[f2s].map(function (r) { return r[f2m]; }); }
  function f2go() {
    document.getElementById('f2-title').textContent = F2X[f2m][2];
    var from = f2cur.slice(), to = f2target();
    tween(600, function (k) { f2cur = from.map(function (a, i) { return a + (to[i] - a) * k; }); paint2(); });
  }
  seg(document.getElementById('f2-scaf'), ['R2E-Gym', 'OpenHands'], 0, function (i) { f2s = i ? 'OpenHands' : 'R2E-Gym'; f2go(); });
  seg(document.getElementById('f2-met'), F2X.map(function (x) { return x[0]; }), 0, function (i) {
    f2m = i; var to = f2target(); f2cur = f2cur.map(function (v, j) { return Math.min(v, to[j]) * 0; }); f2go();
  });
  mount('f2', function (host, W) {
    var lx = W < 520 ? 92 : 118, rx = W - 54, top = 6, rh = 40, H = top + F2M.length * rh + 22;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'SWE-bench Verified 结果' }, host);
    var ax = S('g', {}, s), bars = [], vals = [];
    F2M.forEach(function (m, i) {
      var y = top + i * rh, ours = m === 'SWE-Ladder';
      S('text', { x: 0, y: y + rh / 2 + 4, class: ours ? 'lbl-b' : 'lbl', fill: ours ? C.locInk : null }, s, m);
      S('rect', { x: lx, y: y + 9, width: rx - lx, height: rh - 18, rx: 4, fill: '#f3f5f8' }, s);
      bars.push(S('rect', { x: lx, y: y + 9, height: rh - 18, rx: 4, fill: ours ? C.loc : m === '基座' ? '#8e98a6' : C.base2, class: 'rbx', style: '--d:' + (i * 80) + 'ms', 'data-tl': m, 'data-tc': ours ? C.loc : C.base2, tabindex: 0 }, s));
      vals.push(S('text', { y: y + rh / 2 + 4, class: (ours ? 'val-b' : 'val') + ' rf', style: '--d:' + (i * 80) + 'ms' }, s, ''));
    });
    var bl = S('line', { y1: top + 2, y2: top + F2M.length * rh - 2, stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: .55 }, s);
    var bt = S('text', { y: H - 6, 'text-anchor': 'middle', style: 'font-size:11px' }, s, '基座');
    f2els = { bars: bars, vals: vals, lx: lx, rx: rx, bl: bl, bt: bt, ax: ax, H: H, top: top };
    paint2(); B.rise(s);
  });
  function paint2() {
    if (!f2els) return;
    var e = f2els, mx = F2X[f2m][1], unit = F2X[f2m][3], X = function (v) { return e.lx + (e.rx - e.lx) * v / mx; };
    f2cur.forEach(function (v, i) {
      e.bars[i].setAttribute('width', Math.max(0, X(v) - e.lx).toFixed(1));
      e.bars[i].setAttribute('data-tv', fmt(v) + unit);
      var real = F2[f2s][i];
      e.bars[i].setAttribute('data-tn', 'pass@1 ' + real[0] + '% · ' + real[1] + ' 步 · env_done ' + real[2] + '%');
      e.vals[i].setAttribute('x', (X(v) + 6).toFixed(1)); e.vals[i].textContent = fmt(v) + unit;
    });
    var bx = X(f2cur[0]);
    e.bl.setAttribute('x1', bx); e.bl.setAttribute('x2', bx); e.bt.setAttribute('x', bx);
  }

  /* ================= Figure 3: along the ladder (Figure 7) ================= */
  var CK = ['基座', 'LOC30', 'REP50', 'PATCH70'];
  var F3 = [['定位', [0, 11.4, 16.4, 18.4], C.loc, 33.6], ['复现', [0, 0.8, -13.2, 0.6], C.rep, 59.4], ['验证', [0, 0.6, -11.0, 7.4], C.ver, 22.6], ['pass@1', [0, 4.8, 4.4, 6.8], C.ink, 9.6]];
  var F3N = [
    '基座模型：定位 33.6%，复现 59.4%，验证 22.6%，pass@1 9.6%。',
    '<b>LOC</b> 阶段结束，四项指标全部上升：定位 +11.4 个百分点，pass@1 +4.8。',
    '<b>REP</b> 阶段定位继续上升（+16.4），复现（−13.2）和验证（−11.0）却跌到基座模型以下。',
    '<b>PATCH</b> 阶段把这两项拉了回来：复现 +0.6，验证 +7.4，pass@1 达到 16.4%（+6.8），四项全部高于基座模型。'
  ];
  var f3k = 3, f3els = null, f3timer = null, f3shown = 3;
  var f3seg = document.getElementById('f3-ck'), f3note = document.getElementById('f3-note'), f3play = document.getElementById('f3-play');
  seg(f3seg, CK, 3, function (i) { stop3(); go3(i); });
  function go3(i) {
    var from = f3shown; f3k = i; press(f3seg, i); f3note.innerHTML = F3N[i];
    tween(700, function (k) { f3shown = from + (i - from) * k; paint3(); });
  }
  mount('f3', function (host, W) {
    var narrow = W < 560, H = 300, top = 16, bot = 34, lx = 40, rx = W - (narrow ? 86 : 108);
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '各检查点的能力变化' }, host);
    var lo = -16, hi = 22, Y = function (v) { return top + (H - top - bot) * (hi - v) / (hi - lo); }, X = function (i) { return lx + (rx - lx) * i / 3; };
    [[0, 1, 'rgba(59,127,224,.07)', 'LOC'], [1, 2, 'rgba(47,168,116,.08)', 'REP'], [2, 3, 'rgba(227,105,63,.08)', 'PATCH']].forEach(function (b) {
      S('rect', { x: X(b[0]), y: top, width: X(b[1]) - X(b[0]), height: H - top - bot, fill: b[2] }, s);
      S('text', { x: (X(b[0]) + X(b[1])) / 2, y: top + 12, 'text-anchor': 'middle', style: 'font-size:11px;font-weight:700;letter-spacing:.05em', fill: STC[b[3]] }, s, b[3] + ' 阶段');
    });
    [-10, 0, 10, 20].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: v === 0 ? 'axis' : 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v > 0 ? '+' + v : v === 0 ? '0' : '−' + Math.abs(v)); });
    CK.forEach(function (c, i) { S('text', { x: X(i), y: H - 12, 'text-anchor': 'middle', class: 'lbl-b' }, s, c); });
    var clipId = 'f3c' + Math.random().toString(36).slice(2, 7), cp = S('clipPath', { id: clipId }, S('defs', {}, s));
    var clipR = S('rect', { x: 0, y: 0, height: H, width: X(3) + 2 }, cp);
    var lines = [], dots = [], labs = [];
    F3.forEach(function (m, j) {
      var d = m[1].map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
      lines.push(S('path', { d: d, fill: 'none', stroke: m[2], 'stroke-width': j === 3 ? 3 : 2.2, 'stroke-linejoin': 'round', 'clip-path': 'url(#' + clipId + ')' }, s));
      dots.push(m[1].map(function (v, i) {
        return S('circle', { cx: X(i), cy: Y(v), r: j === 3 ? 5 : 4.2, fill: '#fff', stroke: m[2], 'stroke-width': 2.2, 'data-tv': sgn(v) + ' 个百分点', 'data-tl': m[0] + ' · ' + CK[i], 'data-tc': m[2], 'data-tn': fmt(m[3] + v) + '%（基座 ' + m[3] + '%）', tabindex: 0 }, s);
      }));
      labs.push(S('text', { x: X(3) + 10, class: j === 3 ? 'val-b' : 'val', fill: m[2] }, s, ''));
    });
    f3els = { lines: lines, dots: dots, labs: labs, clipR: clipR, X: X, Y: Y };
    paint3();
  });
  function paint3() {
    if (!f3els) return;
    var e = f3els, k = f3shown, cut = Math.floor(k), fr = k - cut;
    e.clipR.setAttribute('width', (e.X(Math.min(3, k)) + 3).toFixed(1));
    var lab = F3.map(function (m) { var a = m[1][Math.min(3, cut)], b = m[1][Math.min(3, cut + 1)]; return a + (b - a) * fr; });
    var ys = lab.map(function (v) { return e.Y(v); }), order = ys.map(function (y, i) { return [y, i]; }).sort(function (a, b) { return a[0] - b[0]; });
    for (var q = 1; q < order.length; q++) if (order[q][0] - order[q - 1][0] < 14) order[q][0] = order[q - 1][0] + 14;
    order.forEach(function (o) { ys[o[1]] = o[0]; });
    F3.forEach(function (m, j) {
      e.dots[j].forEach(function (d, i) { d.style.opacity = i <= k + 0.01 ? '1' : '0'; });
      e.labs[j].setAttribute('x', (e.X(Math.min(3, k)) + 10).toFixed(1));
      e.labs[j].setAttribute('y', (ys[j] + 4).toFixed(1));
      e.labs[j].textContent = m[0] + ' ' + sgn(lab[j]);
    });
  }
  function stop3() { if (f3timer) { clearInterval(f3timer); f3timer = null; } playIcon(f3play, false, f3k === 3 ? '重播' : '播放'); }
  function play3() {
    go3(0); f3shown = 0; paint3(); playIcon(f3play, true, '暂停');
    f3timer = setInterval(function () { if (f3k >= 3) { stop3(); return; } go3(f3k + 1); if (f3k >= 3) setTimeout(stop3, 50); }, 2200);
  }
  f3note.innerHTML = F3N[3];
  f3play.addEventListener('click', function () { if (f3timer) stop3(); else play3(); });
  onceVisible(document.getElementById('fig-3'), 0.55, function () { setTimeout(play3, 700); });

  /* ================= Figure 4: stage ablation (Table 3) ================= */
  var F4M = ['定位', '复现', '验证', 'pass@1'];
  var F4 = [['SWE-Ladder', [18.4, 0.6, 7.4, 6.8], C.loc], ['三阶段同时训练', [9.9, -23.8, -10.0, 2.8], '#8e98a6'], ['去掉 PATCH（LOC + REP）', [16.4, -13.2, -11.0, 4.4], '#8e98a6'],
    ['去掉 REP（LOC + PATCH）', [8.8, -21.8, -14.4, 3.6], '#8e98a6'], ['去掉 LOC（REP + PATCH）', [6.3, -29.8, -10.8, 1.6], '#8e98a6']];
  var F4B = [33.6, 59.4, 22.6, 9.6];
  var f4v = 0, f4cur = F4[0][1].slice(), f4els = null;
  seg(document.getElementById('f4-var'), F4.map(function (d) { return d[0]; }), 0, function (i) {
    f4v = i; document.getElementById('f4-name').textContent = F4[i][0]; document.getElementById('f4-key').style.background = F4[i][2];
    var from = f4cur.slice(), to = F4[i][1];
    tween(600, function (k) { f4cur = from.map(function (a, j) { return a + (to[j] - a) * k; }); paint4(); });
  });
  mount('f4', function (host, W) {
    var lx = W < 520 ? 92 : 112, rx = W - 10, top = 6, rh = 46, H = top + F4M.length * rh + 26;
    var lo = -32, hi = 22, X = function (v) { return lx + (rx - lx) * (v - lo) / (hi - lo); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '阶段消融' }, host);
    [-30, -20, -10, 0, 10, 20].forEach(function (v) { S('line', { x1: X(v), x2: X(v), y1: top, y2: H - 22, class: v === 0 ? 'axis' : 'grid' }, s); S('text', { x: X(v), y: H - 6, 'text-anchor': 'middle' }, s, v > 0 ? '+' + v : v === 0 ? '0' : '−' + Math.abs(v)); });
    var bars = [], vals = [];
    F4M.forEach(function (m, i) {
      var y = top + i * rh, ref = F4[0][1][i];
      S('text', { x: 0, y: y + rh / 2 + 4, class: i === 3 ? 'lbl-b' : 'lbl' }, s, m);
      S('rect', { x: Math.min(X(0), X(ref)), y: y + 11, width: Math.abs(X(ref) - X(0)), height: rh - 22, rx: 3, fill: 'none', stroke: C.ink, 'stroke-width': 1.3, 'stroke-dasharray': '3 2', opacity: .6 }, s);
      bars.push(S('rect', { y: y + 13, height: rh - 26, rx: 3, class: 'rf', style: '--d:' + (i * 80) + 'ms', tabindex: 0 }, s));
      vals.push(S('text', { y: y + rh / 2 + 4, class: 'val-b rf', style: '--d:' + (i * 80) + 'ms' }, s, ''));
    });
    f4els = { bars: bars, vals: vals, X: X }; paint4(); B.rise(s);
  });
  function paint4() {
    if (!f4els) return;
    var e = f4els, col = F4[f4v][2];
    f4cur.forEach(function (v, i) {
      var a = e.X(0), b = e.X(v), r = e.bars[i];
      r.setAttribute('x', Math.min(a, b).toFixed(1)); r.setAttribute('width', Math.max(.5, Math.abs(b - a)).toFixed(1));
      r.setAttribute('fill', v < 0 ? C.bad : col); r.setAttribute('data-tv', sgn(v) + ' 个百分点'); r.setAttribute('data-tl', F4[f4v][0] + ' · ' + F4M[i]);
      r.setAttribute('data-tc', v < 0 ? C.bad : col); r.setAttribute('data-tn', fmt(F4B[i] + v) + '%（基座 ' + F4B[i] + '%）');
      var t = e.vals[i]; t.textContent = sgn(v);
      t.setAttribute('x', (v < 0 ? b - 6 : b + 6).toFixed(1)); t.setAttribute('text-anchor', v < 0 ? 'end' : 'start'); t.setAttribute('fill', v < 0 ? C.bad : C.ink);
    });
  }

  /* ================= Figure 5: order (Table 4) and evidence alignment (Table 5) ================= */
  mount('f5a', function (host, W) {
    var D = [['LOC → REP → PATCH', 16.4, 19.3, C.loc], ['REP → LOC → PATCH', 12.6, 28.5, C.base2], ['PATCH → REP → LOC', 11.4, 27.6, C.base2]];
    var H = 230, top = 18, bot = 56, lx = 26, Y = function (v) { return top + (H - top - bot) * (1 - v / 20); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '不同训练顺序的 pass@1' }, host);
    [0, 10, 20].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var cw = (W - lx) / 3, bw = Math.min(56, cw * .5);
    D.forEach(function (d, i) {
      var x = lx + i * cw + (cw - bw) / 2;
      S('rect', { x: x, y: Y(d[1]), width: bw, height: Y(0) - Y(d[1]), rx: 3, fill: d[3], class: 'rb', style: '--d:' + (i * 100) + 'ms', 'data-tv': fmt(d[1]) + '%', 'data-tl': d[0], 'data-tc': d[3], 'data-tn': '平均 ' + d[2] + ' 步', tabindex: 0 }, s);
      S('text', { x: x + bw / 2, y: Y(d[1]) - 6, 'text-anchor': 'middle', class: (i ? 'val' : 'val-b') + ' rf', style: '--d:' + (i * 100) + 'ms' }, s, fmt(d[1]));
      d[0].split(' → ').forEach(function (p, k) { });
      S('text', { x: x + bw / 2, y: H - bot + 16, 'text-anchor': 'middle', class: i ? 'lbl' : 'lbl-b', style: 'font-size:11.5px' }, s, d[0].replace(/ → /g, '→'));
      S('text', { x: x + bw / 2, y: H - bot + 32, 'text-anchor': 'middle', style: 'font-size:11px' }, s, d[2] + ' 步');
    });
    B.rise(s);
  });
  mount('f5b', function (host, W) {
    var G = [['LOC token', [['定位证据', 14.4, C.loc], ['补丁证据', 13.6, C.base2]]], ['PATCH token', [['补丁证据', 13.2, C.patch], ['定位证据', 11.8, C.base2]]]];
    var H = 230, top = 18, bot = 56, lx = 26, Y = function (v) { return top + (H - top - bot) * (1 - v / 20); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '对应证据与互换证据下的 pass@1' }, host);
    [0, 10, 20].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var gw = (W - lx) / 2, bw = Math.min(44, gw * .3);
    G.forEach(function (g, gi) {
      var gx = lx + gi * gw;
      g[1].forEach(function (d, i) {
        var x = gx + gw / 2 - bw - 3 + i * (bw + 6);
        S('rect', { x: x, y: Y(d[1]), width: bw, height: Y(0) - Y(d[1]), rx: 3, fill: d[2], class: 'rb', style: '--d:' + (gi * 160 + i * 80) + 'ms', 'data-tv': fmt(d[1]) + '%', 'data-tl': '用' + d[0] + '监督 ' + g[0], 'data-tc': d[2], tabindex: 0 }, s);
        S('text', { x: x + bw / 2, y: Y(d[1]) - 6, 'text-anchor': 'middle', class: (i ? 'val' : 'val-b') + ' rf', style: '--d:' + (gi * 160 + i * 80) + 'ms' }, s, fmt(d[1]));
        S('text', { x: x + bw / 2, y: H - bot + 16, 'text-anchor': 'middle', style: 'font-size:10.5px' }, s, i ? '互换' : '对应');
      });
      S('text', { x: gx + gw / 2, y: H - bot + 34, 'text-anchor': 'middle', class: 'lbl-b' }, s, g[0]);
    });
    B.rise(s);
  });
})();
