/* Blog index: search, topic filters, sort, and "View more" paging (10 posts at a time). */
(function () {
  'use strict';
  var PAGE = 10;
  var list = document.querySelector('.blog-list'); if (!list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('.bcard'));
  var input = document.getElementById('blog-q'), clear = document.getElementById('blog-q-clear');
  var toggle = document.getElementById('blog-filter-btn'), panel = document.getElementById('blog-filters');
  var topicsEl = document.getElementById('blog-topics'), sortEl = document.getElementById('blog-sort');
  var count = document.getElementById('blog-count'), more = document.getElementById('blog-more'), empty = document.getElementById('blog-empty');

  var posts = cards.map(function (c, i) {
    var tag = (c.querySelector('.bcard-meta .tag') || {}).textContent || '';
    var dateText = (c.querySelector('.bcard-meta .tag + span') || {}).textContent || '';
    var t = Date.parse(dateText);
    return { el: c, i: i, tag: tag.trim(), time: isNaN(t) ? 0 : t,
      text: (c.textContent || '').replace(/\s+/g, ' ').toLowerCase() };
  });

  // Topic chips, in order of first appearance
  var topics = [];
  posts.forEach(function (p) { if (p.tag && topics.indexOf(p.tag) === -1) topics.push(p.tag); });
  var active = [];
  topics.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'bf-chip'; b.textContent = t; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var k = active.indexOf(t);
      if (k === -1) active.push(t); else active.splice(k, 1);
      b.setAttribute('aria-pressed', k === -1 ? 'true' : 'false');
      shown = PAGE; apply();
    });
    topicsEl.appendChild(b);
  });

  var params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  if (params.get('topic')) params.get('topic').split(',').forEach(function (t) {
    var b = Array.prototype.find.call(topicsEl.children, function (x) { return x.textContent === t; });
    if (b) { active.push(t); b.setAttribute('aria-pressed', 'true'); }
  });
  if (active.length) { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }

  var shown = PAGE;
  function apply() {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var match = posts.filter(function (p) {
      if (active.length && active.indexOf(p.tag) === -1) return false;
      return terms.every(function (w) { return p.text.indexOf(w) !== -1; });
    });
    var dir = sortEl.value === 'oldest' ? 1 : -1;
    match.sort(function (a, b) { return dir * (a.time - b.time) || a.i - b.i; });
    posts.forEach(function (p) { p.el.hidden = true; });
    match.forEach(function (p, k) { list.appendChild(p.el); p.el.hidden = k >= shown; });
    var filtered = terms.length || active.length;
    count.textContent = filtered ? '共 ' + match.length + ' 篇' : '';
    empty.hidden = match.length > 0;
    more.hidden = match.length <= shown;
    more.textContent = '查看更多（' + (match.length - Math.min(shown, match.length)) + '）';
    clear.hidden = !input.value;
    toggle.classList.toggle('on', active.length > 0 || sortEl.value !== 'newest');
    var q = new URLSearchParams();
    if (input.value) q.set('q', input.value);
    if (active.length) q.set('topic', active.join(','));
    var url = location.pathname + (q.toString() ? '?' + q.toString() : '');
    try { history.replaceState(null, '', url); } catch (e) {}
  }

  input.addEventListener('input', function () { shown = PAGE; apply(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; shown = PAGE; apply(); } });
  clear.addEventListener('click', function () { input.value = ''; input.focus(); shown = PAGE; apply(); });
  sortEl.addEventListener('change', function () { shown = PAGE; apply(); });
  toggle.addEventListener('click', function () {
    var open = panel.hidden; panel.hidden = !open; toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.getElementById('blog-reset').addEventListener('click', function () {
    input.value = ''; active = []; sortEl.value = 'newest';
    Array.prototype.forEach.call(topicsEl.children, function (b) { b.setAttribute('aria-pressed', 'false'); });
    shown = PAGE; apply();
  });
  more.addEventListener('click', function () {
    var first = shown; shown += PAGE; apply();
    var next = posts.filter(function (p) { return !p.el.hidden; })[first];
    if (next) next.el.focus({ preventScroll: true });
  });
  apply();
})();
