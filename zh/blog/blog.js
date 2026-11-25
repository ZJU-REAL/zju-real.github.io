/* REAL Lab blog: shared behaviour (contents scrollspy, rise-on-view, tooltip, BibTeX copy).
   Exposes window.Blog for per-post figure scripts. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Rise when visible: adds .rise, toggles .in when ≥ 20% visible; replays on re-entry ---- */
  var rio = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) en.target.classList.remove('in');
      else if (en.intersectionRatio >= 0.2) en.target.classList.add('in');
    });
  }, { threshold: [0, 0.2] }) : null;
  function rise(el) {
    if (!el) return;
    el.classList.add('rise');
    if (reduce || !rio) { el.classList.add('in'); return; }
    rio.observe(el);
  }
  // Stagger: give each animated part a delay in order of appearance
  function stagger(root, sel, step) {
    Array.prototype.forEach.call(root.querySelectorAll(sel), function (n, i) { n.style.setProperty('--d', (i * (step || 40)) + 'ms'); });
  }
  // Replay a rise animation (used after a control changes the data)
  function replay(el) {
    if (reduce) return;
    el.classList.remove('in'); void el.getBoundingClientRect(); el.classList.add('in');
  }

  /* ---- One tooltip for every element with data-tv ---- */
  var tip = document.createElement('div');
  tip.className = 'btip'; tip.setAttribute('role', 'tooltip');
  tip.innerHTML = '<div class="tl"><i></i><span></span></div><div class="tv"></div><div class="tn"></div>';
  document.body.appendChild(tip);
  var tKey = tip.querySelector('.tl i'), tLab = tip.querySelector('.tl span'), tVal = tip.querySelector('.tv'), tNote = tip.querySelector('.tn');
  function fill(el) {
    tVal.textContent = el.getAttribute('data-tv');
    tLab.textContent = el.getAttribute('data-tl') || '';
    tKey.style.background = el.getAttribute('data-tc') || 'transparent';
    tKey.style.display = el.getAttribute('data-tc') ? '' : 'none';
    var n = el.getAttribute('data-tn') || ''; tNote.textContent = n; tNote.style.display = n ? '' : 'none';
  }
  function place(x, y) {
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - w - 8)) + 'px';
    tip.style.top = Math.max(8, (y + 16 + h > innerHeight - 8) ? y - h - 12 : y + 16) + 'px';
  }
  function hide() { tip.classList.remove('on'); }
  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest('[data-tv]');
    if (!el) { hide(); return; }
    fill(el); tip.classList.add('on'); place(e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', function (e) { if (tip.classList.contains('on')) place(e.clientX, e.clientY); });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tv]'); if (!el) return;
    var r = el.getBoundingClientRect(); fill(el); tip.classList.add('on'); place(r.left + r.width / 2, r.top);
  });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });

  /* ---- Contents scrollspy ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;
  function spy() {
    ticking = false;
    var y = innerHeight * 0.3, cur = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < y) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  if (links.length) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* ---- BibTeX copy ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.bibtex'), function (b) {
    var btn = b.querySelector('button'), pre = b.querySelector('pre');
    if (!btn || !pre) return;
    btn.addEventListener('click', function () {
      var done = function (t) { btn.textContent = t; setTimeout(function () { btn.textContent = '复制'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(function () { done('已复制'); }, function () { select(); });
      else select();
      function select() { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('已选中'); }
    });
  });

  /* ---- Author cards: hover (or tap) a lab member's name to see their People-page card ----
     Data is read from people.html and publications.html at runtime, so cards never go stale. */
  (function () {
    var list = document.querySelector('.post-authors[data-people]');
    if (!list || !window.fetch || !window.DOMParser) return;
    var aus = Array.prototype.slice.call(list.querySelectorAll('.au'));
    var peopleURL = new URL(list.getAttribute('data-people'), location.href);
    var pubsURL = list.getAttribute('data-pubs') ? new URL(list.getAttribute('data-pubs'), location.href) : null;
    var self = (list.getAttribute('data-self') || '').toLowerCase();
    var index = null, loading = null;
    var ZH = {"Aozhe Wang": "王傲哲", "Dingming Li": "李鼎鸣", "Fan Yuan": "袁凡", "Guanghu Chen": "陈光琥", "Haitao Hong": "洪海涛", "Hang Wu": "吴杭", "Hang Zhang": "张航", "Hangrui Zhang": "张航瑞", "Haolei Xu": "徐皓雷", "Haoyu Li": "﻿李浩宇", "Hongxing Li": "李弘幸", "Hui Wang": "王辉", "Jingyu He": "贺荆雨", "Jinyan Chen": "陈锦焱", "Kaiwen Zhang": "张锴文", "Luhao Zhu": "朱路浩", "Nan Zhou": "周楠", "Qipeng Chen": "陈其鹏", "Shangke Lyu": "吕尚可", "Siqi Chen": "陈斯琪", "Teng Pan": "潘腾", "Tongbo Chen": "陈通博", "Wenjing Jiang": "蒋文婧", "Xingyu Wu": "吴星宇", "Xinyu Dong": "董欣谕", "Xudong Cai": "蔡旭东", "Xuejun Zhao": "赵雪君", "Yan Yu": "俞燕", "Yaxin Zhang": "张雅馨", "Yijun Li": "李奕君", "Yiwen Qiu": "邱怡文", "Yizhou Liu": "刘逸舟", "Yong Du": "杜庸", "Yuchen Yan": "颜聿辰", "Yuhan Wang": "王裕涵", "Zhengxi Lu": "卢政希", "Zixuan Wang": "王子轩", "Shuo Yuan": "袁烁"};
    var norm = function (s) { return (s || '').replace(/\s*·.*$/, '').replace(/\s+/g, ' ').trim().toLowerCase(); };

    function load() {
      if (loading) return loading;
      var get = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw r.status; return r.text(); }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); }); };
      loading = Promise.all([get(peopleURL), pubsURL ? get(pubsURL).catch(function () { return null; }) : null]).then(function (docs) {
        var ppl = docs[0], pubs = docs[1], idx = {};
        function linksOf(el) {
          return Array.prototype.map.call(el.querySelectorAll('.person-links a'), function (a) {
            var lab = (a.getAttribute('aria-label') || a.title || 'Link').replace(' (Twitter)', '');
            var svg = a.querySelector('svg'); return { href: a.href, label: lab, svg: svg ? svg.outerHTML : '' };
          });
        }
        var pi = ppl.querySelector('.pi-card');
        if (pi) {
          var full = pi.querySelector('.name').textContent.trim();
          idx[norm(full)] = { name: full.split('·')[0].trim(), zh: (full.split('·')[1] || '').trim(), role: '课题组负责人 · 博士生导师',
            img: new URL(pi.querySelector('img').getAttribute('src'), peopleURL).href, links: linksOf(pi), pi: true };
        }
        Array.prototype.forEach.call(ppl.querySelectorAll('.people-group'), function (g) {
          var groupEl = g.querySelector('.role'), group = groupEl ? groupEl.textContent.trim() : '';
          var single = group.replace(/Students$/, 'student').replace(/Engineers$/, 'engineer').replace(/Interns$/, 'intern').replace(/s$/, '');
          Array.prototype.forEach.call(g.querySelectorAll('.person'), function (p) {
            var n = p.querySelector('.name'), img = p.querySelector('img'), sub = p.querySelector('.sub');
            if (!n) return;
            var subT = sub ? sub.textContent.trim() : '', yr = (subT.match(/\b(20\d\d)\b/) || [])[1];
            var dg = (subT.match(/^(PhD|MSc|BSc|Undergrad)/) || [])[1];
            var role = dg && yr ? ({ PhD: '博士生', MSc: '硕士生', BSc: '本科生', Undergrad: '本科生' })[dg] + ' · ' + yr + ' 级' : (/^Research Engineer/.test(subT) ? '研究工程师' : (subT || single));
            var home = n.querySelector('a');
            idx[norm(n.textContent)] = { name: n.textContent.trim(), zh: ZH[n.textContent.trim()] || '', role: role, img: img ? new URL(img.getAttribute('src'), peopleURL).href : '',
              links: linksOf(p), home: home ? home.href : '' };
          });
        });
        if (pubs) {
          var entries = Array.prototype.map.call(pubs.querySelectorAll('main .pub'), function (e) {
            var t = e.querySelector('.title-text') || e.querySelector('.title'), au = e.querySelector('.authors'), v = e.querySelector('.venue');
            var link = e.querySelector('.links a[href*="arxiv"]') || e.querySelector('.links a');
            return { title: t ? t.textContent.trim() : '', authors: au ? au.textContent : '', venue: v ? v.textContent.replace('NEW', '').trim() : '', href: link ? link.href : '' };
          });
          Object.keys(idx).forEach(function (k) {
            var mine = entries.filter(function (e) { return e.authors.toLowerCase().indexOf(idx[k].name.toLowerCase()) !== -1; });
            idx[k].count = mine.length;
            idx[k].latest = mine.filter(function (e) { return !self || e.title.toLowerCase().indexOf(self) !== 0; })[0] || null;
          });
        }
        index = idx;
        aus.forEach(function (a) {
          if (index[norm(a.textContent)]) { a.classList.add('has-card'); a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button'); a.setAttribute('aria-haspopup', 'dialog'); }
        });
        return idx;
      }).catch(function () { index = {}; return index; });
      return loading;
    }

    var card = document.createElement('div');
    card.className = 'pcard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', '作者信息');
    document.body.appendChild(card);
    var showT = 0, hideT = 0, cur = null;
    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function render(p) {
      var links = p.links.map(function (l) { return '<a class="pc-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + l.svg + '<span>' + esc(l.label) + '</span></a>'; }).join('');
      var pubs = '';
      if (p.count) {
        pubs = '<div class="pc-pubs"><p class="pc-count">在 REAL Lab 发表论文 <b>' + p.count + '</b> 篇</p>' +
          (p.latest ? '<a class="pc-latest" href="' + esc(p.latest.href) + '" target="_blank" rel="noopener"><span class="pc-lk">最新</span>' + esc(p.latest.title) +
            (p.latest.venue ? '<em>' + esc(p.latest.venue) + '</em>' : '') + '</a>' : '') + '</div>';
      }
      var nameHTML = p.home ? '<a href="' + esc(p.home) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a>' : esc(p.name);
      card.innerHTML = '<div class="pc-strip"></div>' +
        '<div class="pc-head"><img src="' + esc(p.img) + '" alt="" width="64" height="64"><div><p class="pc-name">' + nameHTML + (p.zh ? '<span class="pc-zh">' + esc(p.zh) + '</span>' : '') + '</p>' +
        '<p class="pc-role">' + esc(p.role) + '</p><p class="pc-lab"><span class="pc-dot"></span>浙江大学 REAL Lab</p></div></div>' + pubs +
        '<div class="pc-foot"><div class="pc-links">' + links + '</div><a class="pc-people" href="../../people.html">成员 →</a></div>';
    }
    function place(a) {
      var r = a.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
      var x = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
      var below = r.bottom + 12 + h < innerHeight - 8 || r.top - h - 12 < 8;
      card.classList.toggle('up', !below);
      card.style.left = x + 'px';
      card.style.top = (below ? r.bottom + 10 : r.top - h - 10) + 'px';
      card.style.setProperty('--ax', Math.max(18, Math.min(w - 18, r.left + r.width / 2 - x)) + 'px');
    }
    function open(a) {
      clearTimeout(hideT);
      load().then(function () {
        var p = index && index[norm(a.textContent)]; if (!p) return;
        if (cur !== a) { render(p); cur = a; }
        card.classList.add('on'); place(a);
        aus.forEach(function (x) { x.setAttribute('aria-expanded', x === a ? 'true' : 'false'); });
      });
    }
    function close() { card.classList.remove('on'); if (cur) cur.setAttribute('aria-expanded', 'false'); cur = null; }
    function later() { clearTimeout(showT); clearTimeout(hideT); hideT = setTimeout(close, 220); }
    aus.forEach(function (a) {
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch') return; clearTimeout(hideT); clearTimeout(showT); showT = setTimeout(function () { open(a); }, 140); });
      a.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; later(); });
      a.addEventListener('focus', function () { open(a); });
      a.addEventListener('blur', function () { later(); });
      a.addEventListener('click', function (e) { if (!a.classList.contains('has-card')) return; e.preventDefault(); if (cur === a && card.classList.contains('on')) close(); else open(a); });
      a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(a); } });
    });
    card.addEventListener('pointerenter', function () { clearTimeout(hideT); });
    card.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') later(); });
    card.addEventListener('focusin', function () { clearTimeout(hideT); });
    card.addEventListener('focusout', function () { later(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card.classList.contains('on')) { var a = cur; close(); if (a) a.focus(); } });
    document.addEventListener('pointerdown', function (e) { if (card.classList.contains('on') && !card.contains(e.target) && !e.target.closest('.au')) close(); });
    window.addEventListener('scroll', function () { if (cur && card.classList.contains('on')) place(cur); }, { passive: true });
    // Load quietly once the page has settled, so member names are marked before anyone hovers
    (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(function () { load(); });
  })();

  /* ---- Small SVG helper for figure scripts ---- */
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  window.Blog = { reduce: reduce, rise: rise, stagger: stagger, replay: replay, svg: svg };
})();
