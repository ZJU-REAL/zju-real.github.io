/* Figures for "WorldMemBench". Numbers come from arXiv:2610.19063 (tables and figures cited inline);
   the rollout videos and the checklist are from the released examples (huggingface.co/datasets/rescuerz/WorldMemBench-examples). */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { wm: '#2b7bb9', wmInk: '#1d5a8a', hum: '#d9772b', obj: '#2f8f83', env: '#3d6fb6', dyn: '#9a5bb5', ink: '#151a22', mute: '#6b7382', base: '#c6ccd4' };
  var MODELS = ['HY-WorldPlay', 'Matrix-Game 3', 'Matrix-Game 3.5', 'SANA-WM', 'YUME', 'LingBot World', 'LingBot World v2', 'Evoke', 'DreamX World'];
  var MCOL = ['#2b7bb9', '#8c6bb1', '#b07aa1', '#e15759', '#f28e2b', '#59a14f', '#76b7b2', '#d4a017', '#7f7f7f'];

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function fmt(v, d) { return v.toFixed(d === undefined ? 3 : d); }
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
  function visible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting && e.intersectionRatio > 0.25); }); }, { threshold: [0, .25] }).observe(el);
  }

  /* ================= Figure 1: departure and revisit ================= */
  (function () {
    var root = document.getElementById('m5'); if (!root) return;
    var FPS = 16;
    function rot(acts, n, amp) { // phases of n frames; yaw (+ = left) or pitch (+ = up)
      var segs = [], f = 0;
      acts.forEach(function (a) { segs.push({ a: a, f0: f, f1: f + n }); f += n; });
      return { segs: segs, total: f + 12, amp: amp };
    }
    var TRAJ = [
      { name: 'LRLRLR', video: '../../../blog/worldmembench/media/env-lrlrlr.mp4', kind: 'rot', plan: rot(['L', 'R', 'L', 'R', 'L', 'R'], 80, 80),
        cap: '环境样例，LRLRLR：向左转 80° 再转回，重复三次，每次回来都和 V 比对。' },
      { name: '平移', video: '../../../blog/worldmembench/media/translate-square.mp4', kind: 'trans', plan: rot(['F', 'R', 'B', 'L'], 120, 0),
        cap: '平移：朝向不变，依次向前、向右、向后、向左，绕正方形一圈回到起点。' },
      { name: 'LRLR', video: '../../../blog/worldmembench/media/env-lrlr.mp4', kind: 'rot', plan: rot(['L', 'R', 'L', 'R'], 120, 90), cap: '同一街景，LRLR：两个 90° 的来回，回到原位两次。' },
      { name: 'LRUD', video: '../../../blog/worldmembench/media/env-lrud.mp4', kind: 'rot', plan: rot(['L', 'R', 'U', 'D'], 120, 90), cap: '同一街景，LRUD：先左右转一个 90° 来回，再上下转一个 90° 来回，第二次返回换了一根轴。' }
    ];
    var video = document.getElementById('m5-video'), svg = document.getElementById('m5-svg'), cap = document.getElementById('m5-cap');
    var tl = document.getElementById('m5-tl'), thumbs = document.getElementById('m5-thumbs'), phaseEl = document.getElementById('m5-phase'), pp = document.getElementById('m5-pp');
    var cur = 0, clock = 0, last = null, paused = false, inView = false, raf = 0, ph, thumbEls = [], returns = [];

    function returnsOf(T) {
      var out = [];
      if (T.kind === 'trans') { out.push(T.plan.segs[T.plan.segs.length - 1].f1); return out; }
      T.plan.segs.forEach(function (s) { if (s.a === 'R' || s.a === 'D') out.push(s.f1); });
      return out;
    }
    function build() {
      var T = TRAJ[cur];
      returns = returnsOf(T);
      root.classList.toggle('novid', !T.video);
      if (T.video) { if (video.getAttribute('src') !== T.video) { video.src = T.video; video.load(); } }
      else { video.removeAttribute('src'); video.load(); }
      cap.textContent = T.cap;
      tl.innerHTML = '';
      var tot = T.plan.total;
      T.plan.segs.forEach(function (s, i) {
        var d = document.createElement('div'), back = s.a === 'R' || s.a === 'D' || (T.kind === 'trans' && i === 3);
        d.className = 'sg ' + (back ? 'back' : 'away');
        d.style.width = ((s.f1 - s.f0) / tot * 100) + '%';
        var ri = returns.indexOf(s.f1);
        d.textContent = s.a + (ri >= 0 ? ' → R' + (ri + 1) : '');
        tl.appendChild(d);
      });
      var tail = document.createElement('div'); tail.className = 'sg hold'; tail.style.width = (12 / tot * 100) + '%'; tl.appendChild(tail);
      returns.forEach(function (f) { var m = document.createElement('i'); m.className = 'mk'; m.style.left = (f / tot * 100) + '%'; tl.appendChild(m); });
      ph = document.createElement('i'); ph.className = 'ph'; tl.appendChild(ph);
      thumbs.innerHTML = ''; thumbEls = [];
      ['V'].concat(returns.map(function (_, i) { return 'R' + (i + 1); })).forEach(function (lab, i) {
        var d = document.createElement('div'); d.className = 'm5-th empty' + (i === 0 ? ' ref' : '');
        var c = document.createElement('canvas'); c.width = 320; c.height = 178; d.appendChild(c);
        var s = document.createElement('span'); s.textContent = i === 0 ? 'V · 初始视图' : lab; d.appendChild(s);
        if (i) { var k = document.createElement('span'); k.className = 'ref-cmp'; k.textContent = '与 V 比对'; d.appendChild(k); }
        thumbs.appendChild(d); thumbEls.push({ el: d, c: c, f: i ? returns[i - 1] : 0, got: false });
      });
      if (!T.video) thumbEls.forEach(function (t) { t.el.classList.remove('empty'); t.el.style.display = 'none'; });
      clock = 0; drawSvg(0);
    }
    function grab(f) {
      if (!TRAJ[cur].video || video.readyState < 2) return;
      thumbEls.forEach(function (t) {
        if (!t.got && f >= t.f && f <= t.f + 10) {
          try { t.c.getContext('2d').drawImage(video, 0, 0, t.c.width, t.c.height); t.got = true; t.el.classList.remove('empty'); if (t.f) t.el.classList.add('got'); } catch (e) {}
        }
      });
    }
    function stateAt(f) {
      var T = TRAJ[cur], yaw = 0, pitch = 0, pos = [0, 0], label = '静止', seg = null;
      for (var i = 0; i < T.plan.segs.length; i++) { var s = T.plan.segs[i]; if (f >= s.f0 && f < s.f1) { seg = s; break; } }
      if (T.kind === 'rot') {
        if (seg) {
          var k = (f - seg.f0) / (seg.f1 - seg.f0), a = T.plan.amp;
          if (seg.a === 'L') yaw = a * k; else if (seg.a === 'R') yaw = a * (1 - k);
          else if (seg.a === 'U') pitch = a * k; else if (seg.a === 'D') pitch = a * (1 - k);
          label = { L: '向左转', R: '转回', U: '向上转', D: '向下转回' }[seg.a];
        }
      } else {
        var corners = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
        if (seg) { var j = T.plan.segs.indexOf(seg), kk = (f - seg.f0) / (seg.f1 - seg.f0); pos = [corners[j][0] + (corners[j + 1][0] - corners[j][0]) * kk, corners[j][1] + (corners[j + 1][1] - corners[j][1]) * kk];
          label = { F: '向前', R: '向右', B: '向后', L: '向左' }[seg.a]; }
      }
      var ret = -1; returns.forEach(function (r, i) { if (f >= r - 4 && f <= r + 14) ret = i; });
      if (f < 3) label = 'V · 初始视图';
      return { yaw: yaw, pitch: pitch, pos: pos, label: ret >= 0 ? 'R' + (ret + 1) + ' · 回到初始视图' : label, ret: ret };
    }
    function drawSvg(f) {
      var T = TRAJ[cur], st = stateAt(f);
      svg.innerHTML = '';
      if (T.kind === 'rot') {
        var cx = 120, cy = 150, R = 95;
        function wedge(deg, half, cls) {
          var a1 = (-90 - deg - half) * Math.PI / 180, a2 = (-90 - deg + half) * Math.PI / 180;
          return 'M' + cx + ' ' + cy + 'L' + (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy + R * Math.sin(a1)).toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + (cx + R * Math.cos(a2)).toFixed(1) + ' ' + (cy + R * Math.sin(a2)).toFixed(1) + 'Z';
        }
        S('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: '#e3e7ed', 'stroke-dasharray': '3 4' }, svg);
        S('path', { d: wedge(0, 22), fill: 'rgba(43,123,185,.14)', stroke: C.wm, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
        S('text', { x: cx, y: cy - R - 6, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:700', fill: C.wmInk }, svg, 'V');
        S('path', { d: wedge(st.yaw, 22), fill: st.ret >= 0 ? 'rgba(43,123,185,.55)' : 'rgba(21,26,34,.22)', stroke: st.ret >= 0 ? C.wm : C.ink, 'stroke-width': 1.5 }, svg);
        S('circle', { cx: cx, cy: cy, r: 9, fill: C.ink }, svg);
        S('rect', { x: cx - 5, y: cy - 15, width: 10, height: 8, rx: 2, fill: C.ink, transform: 'rotate(' + (-st.yaw) + ' ' + cx + ' ' + cy + ')' }, svg);
        if (T.name === 'LRUD') { // side gauge for pitch
          var gx = 214, gy = 150;
          S('line', { x1: gx, y1: gy - 60, x2: gx, y2: gy + 10, stroke: '#e3e7ed', 'stroke-width': 2 }, svg);
          S('text', { x: gx, y: gy + 26, 'text-anchor': 'middle', style: 'font-size:10.5px' }, svg, 'pitch');
          S('circle', { cx: gx, cy: gy - st.pitch * 0.66, r: 5, fill: st.pitch > 1 ? C.dyn : '#aab2bd' }, svg);
        }
        S('text', { x: 8, y: 16, style: 'font-size:11px', fill: C.mute }, svg, '俯视 · 相机原地不动');
        S('text', { x: 8, y: 232, style: 'font-size:11.5px;font-weight:700', fill: C.ink }, svg, (st.yaw >= 0 ? 'yaw ' : 'yaw ') + Math.round(st.yaw) + '°' + (T.name === 'LRUD' ? '  ·  pitch ' + Math.round(st.pitch) + '°' : ''));
      } else {
        var x0 = 60, y0 = 190, sz = 120;
        S('rect', { x: x0, y: y0 - sz, width: sz, height: sz, fill: 'none', stroke: '#cfd6df', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
        var px = x0 + st.pos[0] * sz, py = y0 - st.pos[1] * sz;
        S('circle', { cx: x0, cy: y0, r: 10, fill: 'rgba(43,123,185,.16)', stroke: C.wm, 'stroke-width': 1.5 }, svg);
        S('text', { x: x0 - 16, y: y0 + 22, style: 'font-size:12px;font-weight:700', fill: C.wmInk }, svg, 'V');
        S('path', { d: 'M' + (px - 12) + ' ' + (py - 18) + 'L' + px + ' ' + (py - 48) + 'L' + (px + 12) + ' ' + (py - 18) + 'Z', fill: st.ret >= 0 ? 'rgba(43,123,185,.55)' : 'rgba(21,26,34,.2)' }, svg);
        S('circle', { cx: px, cy: py, r: 8, fill: C.ink }, svg);
        S('text', { x: 8, y: 16, style: 'font-size:11px', fill: C.mute }, svg, '俯视 · 朝向不变');
      }
      phaseEl.textContent = st.label; phaseEl.classList.toggle('ret', st.ret >= 0);
      if (ph) ph.style.left = (f / T.plan.total * 100) + '%';
    }
    function frameNow() { var T = TRAJ[cur]; return T.video ? (video.currentTime || 0) * (T.plan.total / Math.max(1, (video.duration || T.plan.total / FPS)) ) : clock * FPS; }
    function loop(ts) {
      raf = 0;
      var T = TRAJ[cur];
      if (!T.video && !paused && inView) { if (last !== null) clock += Math.min(ts - last, 100) / 1000; last = ts; if (clock * FPS > T.plan.total) clock = 0; }
      else last = null;
      var f = frameNow(); drawSvg(f); grab(f);
      if (inView && !paused) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function play() {
      var T = TRAJ[cur];
      if (T.video && inView && !paused && !reduce) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      kick();
    }
    video.loop = true;
    video.addEventListener('seeked', function () { kick(); });
    video.addEventListener('play', kick);
    seg(document.getElementById('m5-traj'), TRAJ.map(function (t) { return t.name; }), 0, function (i) { cur = i; build(); play(); });
    tl.addEventListener('click', function (e) {
      var r = tl.getBoundingClientRect(), k = clamp((e.clientX - r.left) / r.width), T = TRAJ[cur];
      if (T.video && video.duration) video.currentTime = k * video.duration; else clock = k * T.plan.total / FPS;
      kick();
    });
    pp.addEventListener('click', function () {
      paused = !paused; pp.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pp.querySelector('span').textContent = paused ? '播放' : '暂停';
      pp.querySelector('svg').innerHTML = paused ? '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>' : '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>';
      if (paused) video.pause(); else play();
    });
    visible(root, function (v) { inView = v; if (v) play(); else video.pause(); });
    if (reduce) { paused = true; pp.querySelector('span').textContent = '播放'; }
    build();
  })();

  /* ================= Figure 3: dynamic checklist ================= */
  (function () {
    var root = document.getElementById('m6'); if (!root) return;
    var video = document.getElementById('m6-video'), tl = document.getElementById('m6-tl'), qs = document.getElementById('m6-qs'), phaseEl = document.getElementById('m6-phase');
    var TOT = 492, SEGS = [['hold', 0, 120, '静止 · 事件开始'], ['away', 120, 240, '转开'], ['hold', 240, 300, '转开后停住'], ['back', 300, 420, '转回'], ['ret', 420, 492, '停住 · 看结果']];
    var CATC = { return_progress: C.wm, persistence_reset: C.obj, final_state: C.hum, causal_physics: C.dyn };
    var CATN = { return_progress: '返回进展', persistence_reset: '状态保持', final_state: '最终状态', causal_physics: '因果 / 物理' };
    var Q = [ // the released checklist for case 023
      ['return_progress', 'yes', '返回后静止的画面中，翻向那一侧的书页是否明显比离开前更厚？', 420],
      ['return_progress', 'no', '返回后静止的画面中，同一页是否还停在离开前的位置，没有翻过书脊？', 420],
      ['persistence_reset', 'yes', '已经翻过书脊的书页，是否仍留在翻向的那一侧？', 420],
      ['persistence_reset', 'no', '已经翻过书脊的书页，是否自己翻了回去，恢复成最初两侧的厚度？', 420],
      ['final_state', 'yes', '最后静止的画面中，翻向那一侧的书页是否明显比初始帧更厚？', 440],
      ['final_state', 'no', '最后静止的画面中，书是否合上了？', 440],
      ['causal_physics', 'yes', '书页翻过书脊之前，是否先有手指碰到它？', 0],
      ['causal_physics', 'no', '是否在没有明显翻页动作的情况下，好几页一起翻过了书脊？', 0]
    ];
    SEGS.forEach(function (s) { var d = document.createElement('div'); d.className = 'sg ' + (s[0] === 'away' ? 'away' : s[0] === 'back' ? 'back' : s[0] === 'ret' ? 'ret' : 'hold'); d.style.width = ((s[2] - s[1]) / TOT * 100) + '%'; d.textContent = s[3]; tl.appendChild(d); });
    var ph = document.createElement('i'); ph.className = 'ph'; tl.appendChild(ph);
    var gate = document.createElement('div'); gate.className = 'm6-gate';
    gate.innerHTML = '<b>前置判断</b><span>开头静止的这段画面里，目标事件有没有明显开始？没有的话，八道题全部记 0 分。</span>';
    qs.appendChild(gate);
    var els = Q.map(function (q) {
      var d = document.createElement('div'); d.className = 'm6-q';
      d.innerHTML = '<span class="cat" style="background:' + CATC[q[0]] + '">' + CATN[q[0]] + '</span><span>' + q[2] + '</span><span class="ans ' + q[1] + '">' + { yes: '是', no: '否' }[q[1]] + '</span>';
      qs.appendChild(d); return { el: d, from: q[3] };
    });
    var raf = 0, inView = false;
    function render() {
      raf = 0;
      var f = (video.currentTime || 0) / Math.max(1, video.duration || 30.8) * TOT;
      ph.style.left = (f / TOT * 100) + '%';
      var s = SEGS.filter(function (x) { return f >= x[1] && f < x[2]; })[0] || SEGS[SEGS.length - 1];
      phaseEl.textContent = s[3]; phaseEl.classList.toggle('ret', s[0] === 'ret');
      gate.classList.toggle('on', f < 120);
      els.forEach(function (e) { e.el.classList.toggle('on', f >= 120 && f >= e.from); });
      if (inView && !video.paused) raf = requestAnimationFrame(render);
    }
    video.loop = true;
    video.addEventListener('play', function () { if (!raf) raf = requestAnimationFrame(render); });
    video.addEventListener('seeked', render);
    tl.addEventListener('click', function (e) { var r = tl.getBoundingClientRect(); if (video.duration) video.currentTime = clamp((e.clientX - r.left) / r.width) * video.duration; });
    visible(root, function (v) { inView = v; if (v && !reduce) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause(); });
    render();
  })();

  /* ================= Data (paper Table 2) ================= */
  var MET = [ // [label, group, lowerIsBetter, values]
    ['成像质量', 'Video quality', 0, [.659, .680, .603, .542, .713, .671, .683, .670, .686]],
    ['美学质量', 'Video quality', 0, [.527, .510, .429, .434, .533, .545, .534, .533, .537]],
    ['人物身份', 'Static memory', 0, [.828, .483, .019, .134, .298, .393, .534, .550, .286]],
    ['人物外观', 'Static memory', 0, [.830, .502, .043, .251, .551, .661, .645, .762, .556]],
    ['物体外观', 'Static memory', 0, [.879, .612, .471, .328, .531, .448, .564, .710, .569]],
    ['物体几何', 'Static memory', 0, [.761, .518, .457, .314, .449, .418, .506, .651, .491]],
    ['环境可见', 'Static memory', 0, [.947, .782, .620, .537, .682, .728, .694, .762, .610]],
    ['环境深度', 'Static memory', 0, [.905, .611, .645, .668, .676, .680, .517, .730, .419]],
    ['环境重建', 'Static memory', 0, [.619, .423, .390, .367, .347, .364, .253, .400, .105]],
    ['总分', 'Dynamic memory', 0, [.294, .046, .240, .415, .775, .808, .696, .706, .563]],
    ['返回进展', 'Dynamic memory', 0, [.292, .050, .183, .342, .708, .775, .667, .667, .558]],
    ['状态保持', 'Dynamic memory', 0, [.308, .050, .233, .458, .817, .833, .733, .717, .600]],
    ['最终状态', 'Dynamic memory', 0, [.267, .042, .200, .333, .717, .750, .592, .658, .492]],
    ['因果物理', 'Dynamic memory', 0, [.308, .042, .342, .525, .858, .875, .792, .783, .600]],
    ['平移 RPE', 'Camera following', 1, [.609, .424, 1.018, .771, .853, .575, .565, .838, 1.139]],
    ['旋转 RPE', 'Camera following', 1, [.417, .554, .837, .464, .529, .637, .439, .573, .928]]
  ];
  var GCOL = { 'Video quality': '#7f8a99', 'Static memory': C.env, 'Dynamic memory': C.dyn, 'Camera following': C.obj };
  var GN = { 'Video quality': '视频质量', 'Static memory': '静态记忆', 'Dynamic memory': '动态记忆', 'Camera following': '相机跟随' };
  var STATIC = MODELS.map(function (_, i) { var s = 0; for (var k = 2; k <= 8; k++) s += MET[k][3][i]; return s / 7; });

  /* ================= Result cards ================= */
  var CARDS = [
    { max: 1, d: 3, rows: [['HY-WorldPlay · 静态', STATIC[0], C.env], ['HY-WorldPlay · 动态', .294, C.dyn], ['LingBot World · 静态', STATIC[5], C.env], ['LingBot World · 动态', .808, C.dyn]] },
    { max: .25, d: 3, pre: '−', rows: [['物体外观', .229, C.obj], ['人物身份', .217, C.hum], ['物体几何', .205, C.obj], ['环境重建', .196, C.env]] },
    { max: .6, d: 3, rows: [['全部历史', (.534 + .645 + .564 + .506 + .694 + .517 + .253) / 7, '#9aa3ae'], ['最近帧 + 视角相关历史，同预算', (.547 + .663 + .531 + .485 + .687 + .550 + .287) / 7, C.wm], ['仅最近帧，同预算', (.392 + .540 + .426 + .392 + .610 + .501 + .235) / 7, '#9aa3ae']] },
    { max: 100, d: 1, unit: '%', rows: [['环境可见内容', 92.5, C.env], ['人物身份', 85.5, C.hum], ['物体几何', 78.5, C.obj]] }
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var cd = CARDS[+el.dataset.card]; el.id = 'card-' + el.dataset.card;
    mount(el.id, function (host, W) {
      var rowH = 30, H = cd.rows.length * rowH + 4, vw = W - 64, u = cd.unit || '', pre = cd.pre || '';
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': cd.rows.map(function (r) { return r[0] + ' ' + pre + r[1].toFixed(cd.d) + u; }).join(', ') }, host);
      cd.rows.forEach(function (r, i) {
        var y = i * rowH;
        S('text', { x: 0, y: y + 10, class: 'lbl', style: 'font-size:11.5px' }, s, r[0]);
        S('rect', { x: 0, y: y + 15, width: vw, height: 8, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 15, width: vw * r[1] / cd.max, height: 8, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tv': pre + r[1].toFixed(cd.d) + u, 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / cd.max + 6, y: y + 22.5, class: 'val-b rf', style: '--d:' + (i * 90) + 'ms' }, s, pre + r[1].toFixed(cd.d) + u);
      });
      B.rise(s);
    });
  });

  /* ================= Figure 2: composition ================= */
  mount('f2', function (host, W) {
    var FAM = [['人物', 60, C.hum, ['单人', '多人']], ['物体', 70, C.obj, ['建筑', '交通工具', '自然', '家具', '餐饮', '器物', '娱乐']],
      ['环境', 70, C.env, ['自然', '乡村', '城市', '住宅', '商业', '公共', '文化']], ['动态', 60, C.dyn, ['运动', '组装', '移除', '形变', '转移', '反应', '热变化']]];
    var narrow = W < 560, H = narrow ? 290 : 176, top = 22;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '样例构成' }, host);
    var x = 0, bh = 34;
    S('text', { x: 0, y: 12, style: 'font-size:11.5px' }, s, '静态记忆 · 200 个样例');
    S('text', { x: W * 200 / 260, y: 12, style: 'font-size:11.5px' }, s, '动态 · 60');
    FAM.forEach(function (f, i) {
      var w = (W - 6) * f[1] / 260;
      S('rect', { x: x, y: top, width: w - 3, height: bh, rx: 6, fill: f[2], class: 'rbx', style: '--d:' + (i * 120) + 'ms', 'data-tv': f[1] + ' 个样例', 'data-tl': f[0], 'data-tc': f[2], tabindex: 0 }, s);
      S('text', { x: x + 10, y: top + 22, class: 'rf', style: '--d:' + (i * 120) + 'ms;font-size:13px;font-weight:700', fill: '#fff' }, s, f[0] + ' ' + f[1]);
      // subcategory chips below
      var cy = top + bh + 14, cx = x, rows = narrow ? 4 : 2, per = Math.ceil(f[3].length / rows);
      f[3].forEach(function (c, j) {
        var r = Math.floor(j / per), col = j % per, cw = (w - 6) / per;
        var gx = x + col * cw, gy = cy + r * 26;
        S('rect', { x: gx, y: gy, width: cw - 4, height: 21, rx: 5, fill: '#fff', stroke: f[2], 'stroke-opacity': .45, class: 'rf', style: '--d:' + (400 + i * 120 + j * 40) + 'ms', 'data-tv': c, 'data-tl': f[0], 'data-tc': f[2] }, s);
        if (cw > 46) S('text', { x: gx + (cw - 4) / 2, y: gy + 14.5, 'text-anchor': 'middle', class: 'rf', style: '--d:' + (400 + i * 120 + j * 40) + 'ms;font-size:' + (cw > 70 ? 11 : 9.5) + 'px', fill: '#353c49' }, s, c);
      });
      x += w;
    });
    var dy = H - 34;
    [['视频质量：全部 200 段静态 rollout', '#7f8a99'], ['相机跟随：85 段静态 rollout', C.obj]].forEach(function (d, i) {
      S('rect', { x: i * (W / 2), y: dy, width: 10, height: 10, rx: 3, fill: d[1] }, s);
      S('text', { x: i * (W / 2) + 16, y: dy + 9.5, style: 'font-size:12px' }, s, d[0]);
    });
    B.rise(s);
  });

  /* ================= Figure 4: heatmap of all metrics (metrics as rows, models as columns) ================= */
  mount('f4', function (host, W) {
    var narrow = W < 640, gw = narrow ? 14 : 18, lw = gw + (narrow ? 82 : 104), top = narrow ? 70 : 58, rh = narrow ? 26 : 28, gap = 8;
    var groups = [], last = null;
    MET.forEach(function (m) { if (m[1] !== last) { groups.push(m[1]); last = m[1]; } });
    var cw = (W - lw) / MODELS.length, H = top + MET.length * rh + (groups.length - 1) * gap + 4;
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '九个模型的全部指标' }, host);
    MODELS.forEach(function (mo, i) { // column headers
      var tx = lw + i * cw + cw / 2;
      if (narrow) S('text', { x: tx, y: top - 8, 'text-anchor': 'start', transform: 'rotate(-50 ' + tx + ' ' + (top - 8) + ')', style: 'font-size:10px' }, s, mo.replace('Matrix-Game', 'M-Game').replace('LingBot World', 'LingBot'));
      else mo.replace('LingBot World', 'LingBot World|').replace('Matrix-Game', 'Matrix-Game|').replace('HY-WorldPlay', 'HY-|WorldPlay').replace('DreamX World', 'DreamX|World').split('|').filter(Boolean).forEach(function (ln, q, arr) {
        S('text', { x: tx, y: top - 8 - (arr.length - 1 - q) * 13, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:11.5px' }, s, ln.trim() || ' ');
      });
    });
    var y = top, gi = -1, prev = null;
    MET.forEach(function (m, j) {
      if (m[1] !== prev) { // group band on the left
        if (prev !== null) y += gap;
        gi++; prev = m[1];
        var span = MET.filter(function (q) { return q[1] === m[1]; }).length, h = span * rh;
        S('rect', { x: 0, y: y + 2, width: 4, height: h - 4, rx: 2, fill: GCOL[m[1]] }, s);
        var cy = y + h / 2;
        S('text', { x: gw - 6, y: cy, 'text-anchor': 'middle', transform: 'rotate(-90 ' + (gw - 6) + ' ' + cy + ')', style: 'font-size:' + (narrow ? 9.5 : 10.5) + 'px;font-weight:700', fill: GCOL[m[1]] }, s, h > 70 ? GN[m[1]] : GN[m[1]].split(' ')[0]);
      }
      S('text', { x: gw + 2, y: y + rh / 2 + 4, class: 'lbl', style: narrow ? 'font-size:10.5px' : '' }, s, m[0] + (m[2] ? ' ↓' : ''));
      var vals = m[3], sorted = vals.slice().sort(function (a, b) { return m[2] ? a - b : b - a; });
      MODELS.forEach(function (mo, i) {
        var rank = sorted.indexOf(vals[i]), k = 1 - rank / 8, col = GCOL[m[1]];
        var g = S('g', { class: 'rf', style: '--d:' + (j * 25 + i * 20) + 'ms' }, s);
        S('rect', { x: lw + i * cw + 1.5, y: y + 2, width: cw - 3, height: rh - 4, rx: 4, fill: col, 'fill-opacity': (0.08 + 0.85 * k * k).toFixed(2), 'data-tv': vals[i].toFixed(3), 'data-tl': mo + ' · ' + m[0], 'data-tn': GN[m[1]] + ' · 9 个模型中排第 ' + (rank + 1) + (m[2] ? '（越低越好）' : ''), 'data-tc': col, tabindex: 0 }, g);
        S('text', { x: lw + i * cw + cw / 2, y: y + rh / 2 + 4, 'text-anchor': 'middle', style: 'pointer-events:none;font-size:' + (narrow ? 9.5 : 11.5) + 'px' + (rank === 0 ? ';font-weight:700' : ''), fill: k > .74 ? '#fff' : '#353c49' }, g, vals[i].toFixed(narrow ? 2 : 3));
      });
      y += rh;
    });
    B.rise(s);
  });

  /* ================= Figure 5: static vs dynamic scatter ================= */
  mount('f5', function (host, W) {
    var H = 320, lx = 44, rx = W - 20, top = 16, bot = 42;
    var X = function (v) { return lx + (rx - lx) * (v - .2) / .7; }, Y = function (v) { return top + (H - top - bot) * (1 - v); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '静态记忆与动态记忆' }, host);
    [0, .25, .5, .75, 1].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    [.2, .4, .6, .8].forEach(function (v) { S('text', { x: X(v), y: H - bot + 16, 'text-anchor': 'middle' }, s, v); });
    S('text', { x: (lx + rx) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl' }, s, '静态记忆（七项指标均值）→');
    S('text', { x: 14, y: top + (H - top - bot) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (top + (H - top - bot) / 2) + ')', class: 'lbl' }, s, '动态记忆总分 →');
    MODELS.forEach(function (m, i) {
      var x = X(STATIC[i]), y = Y(MET[9][3][i]), r = 5 + (MET[0][3][i] - .5) * 30;
      S('circle', { cx: x, cy: y, r: Math.max(4, r), fill: MCOL[i], 'fill-opacity': .85, stroke: '#fff', 'stroke-width': 1.5, class: 'rf', style: '--d:' + (i * 90) + 'ms', 'data-tv': '静态 ' + STATIC[i].toFixed(3) + ' · 动态 ' + MET[9][3][i].toFixed(3), 'data-tl': m, 'data-tc': MCOL[i], 'data-tn': '成像质量 ' + MET[0][3][i].toFixed(3), tabindex: 0 }, s);
      var right = x < rx - 110 && m !== 'YUME';
      S('text', { x: right ? x + 11 : x - 11, y: y + 4 + (m === 'YUME' ? 4 : 0), 'text-anchor': right ? 'start' : 'end', class: 'rf', style: '--d:' + (i * 90 + 200) + 'ms;font-size:11.5px', fill: '#353c49' }, s, m);
    });
    B.rise(s);
  });

  /* ================= Figure 6: one environment case across returns (paper Figure 4) ================= */
  var F6 = [ // per model: [[Vis, Dep, Rec] at R1, R2, R3]
    [[.953, .991, .812], [.958, .984, .845], [.905, .991, .816]], [[.827, .605, .359], [.860, .606, .328], [.860, .530, .279]],
    [[.856, .894, .541], [.696, .862, .505], [.761, .822, .516]], [[.742, .772, .651], [.530, .738, .536], [.378, .863, .558]],
    [[.940, .891, .634], [.862, .616, .485], [.525, .767, .510]], [[.735, .844, .440], [.773, .661, .433], [.293, .852, .425]],
    [[.834, .738, .577], [.584, .303, .306], [.497, .286, .354]], [[.869, .920, .696], [.773, .895, .685], [.746, .972, .691]],
    [[.871, .294, .171], [.650, .041, .166], [.666, .098, .135]]
  ];
  var F6N = ['可见内容记忆', '深度顺序', '重建'], f6m = 0, f6 = null;
  seg(document.getElementById('f6-m'), ['可见内容', '深度', '重建'], 0, function (i) { f6m = i; document.getElementById('f6-t').textContent = '每次返回时的' + F6N[i]; f6.redraw(); });
  f6 = mount('f6', function (host, W) {
    var narrow = W < 560, H = 300, lx = 36, rx = W - (narrow ? 20 : 130), top = 14, bot = 30;
    var X = function (k) { return lx + (rx - lx) * k / 2; }, Y = function (v) { return top + (H - top - bot) * (1 - v); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '每次返回时的' + F6N[f6m] }, host);
    [0, .5, 1].forEach(function (v) { S('line', { x1: lx, x2: rx, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    ['R1', 'R2', 'R3'].forEach(function (r, k) { S('text', { x: X(k), y: H - 8, 'text-anchor': 'middle', class: 'lbl-b' }, s, r); });
    var groups = [];
    MODELS.forEach(function (m, i) {
      var g = S('g', { class: 'f6-line' }, s), pts = F6[i].map(function (r) { return r[f6m]; });
      S('path', { d: pts.map(function (v, k) { return (k ? 'L' : 'M') + X(k) + ' ' + Y(v); }).join(''), fill: 'none', stroke: MCOL[i], 'stroke-width': 2.4, class: 'rl', pathLength: 1, style: '--d:' + (i * 60) + 'ms' }, g);
      pts.forEach(function (v, k) { S('circle', { cx: X(k), cy: Y(v), r: 4.2, fill: '#fff', stroke: MCOL[i], 'stroke-width': 2, 'data-tv': v.toFixed(3), 'data-tl': m + ' · R' + (k + 1), 'data-tc': MCOL[i], tabindex: 0 }, g); });
      groups.push(g); g._end = Y(pts[2]); g._name = m; g._col = MCOL[i];
      g.addEventListener('pointerenter', function () { groups.forEach(function (o) { o.style.opacity = o === g ? 1 : .15; }); });
      g.addEventListener('pointerleave', function () { groups.forEach(function (o) { o.style.opacity = 1; }); });
    });
    if (!narrow) { // end labels, spread so they never overlap
      var o = groups.slice().sort(function (a, b) { return a._end - b._end; }), yy = [];
      o.forEach(function (g, k) { var y = g._end; if (k && y - yy[k - 1] < 13) y = yy[k - 1] + 13; yy.push(y); });
      o.forEach(function (g, k) { S('text', { x: rx + 10, y: yy[k] + 4, style: 'font-size:11px', fill: g._col }, g, g._name); });
    }
    B.rise(s);
  });

  /* ================= Figure 7: context-access policies (paper Table 3) ================= */
  var F7M = ['人物身份', '人物外观', '物体外观', '物体几何', '环境可见', '环境深度', '环境重建', '返回进展', '状态保持', '最终状态', '因果物理'];
  var F7 = [['全部历史（FullKV）', '#9aa3ae', [.534, .645, .564, .506, .694, .517, .253, .667, .733, .592, .792], 322.16],
    ['最近帧 + 视角相关历史（FoV）', C.wm, [.547, .663, .531, .485, .687, .550, .287, .725, .792, .675, .800], 262.69],
    ['仅最近帧（Sliding）', '#d8b26e', [.392, .540, .426, .392, .610, .501, .235, .667, .717, .600, .775], 260.42]];
  var lg = document.getElementById('f7-legend');
  F7.forEach(function (p) { lg.insertAdjacentHTML('beforeend', '<span><i style="background:' + p[1] + '"></i>' + p[0] + ' · 每段视频 ' + p[3].toFixed(1) + ' 秒</span>'); });
  mount('f7', function (host, W) {
    var narrow = W < 620, H = narrow ? 300 : 270, lx = 30, top = 12, bot = narrow ? 70 : 52;
    var Y = function (v) { return top + (H - top - bot) * (1 - v); };
    var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '三种上下文策略下的记忆得分' }, host);
    [0, .5, 1].forEach(function (v) { S('line', { x1: lx, x2: W, y1: Y(v), y2: Y(v), class: 'grid' }, s); S('text', { x: lx - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s, v); });
    var gw = (W - lx) / F7M.length, bw = Math.min(14, (gw - 6) / 3);
    F7M.forEach(function (m, j) {
      var gx = lx + j * gw + (gw - 3 * bw) / 2, best = Math.max(F7[0][2][j], F7[1][2][j], F7[2][2][j]);
      F7.forEach(function (p, i) {
        var v = p[2][j];
        S('rect', { x: gx + i * bw, y: Y(v), width: bw - 1.5, height: Y(0) - Y(v), rx: 2, fill: p[1], class: 'rb', style: '--d:' + (j * 40 + i * 20) + 'ms', 'data-tv': v.toFixed(3) + (v === best ? '  ·  最优' : ''), 'data-tl': p[0] + ' · ' + m, 'data-tc': p[1], tabindex: 0 }, s);
      });
      var tx = lx + j * gw + gw / 2, ty = H - bot + 12;
      S('text', { x: tx, y: ty, 'text-anchor': 'end', transform: 'rotate(-35 ' + tx + ' ' + ty + ')', style: 'font-size:' + (narrow ? 9.5 : 11) + 'px', fill: j >= 7 ? C.dyn : '#353c49' }, s, m);
    });
    B.rise(s);
  });
})();
