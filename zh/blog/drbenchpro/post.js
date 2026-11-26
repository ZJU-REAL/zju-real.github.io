/* Figures for "DRBench Pro" (Chinese copy; keep in sync with blog/drbenchpro/post.js). Numbers come from the paper (tables and figures cited in each caption) and the
   project's released results (github.com/ZJU-REAL/DRBenchPro, website/assets/data/results.json). */
(function () {
  'use strict';
  var B = window.Blog, S = B.svg, reduce = B.reduce;
  var C = { dr: '#2b6cb0', drInk: '#1f4f86', cov: '#3f8a4c', mis: '#c4553f', ghost: '#c9cfd7', ink: '#151a22', mute: '#6b7382', line: '#e2e6ec',
    drs: '#c4692c', nat: '#2f6db5', loc: '#3f8a6a', dep: '#7a5bb0' };
  var Q = new URLSearchParams(location.search);
  function qv(k, n) { var v = +(Q.get(k) || 0); return v >= 0 && v < n ? v : 0; }
  var CAT = { drs: '深度研究系统', nat: '原生搜索大模型', loc: '本地研究框架' };

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function soft(k) { return 1 - Math.pow(1 - clamp(k), 3); }
  function win(t, a, b) { return clamp((t - a) / (b - a)); }
  function mount(id, draw) {
    var el = typeof id === 'string' ? document.getElementById(id) : id; if (!el) return null;
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
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting && e.intersectionRatio > 0.2); }); }, { threshold: [0, .2] }).observe(el);
  }
  function legend(el, items) {
    if (!el) return;
    el.innerHTML = items.map(function (it) { return '<span><i style="background:' + it[1] + '"></i>' + it[0] + '</span>'; }).join('');
  }

  /* ---------- the coverage metric (paper Appendix B, Algorithm 1) ---------- */
  var BETA = .6, ALPHA = .25, ETA = .75, RHO = .5;
  function rankAgg(v) {
    if (!v.length) return 0;
    var s = v.slice().sort(function (a, b) { return b - a; }), num = 0, den = 0;
    s.forEach(function (y, i) { var w = Math.pow(RHO, i); num += w * y; den += w; });
    return num / den;
  }
  // kids: id -> [child ids]; x: id -> 0/1; returns {B, D, O, node: id -> [B, D]}
  function coverage(dirs, kids, x) {
    var node = {};
    function ev(v) {
      var ch = kids[v] || [], xv = x[v] ? 1 : 0;
      if (!ch.length) { node[v] = [xv, xv]; return node[v]; }
      var r = ch.map(ev), mb = r.reduce(function (s, q) { return s + q[0]; }, 0) / r.length;
      var d = rankAgg(r.map(function (q) { return q[1]; }));
      node[v] = [BETA * xv + (1 - BETA) * mb, ALPHA * xv + (1 - ALPHA) * d * (ETA + (1 - ETA) * xv)];
      return node[v];
    }
    var r = dirs.map(ev);
    var b = r.reduce(function (s, q) { return s + q[0]; }, 0) / r.length, dd = rankAgg(r.map(function (q) { return q[1]; }));
    return { B: b, D: dd, O: Math.sqrt(b * dd), node: node };
  }

  /* ================= Result cards ================= */
  var CARDS = [
    { max: 70, d: 2, unit: '%', rows: [['Claude Opus 5', 57.04, C.nat], ['Grok 4.5', 50.98, C.nat], ['o3 Deep Research', 49.45, C.drs], ['Qwen3.8 Max（本地框架）', 47.94, C.loc]] },
    { max: 60, d: 2, unit: '%', rows: [['使用自带搜索', 31.08, C.nat], ['在本地研究框架中', 46.62, C.loc]] },
    { max: 100, d: 1, unit: '%', rows: [['第 1 跳知识', 78.4, C.dr], ['第 2 跳知识', 49.5, C.dr], ['第 3 跳知识', 31.0, C.dr]] },
    { max: 1, d: 3, rows: [['广度与深度（DRBench Pro）', .751, C.dr], ['按层均衡覆盖', .615, '#9aa3ae'], ['评分细则平铺计数', .508, '#9aa3ae']] }
  ];
  Array.prototype.forEach.call(document.querySelectorAll('.card-chart'), function (el) {
    var cd = CARDS[+el.dataset.card]; el.id = 'card-' + el.dataset.card;
    mount(el.id, function (host, W) {
      var rowH = 30, H = cd.rows.length * rowH + 4, vw = W - 64, u = cd.unit || '';
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': cd.rows.map(function (r) { return r[0] + ' ' + r[1].toFixed(cd.d) + u; }).join(', ') }, host);
      cd.rows.forEach(function (r, i) {
        var y = i * rowH;
        S('text', { x: 0, y: y + 10, class: 'lbl', style: 'font-size:11.5px' }, s, r[0]);
        S('rect', { x: 0, y: y + 15, width: vw, height: 8, rx: 3, fill: '#f0f2f5' }, s);
        S('rect', { x: 0, y: y + 15, width: vw * r[1] / cd.max, height: 8, rx: 3, fill: r[2], class: 'rbx', style: '--d:' + (i * 90) + 'ms', 'data-tv': r[1].toFixed(cd.d) + u, 'data-tl': r[0], 'data-tc': r[2] }, s);
        S('text', { x: vw * r[1] / cd.max + 6, y: y + 22.5, class: 'val-b rf', style: '--d:' + (i * 90) + 'ms' }, s, r[1].toFixed(cd.d) + u);
      });
      B.rise(s);
    });
  });

  /* ================= Figure 1: build, ask, score ================= */
  (function () {
    var fig = document.querySelector('#fig-1 .d1'); if (!fig) return;
    var PH = [0, 9000, 18000], END = 30200, CYCLE = 31400, HOLD = 30000;
    var J0 = 18300, JS = 700;                   // judge: one rubric every 0.7 s
    // the Roguelike subgraph (paper Figure 10) and the judge's verdicts on the o3 Deep Research report (Table 25)
    var N = [ // lp: label position (r right, l left, b below)
      { id: 'root', l: ['Roguelike'], x: 292, y: 34, h: 0 },
      { id: 'rogue', p: 'root', l: ['Rogue'], x: 186, y: 124, h: 1, r: 1, ok: 1, lp: 'r' },
      { id: 'bam', p: 'root', l: ['Beneath Apple', 'Manor'], x: 424, y: 124, h: 1, r: 10, ok: 1, lp: 'l' },
      { id: 'perma', p: 'rogue', l: ['Permadeath'], x: 60, y: 234, h: 2, r: 2, ok: 1, lp: 'r' },
      { id: 'hack', p: 'rogue', l: ['Hack'], x: 158, y: 234, h: 2, r: 5, ok: 1, lp: 'r' },
      { id: 'bsd', p: 'rogue', l: ['BSD'], x: 246, y: 234, h: 2, r: 7, ok: 1, lp: 'r' },
      { id: 'ken', p: 'rogue', l: ['Ken Arnold'], x: 330, y: 234, h: 2, r: 8, ok: 1, lp: 'r' },
      { id: 'proc', p: 'bam', l: ['Procedural', 'generation'], x: 424, y: 234, h: 2, r: 11, ok: 1, lp: 'r' },
      { id: 'save', p: 'perma', l: ['Save', 'scumming'], x: 36, y: 338, h: 3, r: 3, ok: 1, lp: 'b' },
      { id: 'table', p: 'perma', l: ['Tabletop', 'games'], x: 98, y: 338, h: 3, r: 4, ok: 1, lp: 'b' },
      { id: 'port', p: 'hack', l: ['Porting'], x: 158, y: 338, h: 3, r: 6, ok: 0, lp: 'b' },
      { id: 'curses', p: 'ken', l: ['Curses'], x: 330, y: 338, h: 3, r: 9, ok: 1, lp: 'b' },
      { id: 'seed', p: 'proc', l: ['Random seed'], x: 424, y: 338, h: 3, r: 12, ok: 0, lp: 'b' }
    ];
    var GHOST = [ // the rest of the local tree, unlabeled
      [292, 34, 46, 124], [292, 34, 104, 124], [292, 34, 262, 124], [292, 34, 506, 124], [506, 124, 510, 234], [510, 234, 510, 338]
    ];
    var EV = { // rubric -> [relation, evidence from the report, or null when not covered]
      1: ['Roguelike → Rogue', 'it was Rogue (1980) that truly combined them into the archetype and gave the genre its name.'],
      2: ['Rogue → Permadeath', 'In Rogue, death was easy to come by and meant starting over from scratch'],
      3: ['Permadeath → Save scumming', 'some crafty students found they could copy save files to cheat death'],
      4: ['Permadeath → Tabletop games', 'it also echoed the spirit of D&D campaigns where a character’s death could be permanent'],
      5: ['Rogue → Hack', 'Rogue’s success also inspired direct imitators. The first true “roguelike” in name and spirit was probably Hack'],
      6: ['Hack → Porting', null, '报告写到 Hack 后来发展为 NetHack，但没有提到它被移植到其他平台。'],
      7: ['Rogue → Berkeley Software Distribution', 'it was officially added to the Berkeley Software Distribution (BSD) of Unix'],
      8: ['Rogue → Ken Arnold', 'partnered with Ken Arnold … With Arnold’s help, they polished the game’s code and balance'],
      9: ['Ken Arnold → Curses', 'the curses library on Unix (developed by Ken Arnold)'],
      10: ['Roguelike → Beneath Apple Manor', 'Beneath Apple Manor (by Don Worth, 1978), actually predated Rogue'],
      11: ['Beneath Apple Manor → Procedural generation', 'Beneath Apple Manor (1978) on the Apple II was a pioneer in this area'],
      12: ['Procedural generation → Random seed', null, '报告提到了程序化生成，但没有提到随机种子。']
    };
    var byId = {}, kids = {}, x = {};
    N.forEach(function (n) { byId[n.id] = n; if (n.p) { (kids[n.p] = kids[n.p] || []).push(n.id); x[n.id] = n.ok; } });
    var M = coverage(kids.root, kids, x);
    // when each node's subtree value appears (bottom-up), and when each rubric is judged
    var VAL_T = { perma: 26900, hack: 26900, ken: 26900, proc: 26900, rogue: 27500, bam: 27500 };
    function judgeT(r) { return J0 + (r - 1) * JS; }
    function hopT(h) { return [200, 1200, 3000, 4700][h]; }
    var FOCUS = 6800, RUB = 12000;

    var tabs = fig.querySelectorAll('.d1-tab'), pp = fig.querySelector('.d1-pp');
    var fx = fig.querySelectorAll('.fx'), types = [];
    var jid = document.getElementById('d1-jid'), jrel = document.getElementById('d1-jrel'), jv = document.getElementById('d1-jv'), jev = document.getElementById('d1-jev');
    var meters = fig.querySelectorAll('.d1-meter');
    Array.prototype.forEach.call(fig.querySelectorAll('.fx-type'), function (el) {
      var txt = el.textContent; el.textContent = '';
      var on = document.createElement('span'), off = document.createElement('span');
      on.className = 'on'; off.className = 'off'; off.textContent = txt;
      el.appendChild(on); el.appendChild(off);
      types.push({ el: el, on: on, off: off, txt: txt, a: +el.dataset.a, b: +el.dataset.b, n: -1 });
    });

    var R = null, last = null, lastJ = -1; // element refs (rebuilt on resize), last rendered time
    mount('d1-tree', function (host, W) {
      var fs = W < 470 ? 14 : 13.5, HALO = 'paint-order:stroke;stroke:#fbfcfd;stroke-width:4px;stroke-linejoin:round;';
      var s = S('svg', { viewBox: '0 0 528 382', role: 'img', 'aria-label': 'Roguelike 知识树：Rogue 与 Beneath Apple Manor 两个方向，共 12 条评分细则边' }, host);
      R = { ghosts: [], edges: {}, nodes: {}, labels: {}, pills: {}, vals: {}, root: null };
      var gg = S('g', {}, s);
      GHOST.forEach(function (g) {
        var e = S('path', { d: 'M' + g[0] + ' ' + (g[1] + 6) + ' C' + g[0] + ' ' + ((g[1] + g[3]) / 2) + ' ' + g[2] + ' ' + ((g[1] + g[3]) / 2) + ' ' + g[2] + ' ' + (g[3] - 5), fill: 'none', stroke: C.ghost, 'stroke-width': 1.6, pathLength: 1, 'stroke-dasharray': 1 }, gg);
        var c = S('circle', { cx: g[2], cy: g[3], r: 4.5, fill: '#fff', stroke: C.ghost, 'stroke-width': 1.6 }, gg);
        R.ghosts.push({ e: e, c: c, h: g[3] < 150 ? 1 : g[3] < 280 ? 2 : 3 });
      });
      var ge = S('g', {}, s), gn = S('g', {}, s), gp = S('g', {}, s), gv = S('g', {}, s);
      N.forEach(function (n) {
        if (n.p) {
          var p = byId[n.p], my = (p.y + n.y) / 2;
          R.edges[n.id] = S('path', { d: 'M' + p.x + ' ' + (p.y + 7) + ' C' + p.x + ' ' + my + ' ' + n.x + ' ' + my + ' ' + n.x + ' ' + (n.y - 7), fill: 'none', stroke: C.dr, 'stroke-width': 2.4, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1 }, ge);
          var px = (p.x + n.x) / 2, py = my + (n.h === 1 ? -6 : 0);
          var pg = S('g', { transform: 'translate(' + px + ' ' + py + ')' }, gp);
          S('rect', { x: -14, y: -8.5, width: 28, height: 17, rx: 5, fill: C.dr }, pg);
          S('text', { x: 0, y: 4, 'text-anchor': 'middle', fill: '#fff', style: 'font-size:10.5px;font-weight:700' }, pg, 'R' + n.r);
          R.pills[n.id] = pg;
        }
        var c = S('circle', { cx: n.x, cy: n.y, r: n.h === 0 ? 9 : 6, fill: n.h === 0 ? C.ink : '#fff', stroke: n.h === 0 ? C.ink : C.dr, 'stroke-width': 2.2 }, gn);
        R.nodes[n.id] = c;
        var tg = S('g', {}, gn);
        if (n.h === 0) {
          S('text', { x: n.x + 16, y: n.y + 5, style: 'font-size:' + (fs + 2) + 'px;font-weight:700', fill: C.ink }, tg, n.l[0]);
          var wg = S('g', { transform: 'translate(' + (n.x - 36) + ' ' + (n.y - 9) + ')' }, tg);
          S('rect', { width: 18, height: 18, rx: 4, fill: C.ink }, wg);
          S('text', { x: 9, y: 13.5, 'text-anchor': 'middle', fill: '#fff', style: 'font:700 12px Georgia,serif' }, wg, 'W');
        } else {
          n.l.forEach(function (ln, i) {
            var lx = n.lp === 'r' ? n.x + 10 : n.lp === 'l' ? n.x - 10 : n.x, ly = n.lp === 'b' ? n.y + 21 + i * (fs + 1) : n.y + 4.5 + i * (fs + 1);
            S('text', { x: lx, y: ly, 'text-anchor': n.lp === 'r' ? 'start' : n.lp === 'l' ? 'end' : 'middle', style: HALO + 'font-size:' + fs + 'px' + (n.h === 1 ? ';font-weight:600' : ''), fill: '#353c49' }, tg, ln);
          });
        }
        R.labels[n.id] = tg;
        if (VAL_T[n.id]) {
          var v = M.node[n.id], vy = n.y + 4.5 + (n.l.length - 1) * (fs + 1) + 15, vx = n.lp === 'l' ? n.x - 44 : n.x + 44, vg = S('g', { transform: 'translate(' + vx + ' ' + vy + ')' }, gv);
          S('rect', { x: -34, y: -10, width: 68, height: 17, rx: 4, fill: '#151a22' }, vg);
          S('text', { x: 0, y: 2.5, 'text-anchor': 'middle', fill: '#fff', style: 'font-size:11px;font-weight:600' }, vg, v[0].toFixed(2) + ' / ' + v[1].toFixed(2));
          R.vals[n.id] = vg;
        }
      });
      if (last !== null) render(last);
    });

    function cur(t) { var i = Math.floor((t - J0) / JS) + 1; return i < 1 ? 0 : i > 12 ? 12 : i; }
    var mainEl = fig.querySelector('.d1-main');
    function render(t) {
      last = t;
      var ph = t < PH[1] ? 0 : t < PH[2] ? 1 : 2;
      if (fig.getAttribute('data-phase') !== String(ph)) fig.setAttribute('data-phase', ph);
      Array.prototype.forEach.call(tabs, function (tb, i) {
        var a = PH[i], b = i < 2 ? PH[i + 1] : END;
        tb.querySelector('.d1-prog').style.setProperty('--p', win(t, a, b).toFixed(3));
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
      if (R) {
        var foc = ease(win(t, FOCUS, FOCUS + 900));
        R.ghosts.forEach(function (g) {
          var k = ease(win(t, hopT(g.h), hopT(g.h) + 1100));
          g.e.setAttribute('stroke-dashoffset', (1 - k).toFixed(3));
          var op = (k > 0 ? 1 : 0) * (1 - .75 * foc);
          g.e.style.opacity = op.toFixed(3); g.c.style.opacity = (soft(win(t, hopT(g.h) + 700, hopT(g.h) + 1100)) * (1 - .75 * foc)).toFixed(3);
        });
        N.forEach(function (n) {
          var a = hopT(n.h), kN = soft(win(t, a + (n.h ? 700 : 0), a + (n.h ? 1100 : 400)));
          R.nodes[n.id].style.opacity = kN.toFixed(3);
          R.labels[n.id].style.opacity = kN.toFixed(3);
          if (!n.p) return;
          var e = R.edges[n.id], kE = ease(win(t, a, a + 1100));
          e.setAttribute('stroke-dashoffset', (1 - kE).toFixed(3));
          e.style.opacity = kE > 0 ? '1' : '0';
          var jt = judgeT(n.r), judged = t >= jt + 250;
          var col = judged ? (n.ok ? C.cov : C.mis) : (foc > .5 ? C.dr : '#8fa4bb');
          e.setAttribute('stroke', col);
          e.setAttribute('stroke-width', foc > .5 ? 2.6 : 2);
          e.setAttribute('stroke-dasharray', judged && !n.ok ? '0.035 0.03' : '1');
          if (judged && !n.ok) e.setAttribute('stroke-dashoffset', '0');
          var c = R.nodes[n.id];
          c.setAttribute('stroke', judged ? (n.ok ? C.cov : C.mis) : (foc > .5 ? C.dr : '#8fa4bb'));
          c.setAttribute('fill', judged && n.ok ? C.cov : '#fff');
          var kp = soft(win(t, RUB + (n.r - 1) * 120, RUB + (n.r - 1) * 120 + 260));
          var pg = R.pills[n.id];
          pg.style.opacity = kp.toFixed(3);
          var act = t >= jt && t < jt + JS && t < J0 + 12 * JS;
          pg.firstChild.setAttribute('fill', judged ? (n.ok ? C.cov : C.mis) : C.dr);
          pg.firstChild.setAttribute('stroke', act ? C.ink : 'none'); pg.firstChild.setAttribute('stroke-width', act ? 2 : 0);
          if (R.vals[n.id]) R.vals[n.id].style.opacity = soft(win(t, VAL_T[n.id], VAL_T[n.id] + 400)).toFixed(3);
        });
      }
      // judge panel
      var j = cur(t);
      if (j !== lastJ) {
        lastJ = j;
        var e = EV[j || 1];
        jid.textContent = 'R' + (j || 1); jrel.textContent = e[0];
        jv.textContent = j ? (e[1] ? '满足' : '不满足') : '';
        jv.className = 'd1-verdict' + (j ? (e[1] ? ' ok' : ' no') : '');
        jid.style.background = j ? (e[1] ? C.cov : C.mis) : C.dr;
        jev.innerHTML = !j ? '' : e[1] ? '<span class="d1-k">报告中的证据</span><q>' + e[1] + '</q>' : '<span class="d1-k">报告中没有相关陈述</span><span class="none">' + e[2] + '</span>';
      }
      var vals = { b: M.B, d: M.D, o: M.O };
      Array.prototype.forEach.call(meters, function (m, i) {
        m.querySelector('b').style.setProperty('--k', (vals[m.dataset.k] * ease(win(t, 28400 + i * 200, 29400 + i * 200))).toFixed(3));
      });
      mainEl.style.opacity = (1 - win(t, END, CYCLE)).toFixed(3);
    }
    // the final numbers in the score panel come from the metric itself
    Array.prototype.forEach.call(meters, function (m) { m.querySelector('em').textContent = ({ b: M.B, d: M.D, o: M.O })[m.dataset.k].toFixed(2); });

    var params = new URLSearchParams(location.search), freeze = params.has('f1t') ? +params.get('f1t') : null;
    if (reduce && freeze === null) {
      render(HOLD);
      Array.prototype.forEach.call(tabs, function (tb, i) { tb.addEventListener('click', function () { fig.setAttribute('data-phase', i); }); });
      return;
    }
    pp.hidden = false;
    var vt = 0, lastTs = null, inView = false, paused = false, raf = 0;
    function now() { return freeze !== null ? freeze : vt % CYCLE; }
    function playing() { return freeze === null && inView && !paused && !document.hidden; }
    function frame(ts) {
      raf = 0;
      if (!playing()) { lastTs = null; render(now()); return; }
      if (lastTs !== null) vt += Math.min(ts - lastTs, 100);
      lastTs = ts; render(now()); raf = requestAnimationFrame(frame);
    }
    function update() { if (playing()) { if (!raf) { lastTs = null; raf = requestAnimationFrame(frame); } } else render(now()); }
    function setPaused(p) {
      paused = p; pp.setAttribute('aria-pressed', p ? 'true' : 'false');
      pp.querySelector('span').textContent = p ? '播放' : '暂停';
      pp.querySelector('svg').innerHTML = p ? '<path d="M3 1.8v8.4L10 6z" fill="currentColor"/>' : '<rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>';
      update();
    }
    pp.addEventListener('click', function () { setPaused(!paused); });
    Array.prototype.forEach.call(tabs, function (tb, i) {
      tb.addEventListener('click', function () { vt = PH[i]; lastJ = -1; render(now()); update(); });
    });
    visible(fig, function (v) { inView = v; update(); });
    document.addEventListener('visibilitychange', update);
    render(now());
  })();

  /* ================= Figure 2: same count, different shape ================= */
  (function () {
    var host = document.getElementById('f2-tree'), out = document.getElementById('f2-out'); if (!host) return;
    var dirs = [], kids = {}, nodes = [];
    for (var d = 0; d < 4; d++) {
      var cx = 75 + d * 150, a = 'a' + d;
      dirs.push(a); nodes.push({ id: a, x: cx, y: 74, h: 1, p: 'root' }); kids[a] = [];
      for (var i = 0; i < 2; i++) {
        var b = 'b' + d + i, bx = cx + (i ? 36 : -36);
        kids[a].push(b); nodes.push({ id: b, x: bx, y: 146, h: 2, p: a }); kids[b] = [];
        for (var k = 0; k < 2; k++) { var c = 'c' + d + i + k; kids[b].push(c); nodes.push({ id: c, x: bx + (k ? 16 : -16), y: 218, h: 3, p: b }); }
      }
    }
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    function preset(ids) { var x = {}; nodes.forEach(function (n) { x[n.id] = ids.indexOf(n.id) >= 0 ? 1 : 0; }); return x; }
    var ALL = nodes.map(function (n) { return n.id; });
    var PRE = [
      ['宽而浅', preset(ALL.filter(function (id) { return id[0] !== 'c'; }))],
      ['窄而深、连续', preset(['a0', 'b00', 'b01', 'c000', 'c001', 'c010', 'c011', 'a1', 'b10', 'c100', 'c101', 'b11'])],
      ['零散', preset(['c000', 'c001', 'c010', 'c100', 'c101', 'c110', 'c200', 'c201', 'c210', 'c300', 'c301', 'c310'])],
      ['全部覆盖', preset(ALL)]
    ];
    var x = Object.assign({}, PRE[0][1]);
    var pre = document.getElementById('f2-pre');
    seg(pre, PRE.map(function (p) { return p[0]; }), 0, function (i) { x = Object.assign({}, PRE[i][1]); paint(); });
    var refs = null;
    mount(host, function (el, W) {
      var s = S('svg', { viewBox: '0 0 600 262', role: 'img', 'aria-label': '可交互的小树：四个方向，28 条评分细则' }, el);
      refs = { e: {}, c: {}, v: {} };
      S('circle', { cx: 300, cy: 18, r: 8, fill: C.ink }, s);
      S('text', { x: 314, y: 22, style: 'font-size:12px;font-weight:600', fill: C.ink }, s, '研究问题');
      var ge = S('g', {}, s), gn = S('g', {}, s);
      nodes.forEach(function (n) {
        var p = n.p === 'root' ? { x: 300, y: 18 } : byId[n.p], my = (p.y + n.y) / 2;
        refs.e[n.id] = S('path', { d: 'M' + p.x + ' ' + (p.y + 6) + ' C' + p.x + ' ' + my + ' ' + n.x + ' ' + my + ' ' + n.x + ' ' + (n.y - 6), fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, ge);
        var g = S('g', { class: 'nd', tabindex: 0, role: 'button', 'aria-label': '切换第 ' + n.h + ' 跳评分细则的覆盖状态' }, gn);
        S('circle', { cx: n.x, cy: n.y, r: 13, fill: 'transparent' }, g);
        refs.c[n.id] = S('circle', { cx: n.x, cy: n.y, r: n.h === 1 ? 7.5 : 6.5, 'stroke-width': 2 }, g);
        function tog() { x[n.id] = x[n.id] ? 0 : 1; press(pre, -1); paint(); }
        g.addEventListener('click', tog);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
      });
      dirs.forEach(function (a, d) {
        refs.v[a] = S('text', { x: byId[a].x, y: 252, 'text-anchor': 'middle', style: 'font-size:11.5px', fill: C.mute }, s, '');
        S('text', { x: byId[a].x + 12, y: 70, style: 'font-size:11px;font-weight:600', fill: C.mute }, s, '方向 ' + (d + 1));
      });
      paint();
    });
    out.innerHTML = '<div class="d2-m" data-k="B" style="--c:' + C.dr + '"><div class="row"><span>广度</span><em></em></div><i><b></b></i></div>' +
      '<div class="d2-m" data-k="D" style="--c:' + C.dep + '"><div class="row"><span>深度</span><em></em></div><i><b></b></i></div>' +
      '<div class="d2-m" data-k="O" style="--c:' + C.ink + '"><div class="row"><span>总体覆盖率</span><em></em></div><i><b></b></i></div>' +
      '<div class="d2-m flat" data-k="F" style="--c:#9aa3ae"><div class="row"><span>平铺计数</span><em></em></div><i><b></b></i></div>' +
      '<p class="d2-hint">每个方向下方的数字为该方向的广度 / 深度。</p>';
    paint();
    function paint() {
      if (!refs) return;
      var m = coverage(dirs, kids, x), n = 0;
      nodes.forEach(function (nd) {
        var on = !!x[nd.id]; if (on) n++;
        refs.e[nd.id].setAttribute('stroke', on ? C.cov : '#d3d8df');
        refs.e[nd.id].setAttribute('stroke-dasharray', on ? '' : '4 4');
        refs.c[nd.id].setAttribute('fill', on ? C.cov : '#fff');
        refs.c[nd.id].setAttribute('stroke', on ? C.cov : '#aab2bd');
      });
      dirs.forEach(function (a) { var v = m.node[a]; refs.v[a].textContent = v[0].toFixed(2) + ' / ' + v[1].toFixed(2); });
      var vals = { B: m.B, D: m.D, O: m.O, F: n / nodes.length };
      Array.prototype.forEach.call(out.querySelectorAll('.d2-m'), function (el) {
        var k = el.dataset.k;
        el.querySelector('em').textContent = k === 'F' ? n + ' / 28 = ' + vals.F.toFixed(2) : vals[k].toFixed(2);
        el.querySelector('b').style.setProperty('--k', vals[k].toFixed(3));
      });
    }
  })();

  /* ================= Figure 3: rankings ================= */
  var AG = [ // [name, sub, cat, overall, breadth, depth] (results.json, unrounded)
    ['o3 Deep Research', '', 'drs', 49.4459, 45.775, 54.3185],
    ['Perplexity Sonar Deep Research', '', 'drs', 46.0648, 39.9986, 54.0786],
    ['Qwen Deep Research', '', 'drs', 35.1596, 29.3311, 43.3671],
    ['Claude Opus 5', '', 'nat', 57.0359, 53.0869, 61.9078],
    ['Grok 4.5', '', 'nat', 50.9784, 49.06, 53.694],
    ['GPT-5.6 Sol', '', 'nat', 47.8022, 43.131, 53.9591],
    ['Gemini 3.1 Pro Preview', '', 'nat', 45.4993, 42.6488, 49.4403],
    ['Sonar Reasoning Pro', '', 'nat', 44.7619, 40.8595, 50.2449],
    ['Qwen3.8 Max', '原生搜索', 'nat', 36.5287, 31.083, 44.0878],
    ['Qwen3.8 Max', '本地框架', 'loc', 47.9378, 46.6215, 50.3661],
    ['MiniMax M3', '', 'loc', 45.3429, 44.3368, 47.5469],
    ['GLM 5.2', '', 'loc', 45.3368, 44.6079, 47.092],
    ['DeepSeek V4 Flash', '', 'loc', 42.6284, 41.4181, 45.042],
    ['DeepSeek V4 Pro', '', 'loc', 39.2182, 36.9624, 43.0344],
    ['Qwen3.7 Plus', '', 'loc', 36.1039, 35.3732, 37.9411],
    ['Gemma 4 31B', '', 'loc', 32.0015, 30.4267, 34.817]
  ];
  (function () {
    var host = document.getElementById('f3'); if (!host) return;
    legend(document.getElementById('f3-legend'), [[CAT.drs, C.drs], [CAT.nat, C.nat], [CAT.loc, C.loc]]);
    var RH = 30, MAX = 70, m = 0, shown = false;
    host.style.height = (AG.length * RH) + 'px';
    var rows = AG.map(function (a) {
      var r = document.createElement('div'); r.className = 'd3-row';
      r.innerHTML = '<span class="d3-rk"></span><span class="d3-nm">' + a[0] + (a[1] ? '<small>' + a[1] + '</small>' : '') + '</span><span class="d3-tr"><span class="d3-bar" style="background:' + C[a[2]] + '"></span><span class="d3-val"></span></span>';
      r.setAttribute('data-tl', a[0] + (a[1] ? ' (' + a[1] + ')' : '')); r.setAttribute('data-tc', C[a[2]]);
      host.appendChild(r); return r;
    });
    function lay() {
      var order = AG.map(function (_, i) { return i; }).sort(function (p, q) { return AG[q][3 + m] - AG[p][3 + m]; });
      order.forEach(function (ai, rank) {
        var r = rows[ai], v = AG[ai][3 + m];
        r.style.top = (rank * RH) + 'px';
        r.classList.toggle('top', rank === 0);
        r.querySelector('.d3-rk').textContent = rank + 1;
        var pct = shown ? v / MAX * 100 : 0;
        r.querySelector('.d3-bar').style.width = pct + '%';
        var val = r.querySelector('.d3-val'); val.style.left = pct + '%'; val.textContent = shown ? v.toFixed(2) : '';
        r.setAttribute('data-tv', ['总体 ', '广度 ', '深度 '][m] + v.toFixed(2) + '% · 第 ' + (rank + 1) + ' 名 · ' + CAT[AG[ai][2]]);
      });
    }
    seg(document.getElementById('f3-m'), ['总体覆盖率', '广度', '深度'], 0, function (i) { m = i; lay(); });
    lay();
    visible(host, function (v) { if (v && !shown) { shown = true; setTimeout(lay, reduce ? 0 : 60); } });
  })();

  /* ================= Figure 4: breadth against depth ================= */
  (function () {
    var host = document.getElementById('f4'); if (!host) return;
    var note = document.getElementById('f4-note');
    var CASES = [
      null,
      { iso: 39.6, pts: [['Perplexity Sonar Deep Research', 27.33, 55.19, 38.83, C.drs, 'r'], ['Grok 4.5', 54.48, 29.82, 40.31, C.nat, 'l']],
        note: '<b>Lew Grade：</b>总体覆盖率几乎相同（38.83 对 40.31），策略却相反：Perplexity 沿少数知识链走得很远，Grok 覆盖多数方向但停留在浅层。' },
      { iso: 40.6, pts: [['o3 Deep Research', 32.11, 48.26, 39.37, C.drs, 'l'], ['GPT-5.6 Sol', 34.64, 50.43, 41.79, C.nat, 'r']],
        note: '<b>禁酒运动：</b>三项得分都很接近，但论文的分支级视图（论文图 9）显示，两份报告沿同一棵树上不同的知识链展开。' }
    ];
    var NOTE0 = '有四个智能体的深度几乎相同（53.7 至 54.3），广度却从 40.0（Perplexity Sonar Deep Research）到 49.1（Grok 4.5）不等。Claude Opus 5 单独位于右上角。';
    var LBL = { 'Claude Opus 5': 'l', 'Grok 4.5': 'r', 'o3 Deep Research': 'a', 'Perplexity Sonar Deep Research': 'l', 'Qwen3.8 Maxlocal framework': 'r', 'Qwen3.8 Maxnative search': 'r', 'Qwen Deep Research': 'bl', 'Gemma 4 31B': 'r' };
    var view = qv('f4', 3), api;
    seg(document.getElementById('f4-v'), ['16 个智能体', '样例：Lew Grade', '样例：禁酒运动'], view, function (i) { view = i; api.redraw(); });
    api = mount(host, function (el, W) {
      var narrow = W < 560, H = narrow ? 330 : 380, ml = 46, mr = 16, mt = 12, mb = 40;
      var X0 = 25, X1 = 60, Y0 = 25, Y1 = 65;
      function px(v) { return ml + (v - X0) / (X1 - X0) * (W - ml - mr); }
      function py(v) { return mt + (1 - (v - Y0) / (Y1 - Y0)) * (H - mt - mb); }
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '广度与深度' }, el);
      for (var g = 30; g <= 60; g += 5) {
        S('line', { x1: px(g), x2: px(g), y1: mt, y2: H - mb, class: 'grid' }, s);
        S('text', { x: px(g), y: H - mb + 16, 'text-anchor': 'middle', class: 'lbl' }, s, g);
      }
      for (var h = 30; h <= 65; h += 5) {
        S('line', { x1: ml, x2: W - mr, y1: py(h), y2: py(h), class: 'grid' }, s);
        S('text', { x: ml - 8, y: py(h) + 4, 'text-anchor': 'end', class: 'lbl' }, s, h);
      }
      S('text', { x: (ml + W - mr) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl-b' }, s, '广度（%）');
      S('text', { x: 12, y: (mt + H - mb) / 2, 'text-anchor': 'middle', class: 'lbl-b', transform: 'rotate(-90 12 ' + ((mt + H - mb) / 2) + ')' }, s, '深度（%）');
      var isos = view ? [CASES[view].iso] : [30, 40, 50, 60];
      isos.forEach(function (c) {
        var d = '', first = true;
        for (var b = X0; b <= X1 + .01; b += .25) { var dv = c * c / b; if (dv < Y0 || dv > Y1) continue; d += (first ? 'M' : 'L') + px(b).toFixed(1) + ' ' + py(dv).toFixed(1); first = false; }
        S('path', { d: d, fill: 'none', stroke: view ? C.ink : '#aab2bd', 'stroke-width': view ? 1.6 : 1.2, 'stroke-dasharray': '5 5', class: 'rf' }, s);
        var bx = Math.min(X1 - .5, c * c / Y0 - .5), lx = Math.max(X0 + 1, Math.min(bx, X1 - 1)), ly = c * c / lx;
        if (!view) S('text', { x: px(lx) - 4, y: py(ly) - 6, 'text-anchor': 'end', class: 'lbl rf', style: 'font-size:11px' }, s, '√(B·D) = ' + c);
        else S('text', { x: px(X1) - 4, y: py(c * c / X1) - 8, 'text-anchor': 'end', class: 'lbl rf', style: 'font-size:11px' }, s, '√(B·D) ≈ ' + c.toFixed(0));
      });
      var ga = S('g', { style: 'opacity:' + (view ? .18 : 1) + ';transition:opacity .5s' }, s);
      AG.forEach(function (a, i) {
        var cxp = px(a[4]), cyp = py(a[5]), key = a[0] + a[1];
        S('circle', { cx: cxp, cy: cyp, r: narrow ? 5 : 6, fill: C[a[2]], stroke: '#fff', 'stroke-width': 1.5, class: 'rf', style: '--d:' + (i * 40) + 'ms', tabindex: view ? -1 : 0,
          'data-tl': a[0] + (a[1] ? ' (' + a[1] + ')' : ''), 'data-tc': C[a[2]], 'data-tv': '广度 ' + a[4].toFixed(2) + ' · 深度 ' + a[5].toFixed(2) + ' · 总体 ' + a[3].toFixed(2) }, ga);
        var pos = LBL[key]; if (!pos || view) return;
        var nm = a[0] === 'Perplexity Sonar Deep Research' ? 'Sonar Deep Research' : a[0] + (a[1] ? '（' + (a[1] === '本地框架' ? '本地' : '原生') + '）' : '');
        var o = { l: [-10, 4, 'end'], r: [10, 4, 'start'], a: [0, -11, 'middle'], b: [8, 17, 'start'], bl: [-6, 18, 'end'] }[pos];
        S('text', { x: cxp + o[0], y: cyp + o[1], 'text-anchor': o[2], class: 'lbl rf', style: '--d:' + (i * 40) + 'ms;font-size:11.5px' }, ga, nm);
      });
      if (view) {
        var cs = CASES[view], p0 = cs.pts[0], p1 = cs.pts[1];
        S('line', { x1: px(p0[1]), y1: py(p0[2]), x2: px(p1[1]), y2: py(p1[2]), stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '2 4', class: 'rf' }, s);
        cs.pts.forEach(function (p, i) {
          S('circle', { cx: px(p[1]), cy: py(p[2]), r: 9, fill: p[4], stroke: '#fff', 'stroke-width': 2, class: 'rf', style: '--d:' + (i * 200) + 'ms', tabindex: 0, 'data-tl': p[0], 'data-tc': p[4], 'data-tv': '广度 ' + p[1].toFixed(2) + ' · 深度 ' + p[2].toFixed(2) + ' · 总体 ' + p[3].toFixed(2) }, s);
          var right = p[5] === 'r', tx = px(p[1]) + (right ? 14 : -14);
          S('text', { x: tx, y: py(p[2]) - 2, 'text-anchor': right ? 'start' : 'end', class: 'lbl-b rf', style: '--d:' + (i * 200) + 'ms;font-size:12.5px;paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round' }, s, p[0]);
          S('text', { x: tx, y: py(p[2]) + 14, 'text-anchor': right ? 'start' : 'end', class: 'lbl rf', style: '--d:' + (i * 200) + 'ms;font-size:11.5px;paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round' }, s, 'O ' + p[3].toFixed(1) + ' · B ' + p[1].toFixed(1) + ' · D ' + p[2].toFixed(1));
        });
      }
      note.innerHTML = view ? CASES[view].note : NOTE0;
      B.rise(s); if (view) B.replay(s);
    });
  })();

  /* ================= Figure 5: domains ================= */
  (function () {
    var host = document.getElementById('f5'); if (!host) return;
    var DOM = ['成人', '艺术与设计', '犯罪与法律', '教育与就业', '娱乐', '时尚与美容', '金融与商业', '餐饮', '游戏', '硬件', '健康', '历史', '家居与爱好', '工业', '文学', '政治', '宗教', '科学与技术', '社会生活', '软件', '软件开发', '体育与健身', '交通运输', '旅行'];
    var COLS = [ // [short name, cat, full name, 24 domain scores] (paper Figure 4)
      ['o3 DR', 'drs', 'o3 Deep Research', [48.9, 50.3, 48.1, 49.1, 47.0, 45.7, 40.7, 37.5, 52.5, 54.4, 53.4, 51.2, 56.8, 32.0, 53.2, 50.5, 52.4, 58.7, 47.2, 53.1, 60.8, 44.4, 49.0, 49.6]],
      ['Sonar DR', 'drs', 'Perplexity Sonar Deep Research', [38.2, 48.9, 40.1, 51.3, 45.8, 49.8, 47.1, 37.6, 48.6, 52.7, 54.3, 51.1, 45.2, 28.6, 37.2, 52.1, 42.5, 57.9, 41.0, 53.1, 55.9, 42.8, 37.9, 46.0]],
      ['Qwen DR', 'drs', 'Qwen Deep Research', [35.4, 35.1, 22.1, 33.8, 23.9, 28.8, 35.8, 19.5, 36.7, 44.0, 51.7, 38.3, 34.4, 14.3, 40.3, 42.6, 43.3, 45.6, 37.9, 43.8, 49.2, 31.7, 19.9, 35.4]],
      ['Claude Opus 5', 'nat', 'Claude Opus 5', [63.6, 58.9, 57.3, 62.2, 49.0, 56.9, 56.3, 47.2, 54.5, 60.0, 60.5, 55.8, 61.7, 45.2, 49.6, 56.2, 62.1, 62.4, 58.4, 63.2, 67.9, 49.4, 54.6, 55.9]],
      ['Grok 4.5', 'nat', 'Grok 4.5', [55.8, 57.4, 46.3, 59.9, 47.1, 50.6, 48.0, 36.4, 54.1, 50.6, 57.9, 48.9, 54.5, 38.7, 47.3, 54.3, 58.4, 59.0, 51.5, 55.2, 54.4, 46.7, 36.0, 54.3]],
      ['GPT-5.6 Sol', 'nat', 'GPT-5.6 Sol', [46.3, 49.9, 38.2, 50.4, 45.1, 46.4, 50.6, 34.9, 45.4, 47.3, 53.8, 43.9, 52.3, 30.7, 47.2, 53.8, 45.7, 62.1, 48.1, 54.4, 62.7, 42.9, 49.1, 46.1]],
      ['Gemini 3.1 Pro', 'nat', 'Gemini 3.1 Pro Preview', [50.8, 47.1, 40.0, 51.0, 41.8, 44.7, 44.9, 35.6, 48.7, 50.3, 53.4, 44.6, 47.6, 26.4, 47.3, 46.4, 47.3, 53.7, 48.1, 49.1, 54.4, 36.1, 40.0, 42.7]],
      ['Sonar R. Pro', 'nat', 'Sonar Reasoning Pro', [35.8, 41.4, 40.0, 52.3, 43.6, 42.2, 42.9, 31.5, 48.4, 46.6, 53.4, 46.1, 46.2, 26.2, 44.8, 49.7, 47.9, 54.5, 41.6, 52.9, 58.4, 41.4, 39.4, 47.3]],
      ['Qwen3.8 Max (N)', 'nat', 'Qwen3.8 Max（原生搜索）', [40.8, 31.1, 27.9, 40.5, 35.9, 37.3, 31.6, 23.4, 39.4, 42.6, 46.4, 34.8, 42.0, 21.6, 37.1, 37.6, 35.8, 50.6, 39.5, 39.2, 50.4, 33.3, 27.0, 30.7]],
      ['Qwen3.8 Max (L)', 'loc', 'Qwen3.8 Max（本地框架）', [49.4, 47.9, 45.1, 53.2, 43.7, 42.3, 45.5, 42.4, 47.0, 53.2, 51.6, 45.8, 56.5, 37.7, 44.6, 49.3, 48.2, 53.9, 48.2, 49.7, 58.4, 41.2, 46.3, 49.4]],
      ['GLM 5.2', 'loc', 'GLM 5.2', [52.8, 45.8, 39.5, 49.4, 40.2, 46.2, 46.2, 39.7, 50.1, 46.7, 40.7, 44.4, 46.6, 31.9, 47.4, 41.5, 44.4, 52.7, 44.5, 50.7, 54.1, 41.1, 42.7, 48.7]],
      ['MiniMax M3', 'loc', 'MiniMax M3', [40.0, 41.1, 47.8, 46.2, 36.8, 40.8, 45.5, 45.0, 50.9, 50.7, 51.6, 42.7, 45.8, 31.0, 42.6, 51.1, 47.4, 51.9, 47.8, 47.6, 51.8, 37.3, 44.2, 50.7]],
      ['DS V4 Flash', 'loc', 'DeepSeek V4 Flash', [50.6, 43.1, 41.6, 52.1, 38.9, 36.7, 44.1, 37.7, 42.0, 44.5, 47.5, 38.2, 45.3, 29.6, 34.0, 41.2, 42.6, 46.0, 44.5, 48.1, 52.9, 40.2, 41.4, 40.3]],
      ['DS V4 Pro', 'loc', 'DeepSeek V4 Pro', [43.1, 38.2, 42.3, 46.7, 37.1, 42.9, 38.7, 37.0, 44.1, 34.8, 44.4, 39.8, 36.8, 19.9, 39.7, 35.0, 37.4, 47.4, 35.2, 41.5, 47.3, 38.1, 34.4, 39.3]],
      ['Qwen3.7 Plus', 'loc', 'Qwen3.7 Plus', [32.7, 32.2, 34.7, 44.1, 32.1, 38.5, 37.9, 32.3, 40.2, 39.3, 42.0, 32.8, 39.8, 23.6, 31.1, 30.7, 36.2, 39.9, 40.6, 44.8, 41.0, 35.5, 30.4, 34.2]],
      ['Gemma 4 31B', 'loc', 'Gemma 4 31B', [29.1, 32.9, 25.2, 38.7, 29.7, 26.1, 34.3, 29.6, 34.9, 39.4, 38.9, 30.2, 37.4, 19.8, 24.8, 32.7, 32.0, 41.4, 28.7, 30.7, 39.5, 31.7, 25.8, 34.6]]
    ];
    var MEAN = DOM.map(function (_, r) { return COLS.reduce(function (s, c) { return s + c[3][r]; }, 0) / COLS.length; });
    var LO = 14, MID = 44, HI = 68;
    function mix(a, b, k) { var p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16); var r = [16, 8, 0].map(function (sh) { return Math.round(((p >> sh) & 255) * (1 - k) + ((q >> sh) & 255) * k); }); return 'rgb(' + r.join(',') + ')'; }
    function col(v) { return v < MID ? mix('#3d6fb6', '#f5f2ec', Math.pow((v - LO) / (MID - LO), .9)) : mix('#f5f2ec', '#d9772b', Math.pow((v - MID) / (HI - MID), .9)); }
    function dark(v) { return v < 24 || v > 60; }
    var sc = document.getElementById('f5-scale');
    sc.innerHTML = '<span>' + LO + '</span><i style="background:linear-gradient(90deg,#3d6fb6,#f5f2ec 56%,#d9772b)"></i><span>' + HI + '%</span>';
    var sorted = false, rowsG = [], rh = 22, top = 118;
    seg(document.getElementById('f5-s'), ['论文顺序', '按领域均值排序'], 0, function (i) { sorted = !!i; place(); });
    function place() {
      var order = DOM.map(function (_, i) { return i; });
      if (sorted) order.sort(function (a, b) { return MEAN[b] - MEAN[a]; });
      order.forEach(function (r, k) { if (rowsG[r]) rowsG[r].style.transform = 'translate(0px,' + (top + k * rh) + 'px)'; });
    }
    mount(host, function (el, W) {
      var lw = 150, minCw = 34, cw = Math.max(minCw, Math.floor((W - lw - 10 - 52) / COLS.length)), TW = lw + cw * COLS.length + 10 + 52, H = top + DOM.length * rh + 6;
      var s = S('svg', { class: 'chart', viewBox: '0 0 ' + TW + ' ' + H, width: TW, height: H, role: 'img', 'aria-label': '各领域、各智能体的总体覆盖率' }, el);
      COLS.forEach(function (c, j) {
        var x = lw + j * cw + cw / 2;
        S('rect', { x: lw + j * cw + 1, y: top - 8, width: cw - 2, height: 4, rx: 2, fill: C[c[1]] }, s);
        S('text', { x: x + 3, y: top - 14, transform: 'rotate(-48 ' + (x + 3) + ' ' + (top - 14) + ')', class: 'lbl', style: 'font-size:11.5px' }, s, c[0]);
      });
      var mx = lw + COLS.length * cw + 10;
      S('text', { x: mx + 26, y: top - 14, 'text-anchor': 'middle', class: 'lbl-b', style: 'font-size:11.5px' }, s, '均值');
      rowsG = [];
      DOM.forEach(function (d, r) {
        var g = S('g', { class: 'row-txt', style: 'transform:translate(0px,' + (top + r * rh) + 'px)' }, s);
        S('text', { x: lw - 8, y: 15, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12px' }, g, d);
        var best = 0; COLS.forEach(function (c, j) { if (c[3][r] > COLS[best][3][r]) best = j; });
        COLS.forEach(function (c, j) {
          var v = c[3][r];
          S('rect', { x: lw + j * cw + 1, y: 1, width: cw - 2, height: rh - 2, rx: 3, fill: col(v), class: 'rf cell', style: '--d:' + (j * 30) + 'ms', stroke: j === best ? C.ink : 'none', 'stroke-width': j === best ? 1.6 : 0,
            tabindex: 0, 'data-tl': c[2] + ' · ' + d, 'data-tc': C[c[1]], 'data-tv': v.toFixed(1) + '%' + (j === best ? ' · 该领域最佳' : '') }, g);
          S('text', { x: lw + j * cw + cw / 2, y: 15, 'text-anchor': 'middle', class: 'rf', style: '--d:' + (j * 30) + 'ms;font-size:10.5px;pointer-events:none', fill: dark(v) ? '#fff' : '#2a303a' }, g, v.toFixed(1));
        });
        S('rect', { x: mx, y: 1, width: 52, height: rh - 2, rx: 3, fill: col(MEAN[r]), class: 'rf', style: '--d:' + (COLS.length * 30) + 'ms', tabindex: 0, 'data-tl': d + ' · 16 个智能体的平均', 'data-tv': MEAN[r].toFixed(2) + '%' }, g);
        S('text', { x: mx + 26, y: 15, 'text-anchor': 'middle', class: 'rf', style: '--d:' + (COLS.length * 30) + 'ms;font-size:11px;font-weight:700;pointer-events:none', fill: '#2a303a' }, g, MEAN[r].toFixed(1));
        rowsG[r] = g;
      });
      place();
      B.rise(s);
    });
  })();

  /* ================= Figure 6: from retrieval to report ================= */
  (function () {
    var host = document.getElementById('f6'); if (!host) return;
    var lg = document.getElementById('f6-legend');
    var BK = ['Qwen3.8 Max', 'GLM 5.2', 'MiniMax M3', 'DeepSeek V4 Flash', 'DeepSeek V4 Pro', 'Qwen3.7 Plus', 'Gemma 4 31B'];
    var BKC = ['#2b6cb0', '#8c6bb1', '#e15759', '#2f9e8f', '#76b7b2', '#d4a017', '#7f7f7f'];
    var RET = [ // Table 20: [breadth retrieval, report], [depth retrieval, report]; Table 21: retention all, 1, 2, 3 hop
      [[49.36, 44.35], [54.64, 50.16], [65.6, 88.1, 63.0, 45.8]],
      [[55.04, 45.65], [57.80, 46.40], [52.0, 84.1, 49.6, 30.1]],
      [[53.46, 42.77], [52.91, 45.68], [56.7, 79.0, 55.2, 35.4]],
      [[49.38, 44.39], [54.75, 44.20], [56.5, 89.8, 49.6, 32.8]],
      [[43.33, 34.85], [47.59, 43.99], [53.7, 74.7, 52.0, 34.0]],
      [[52.87, 33.75], [53.65, 37.69], [36.4, 66.3, 28.8, 16.0]],
      [[43.66, 30.04], [42.18, 34.18], [50.7, 66.5, 48.4, 22.9]]
    ];
    var ACT = [['检索次数', 12, 9, 0], ['打开页面次数', 34, 28, 0], ['不同页面数', 112, 43, 0], ['Token（千）', 302.9, 150.4, 1], ['报告词数', 2214, 1372, 0], null, ['广度（%）', 26.40, 45.42, 2], ['深度（%）', 32.28, 45.65, 2], ['总体（%）', 29.19, 45.54, 2]];
    var view = qv('f6', 3), api;
    seg(document.getElementById('f6-v'), ['调研活动与覆盖率', '检索 → 报告', '按跳数的保留率'], view, function (i) { view = i; api.redraw(); });
    api = mount(host, function (el, W) {
      var narrow = W < 560;
      if (view === 0) {
        legend(lg, [['GLM 5.2', '#8c6bb1'], ['DeepSeek V4 Flash', '#2b7bb9']]);
        var lw = narrow ? 92 : 120, H = 16 + 8 * 32 + 26 + 8, vw = W - lw - 56;
        var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'GLM 5.2 与 DeepSeek V4 Flash 在 Horn & Hardart 样例上的调研活动与覆盖率' }, el);
        var y = 4;
        ACT.forEach(function (r, i) {
          if (!r) { S('line', { x1: 0, x2: W, y1: y + 6, y2: y + 6, stroke: C.line, 'stroke-dasharray': '3 4' }, s); S('text', { x: 0, y: y + 22, class: 'lbl-b', style: 'font-size:11px;letter-spacing:.06em' }, s, '覆盖率'); y += 26; return; }
          if (i === 0) { S('text', { x: 0, y: y + 8, class: 'lbl-b', style: 'font-size:11px;letter-spacing:.06em' }, s, '调研活动'); y += 16; }
          var mx = Math.max(r[1], r[2]);
          S('text', { x: lw - 8, y: y + 15, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12.5px' }, s, r[0]);
          [[r[1], '#8c6bb1', 'GLM 5.2'], [r[2], '#2b7bb9', 'DeepSeek V4 Flash']].forEach(function (b, k) {
            var w = vw * b[0] / mx, yy = y + 3 + k * 13;
            S('rect', { x: lw, y: yy, width: w, height: 11, rx: 3, fill: b[1], class: 'rbx', style: '--d:' + (i * 70 + k * 40) + 'ms', 'data-tl': b[2], 'data-tc': b[1], 'data-tv': r[0] + ': ' + b[0].toLocaleString('en-US', { minimumFractionDigits: r[3], maximumFractionDigits: r[3] }) }, s);
            S('text', { x: lw + w + 5, y: yy + 9.5, class: 'val rf', style: '--d:' + (i * 70 + k * 40) + 'ms;font-size:11px' }, s, b[0].toLocaleString('en-US', { minimumFractionDigits: r[3], maximumFractionDigits: r[3] }));
          });
          y += 32;
        });
      } else if (view === 1) {
        legend(lg, [['检索材料中', '#fff;border:2px solid #6b7382;box-sizing:border-box'], ['最终报告中', C.ink]]);
        var cols = narrow ? 1 : 2, gap = 28, pw = (W - gap * (cols - 1)) / cols, lw2 = 118, rh = 28, ph = 7 * rh + 46, H2 = ph * (narrow ? 2 : 1) + (narrow ? 12 : 0);
        var s2 = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H2, width: W, height: H2, role: 'img', 'aria-label': '检索材料与最终报告的广度和深度' }, el);
        ['广度', '深度'].forEach(function (nm, p) {
          var ox = narrow ? 0 : p * (pw + gap), oy = narrow ? p * (ph + 12) : 0, X0 = 25, X1 = 60;
          function px(v) { return ox + lw2 + (v - X0) / (X1 - X0) * (pw - lw2 - 46); }
          S('text', { x: ox, y: oy + 13, class: 'lbl-b', style: 'font-size:13px' }, s2, nm + '（%）');
          [30, 40, 50, 60].forEach(function (g) { S('line', { x1: px(g), x2: px(g), y1: oy + 22, y2: oy + 22 + 7 * rh, class: 'grid' }, s2); S('text', { x: px(g), y: oy + 36 + 7 * rh, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:11px' }, s2, g); });
          BK.forEach(function (m, i) {
            var v = RET[i][p], y = oy + 22 + i * rh + rh / 2, r = v[1] / v[0] * 100;
            S('text', { x: ox + lw2 - 8, y: y + 4, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12px' }, s2, m);
            S('line', { x1: px(v[0]), x2: px(v[1]) + 6, y1: y, y2: y, stroke: '#9aa3ae', 'stroke-width': 2, class: 'rl', pathLength: 1, style: '--d:' + (300 + i * 60) + 'ms' }, s2);
            S('circle', { cx: px(v[0]), cy: y, r: 5.5, fill: '#fff', stroke: C.mute, 'stroke-width': 2, class: 'rf', style: '--d:' + (i * 60) + 'ms', 'data-tl': m + ' · 检索材料', 'data-tv': nm + ' ' + v[0].toFixed(2) }, s2);
            S('circle', { cx: px(v[1]), cy: y, r: 5.5, fill: C.ink, class: 'rf', style: '--d:' + (700 + i * 60) + 'ms', 'data-tl': m + ' · 最终报告', 'data-tv': nm + ' ' + v[1].toFixed(2) + '（' + r.toFixed(1) + '% 保留）' }, s2);
            S('text', { x: Math.max(px(v[0]), px(v[1])) + 12, y: y + 4, class: 'val rf', style: '--d:' + (900 + i * 60) + 'ms;font-size:11px', fill: r < 75 ? C.mis : C.mute }, s2, r.toFixed(1) + '%');
          });
        });
      } else {
        legend(lg, BK.map(function (m, i) { return [m, BKC[i]]; }).concat([['平均', C.ink]]));
        var H3 = narrow ? 280 : 320, ml = 40, mr = narrow ? 16 : 120, mt = 14, mb = 34;
        var s3 = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H3, width: W, height: H3, role: 'img', 'aria-label': '按跳数的知识保留率' }, el);
        function x3(i) { return ml + 20 + i * (W - ml - mr - 40) / 2; }
        function y3(v) { return mt + (1 - v / 100) * (H3 - mt - mb); }
        [0, 25, 50, 75, 100].forEach(function (g) { S('line', { x1: ml, x2: W - mr, y1: y3(g), y2: y3(g), class: 'grid' }, s3); S('text', { x: ml - 8, y: y3(g) + 4, 'text-anchor': 'end', class: 'lbl' }, s3, g + '%'); });
        ['第 1 跳', '第 2 跳', '第 3 跳'].forEach(function (h, i) { S('text', { x: x3(i), y: H3 - 10, 'text-anchor': 'middle', class: 'lbl-b' }, s3, h); });
        var mean = [0, 1, 2].map(function (i) { return RET.reduce(function (s, r) { return s + r[2][i + 1]; }, 0) / RET.length; });
        RET.forEach(function (r, i) {
          var v = r[2].slice(1), d = v.map(function (q, k) { return (k ? 'L' : 'M') + x3(k) + ' ' + y3(q); }).join('');
          S('path', { d: d, fill: 'none', stroke: BKC[i], 'stroke-width': 1.8, opacity: .85, class: 'rl', pathLength: 1, style: '--d:' + (i * 80) + 'ms' }, s3);
          v.forEach(function (q, k) { S('circle', { cx: x3(k), cy: y3(q), r: 4, fill: BKC[i], class: 'rf', style: '--d:' + (i * 80) + 'ms', tabindex: 0, 'data-tl': BK[i] + ' · 第 ' + (k + 1) + ' 跳', 'data-tc': BKC[i], 'data-tv': '保留 ' + q.toFixed(1) + '%（全部跳数：' + r[2][0].toFixed(1) + '%）' }, s3); });
        });
        S('path', { d: mean.map(function (q, k) { return (k ? 'L' : 'M') + x3(k) + ' ' + y3(q); }).join(''), fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round', class: 'rl', pathLength: 1, style: '--d:700ms' }, s3);
        mean.forEach(function (q, k) {
          var g = S('g', { class: 'rf', style: '--d:1100ms', transform: 'translate(' + (x3(k) + 12) + ' ' + y3(q) + ')' }, s3);
          S('rect', { x: 0, y: -10, width: 78, height: 20, rx: 5, fill: C.ink }, g);
          S('text', { x: 39, y: 4.5, 'text-anchor': 'middle', fill: '#fff', style: 'font-size:12px;font-weight:700' }, g, '平均 ' + q.toFixed(1) + '%');
        });
      }
      var sv = el.querySelector('svg'); B.rise(sv); B.replay(sv);
    });
  })();

  /* ================= Figure 7: validation ================= */
  (function () {
    var host = document.getElementById('f7'); if (!host) return;
    var lg = document.getElementById('f7-legend');
    var EXP = [['总体', [['广度与深度（最终指标）', .751, .833, 1], ['按层均衡覆盖', .615, .718], ['平铺覆盖', .508, .597]]],
      ['广度', [['最终广度', .696, .777, 1], ['去掉后代融合', .643, .714], ['分支覆盖', .533, .592]]],
      ['深度', [['最终深度', .727, .813, 1], ['去掉连续性折扣', .668, .761], ['路径内相邻对覆盖', .577, .664]]]];
    var JUD = [['Gemini 2.5 Pro', .893, .806], ['DeepSeek V4 Pro', .865, .630], ['Qwen 3.8 Max', .840, .718]];
    var SEN = [['α 下调（0.10）', 1.000, .979, '0 / 2'], ['α 上调（0.40）', 1.000, .976, '0 / 1'], ['η 下调（0.50）', 1.000, .997, '0 / 0'], ['η 上调（0.90）', 1.000, 1.000, '0 / 0'],
      ['ρ 下调（0.40）', 1.000, .994, '0 / 0'], ['ρ 上调（0.60）', 1.000, .985, '0 / 0'], ['β 下调（0.50）', 1.000, 1.000, '0 / 0'], ['β 上调（0.75）', .997, 1.000, '0 / 0']];
    var view = qv('f7', 3), api;
    seg(document.getElementById('f7-v'), ['专家', '评判模型', '参数'], view, function (i) { view = i; api.redraw(); });
    api = mount(host, function (el, W) {
      var narrow = W < 560;
      if (view === 0) {
        legend(lg, [['DRBench Pro 指标', C.dr], ['基线或消融', '#b5bcc6']]);
        var lw = narrow ? 150 : 200, rh = 24, H = 3 * (3 * rh + 30) + 6, vw = W - lw - 50, y = 0;
        var s = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '与专家评价的一致性' }, el);
        EXP.forEach(function (g, gi) {
          S('text', { x: 0, y: y + 16, class: 'lbl-b', style: 'font-size:13px' }, s, g[0]);
          y += 24;
          g[1].forEach(function (r, i) {
            var c = r[3] ? C.dr : '#b5bcc6', w = vw * r[1];
            S('text', { x: lw - 8, y: y + 13, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12px' + (r[3] ? ';font-weight:600' : '') }, s, r[0]);
            S('rect', { x: lw, y: y + 3, width: w, height: 14, rx: 3, fill: c, class: 'rbx', style: '--d:' + (gi * 160 + i * 60) + 'ms', 'data-tl': g[0] + ' · ' + r[0], 'data-tc': c, 'data-tv': 'Kendall τb ' + r[1].toFixed(3) + ' · Spearman ' + r[2].toFixed(3) }, s);
            S('text', { x: lw + w + 6, y: y + 14, class: (r[3] ? 'val-b' : 'val') + ' rf', style: '--d:' + (gi * 160 + i * 60) + 'ms' }, s, r[1].toFixed(3));
            y += rh;
          });
          y += 6;
        });
      } else if (view === 1) {
        legend(lg, [['二值（覆盖 / 未覆盖）', C.dr], ['三级', '#b5bcc6']]);
        var lw2 = narrow ? 112 : 140, rh2 = 50, H2 = JUD.length * rh2 + 26, vw2 = W - lw2 - 50;
        var s2 = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H2, width: W, height: H2, role: 'img', 'aria-label': '评判模型与人工标签的一致性' }, el);
        [0, .25, .5, .75, 1].forEach(function (g) { S('line', { x1: lw2 + vw2 * g, x2: lw2 + vw2 * g, y1: 0, y2: H2 - 22, class: 'grid' }, s2); S('text', { x: lw2 + vw2 * g, y: H2 - 6, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:11px' }, s2, g.toFixed(2)); });
        JUD.forEach(function (j, i) {
          var y = i * rh2 + 6;
          S('text', { x: lw2 - 8, y: y + 21, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12.5px' + (i ? '' : ';font-weight:600') }, s2, j[0]);
          [[j[1], C.dr, '二值'], [j[2], '#b5bcc6', '三级']].forEach(function (b, k) {
            var w = vw2 * b[0], yy = y + 4 + k * 17;
            S('rect', { x: lw2, y: yy, width: w, height: 14, rx: 3, fill: b[1], class: 'rbx', style: '--d:' + (i * 120 + k * 60) + 'ms', 'data-tl': j[0] + ' · ' + b[2], 'data-tc': b[1], 'data-tv': 'Macro-F1 ' + b[0].toFixed(3) }, s2);
            S('text', { x: lw2 + w + 6, y: yy + 11, class: (k ? 'val' : 'val-b') + ' rf', style: '--d:' + (i * 120 + k * 60) + 'ms' }, s2, b[0].toFixed(3));
          });
        });
      } else {
        legend(lg, [['广度排名', C.dr], ['深度排名', C.dep]]);
        var lw3 = narrow ? 96 : 120, rw = narrow ? 0 : 120, rh3 = 30, H3 = SEN.length * rh3 + 30, vw3 = W - lw3 - rw - 20, X0 = .97;
        function px(v) { return lw3 + (v - X0) / (1 - X0) * vw3; }
        var s3 = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H3, width: W, height: H3, role: 'img', 'aria-label': '指标参数变化下的排名稳定性' }, el);
        [.97, .98, .99, 1].forEach(function (g) { S('line', { x1: px(g), x2: px(g), y1: 0, y2: H3 - 22, class: 'grid' }, s3); S('text', { x: px(g), y: H3 - 6, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:11px' }, s3, g.toFixed(2)); });
        if (!narrow) S('text', { x: W - rw + 10, y: 10, class: 'lbl-b', style: 'font-size:11px' }, s3, '实质性反转');
        SEN.forEach(function (r, i) {
          var y = i * rh3 + 22;
          S('text', { x: lw3 - 10, y: y + 4, 'text-anchor': 'end', class: 'lbl', style: 'font-size:12.5px' }, s3, r[0]);
          S('line', { x1: px(Math.min(r[1], r[2])), x2: px(Math.max(r[1], r[2])), y1: y, y2: y, stroke: '#d3d8df', 'stroke-width': 2 }, s3);
          [[r[1], C.dr, '广度'], [r[2], C.dep, '深度']].forEach(function (p, k) {
            S('circle', { cx: px(p[0]), cy: y + (p[0] === r[1 + (1 - k)] ? (k ? 3 : -3) : 0), r: 6, fill: p[1], stroke: '#fff', 'stroke-width': 1.5, class: 'rf', style: '--d:' + (i * 70 + k * 40) + 'ms', tabindex: 0, 'data-tl': r[0] + ' · ' + p[2], 'data-tc': p[1], 'data-tv': 'Spearman ' + p[0].toFixed(3) }, s3);
          });
          if (!narrow) S('text', { x: W - rw + 10, y: y + 4, class: 'val rf', style: '--d:' + (i * 70) + 'ms;font-size:12px' }, s3, r[3] + '（广度 / 深度）');
        });
      }
      var sv = el.querySelector('svg'); B.rise(sv); B.replay(sv);
    });
  })();
})();
