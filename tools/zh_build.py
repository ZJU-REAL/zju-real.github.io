"""Build the Chinese site under zh/ from the English pages.

English stays the source of truth. Each page is parsed, its translatable blocks are swapped for the Chinese
versions in tools/i18n/zh/*.json (keyed by the English inner HTML of the block), short repeated labels are mapped by
the rules in tools/i18n/zh/rules.json, asset URLs are pointed back at the shared files, and the page gets
lang="zh-CN", hreflang links and a language switch. The English pages get the matching switch.

    python3 tools/zh_build.py           # build zh/ and report blocks that still have no translation
    python3 tools/zh_build.py --check   # report only, write nothing

Paper titles, authors and venues on publications.html stay in English on purpose.
"""
import json, os, posixpath, re, sys
from bs4 import BeautifulSoup, NavigableString, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, 'tools', 'i18n', 'zh')
SITE = 'https://zjureal.com/'
MAIN = ['index.html', 'about.html', 'research.html', 'projects.html', 'blog.html', 'publications.html', 'people.html', 'join.html']
POSTS = sorted(d for d in os.listdir(os.path.join(ROOT, 'blog')) if os.path.isfile(os.path.join(ROOT, 'blog', d, 'index.html')))
PAGES = MAIN + [f'blog/{d}/index.html' for d in POSTS]

INLINE = {'a', 'em', 'strong', 'b', 'i', 'span', 'code', 'br', 'sup', 'sub', 'small', 'abbr', 'time', 'mark', 'u', 's', 'kbd', 'img', 'svg', 'wbr'}
SKIP = {'script', 'style', 'noscript', 'svg', 'template', 'head'}
ATTRS = ('placeholder', 'aria-label', 'alt', 'title')
URL_ATTRS = ('src', 'href', 'poster', 'srcset', 'data-src', 'content')


def norm(h):
    return re.sub(r'\s+', ' ', h).strip()


def load_dict():
    d = {}
    for f in sorted(os.listdir(I18N)):
        if f.endswith('.json') and f != 'rules.json':
            d.update(json.load(open(os.path.join(I18N, f))))
    return d


RULES = json.load(open(os.path.join(I18N, 'rules.json')))
BLOG_TITLES = {h.get_text(' ', strip=True) for h in BeautifulSoup(open(os.path.join(ROOT, 'blog.html')).read(), 'html.parser').select('.bcard h3')}
DICT = load_dict()


# ---------- which blocks are translatable (same walk as the extractor) ----------
def has_text(el):
    return any(re.search(r'[A-Za-z]', t) for t in el.find_all(string=True)
               if not isinstance(t, Comment) and t.parent.name not in SKIP)


def inline_only(el):
    return all(isinstance(c, NavigableString) or c.name in INLINE for c in el.children)


def keep_en(el):
    cls = ' '.join(el.get('class', []))
    return el.find_parent(class_='pub') is not None and any(k in cls for k in ('title', 'authors', 'venue'))


def blocks(root):
    """Yield (element, english_inner_html) for each translatable block, outermost first."""
    for c in list(root.children):
        if isinstance(c, NavigableString) or c.name in SKIP:
            continue
        if not has_text(c):
            continue
        lone_inline = c.name in INLINE and inline_only(c) and not any(
            isinstance(x, NavigableString) and x.strip() for x in root.children if x is not c)
        if (inline_only(c) and c.name not in INLINE) or lone_inline:
            if not keep_en(c):
                yield c, norm(c.decode_contents())
            continue
        yield from blocks(c)


def set_inner(el, html):
    el.clear()
    frag = BeautifulSoup(html, 'html.parser')
    for node in list(frag.contents):
        el.append(node)


# ---------- rules: short labels, names, dates ----------
MONTHS = {m: i + 1 for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                         'September', 'October', 'November', 'December'])}


def map_text(s):
    """Regex rules for dates and reading time inside any remaining text node."""
    s2 = re.sub(r'\b(' + '|'.join(MONTHS) + r') (\d{1,2}), (\d{4})\b', lambda m: f'{m.group(3)} 年 {MONTHS[m.group(1)]} 月 {m.group(2)} 日', s)
    s2 = re.sub(r'\b(\d+) min read\b', r'阅读约 \1 分钟', s2)
    return s2


def apply_rules(soup):
    for rule in RULES['text']:
        for el in soup.select(rule['sel']):
            for t in el.find_all(string=True):
                key = t.strip()
                if key in rule['map']:
                    t.replace_with(t.replace(key, rule['map'][key]))
    names = RULES['names']
    for el in soup.select(', '.join(RULES['name_sel'])):
        for t in el.find_all(string=True):
            k = t.strip()
            if k in names:
                t.replace_with(t.replace(k, names[k]))
    for el in soup.select('img[alt]'):
        if el['alt'] in names and el.find_parent(class_=('person', 'pi-card')):
            el['alt'] = names[el['alt']]
    for el in soup.select(', '.join(RULES['date_sel'])):
        for t in el.find_all(string=True):
            n = map_text(str(t))
            if n != str(t):
                t.replace_with(n)


# ---------- URLs ----------
def zh_exists(target):
    """target: root-relative path (no leading slash). True if the Chinese site has this page."""
    t = target.split('#')[0].split('?')[0]
    if t in ('', 'index.html') or t in MAIN:
        return True
    if t.startswith('blog/'):
        parts = t.split('/')
        if len(parts) >= 2 and parts[1] in POSTS and (len(parts) == 2 or parts[2] in ('', 'index.html')):
            return True
    return False


def rewrite_url(url, page, own_js):
    """Rewrite a relative URL found in the English page `page` for its copy at zh/`page`."""
    if not url or re.match(r'^([a-z]+:|//|#|data:|mailto:|javascript:)', url, re.I):
        return url
    path = re.split(r'[?#]', url, maxsplit=1)[0]
    suffix = url[len(path):]
    base = posixpath.dirname(page)
    target = posixpath.normpath(posixpath.join(base, path)) if path else page
    if target in own_js or zh_exists(target):
        return url                                  # the zh/ copy sits at the same relative spot
    rel = posixpath.relpath(target, posixpath.join('zh', base) if base else 'zh')
    if path.endswith('/') and not rel.endswith('/'):
        rel += '/'
    return rel + suffix


def zh_scripts():
    """Root-relative paths of every script that has a Chinese copy under zh/."""
    out = set()
    for d, _, files in os.walk(os.path.join(ROOT, 'zh')):
        for f in files:
            if f.endswith('.js'):
                out.add(posixpath.relpath(os.path.join(d, f), os.path.join(ROOT, 'zh')).replace(os.sep, '/'))
    return out


def build_js():
    """Write zh/<path> for each standalone script in rules['js'], applying exact replacements (all must match)."""
    for path, reps in RULES['js'].items():
        s = open(os.path.join(ROOT, path)).read()
        for en, zh in reps:
            if en not in s:
                raise SystemExit(f'{path}: English snippet not found, update rules.json: {en[:80]}')
            s = s.replace(en, zh)
        out = os.path.join(ROOT, 'zh', path)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w').write(s)


def rewrite_urls(soup, page):
    own_js = zh_scripts()
    base = posixpath.dirname(page)
    for el in soup.find_all(True):
        for a in RULES.get('en_attrs', []):
            v = el.get(a)
            if v and not re.match(r'^([a-z]+:|//)', v):
                target = posixpath.normpath(posixpath.join(base, v))
                el[a] = posixpath.relpath(target, posixpath.join('zh', base) if base else 'zh')
        for a in URL_ATTRS:
            v = el.get(a)
            if not v or a == 'content':
                continue
            if a == 'srcset':
                el[a] = ', '.join(' '.join([rewrite_url(p.split()[0], page, own_js)] + p.split()[1:]) for p in v.split(','))
            else:
                el[a] = rewrite_url(v, page, own_js)
        st = el.get('style')
        if st and 'url(' in st:
            el['style'] = re.sub(r"url\((['\"]?)([^'\")]+)\1\)", lambda m: f"url({m.group(1)}{rewrite_url(m.group(2), page, own_js)}{m.group(1)})", st)


# ---------- page chrome ----------
def zh_url(page):
    return SITE + 'zh/' + (page[:-len('index.html')] if page.endswith('index.html') and page != 'index.html' else ('' if page == 'index.html' else page))


def en_url(page):
    return SITE + (page[:-len('index.html')] if page.endswith('index.html') and page != 'index.html' else ('' if page == 'index.html' else page))


def add_alternates(soup, page, canonical):
    head = soup.head
    for l in head.select('link[rel=alternate][hreflang]'):
        l.decompose()
    can = head.select_one('link[rel=canonical]')
    if can is not None:
        can['href'] = canonical
    og = head.select_one('meta[property="og:url"]')
    if og is not None:
        og['content'] = canonical
    anchor = can or head.title
    for lang, url in (('en', en_url(page)), ('zh-CN', zh_url(page)), ('x-default', en_url(page))):
        l = soup.new_tag('link', rel='alternate', hreflang=lang, href=url)
        anchor.insert_after(l)
        anchor = l


def add_switch(soup, page, to_zh):
    ul = soup.select_one('nav.topbar ul')
    if ul is None:
        return
    for li in ul.select('li.lang-switch'):
        li.decompose()
    depth = page.count('/')
    if to_zh:   # English page -> Chinese copy
        href = '../' * depth + 'zh/' + page
        label, lang, title = '中文', 'zh-CN', '切换到中文'
    else:       # Chinese page -> English original
        href = '../' * (depth + 1) + page
        label, lang, title = 'EN', 'en', 'English'
    href = re.sub(r'index\.html$', '', href) if page != 'index.html' else href
    li = soup.new_tag('li', attrs={'class': 'lang-switch'})
    a = soup.new_tag('a', href=href, hreflang=lang, lang=lang, title=title)
    a.string = label
    li.append(a)
    ul.append(li)


def translate_scripts(soup, page):
    for en, zh in RULES['scripts'].get(page, []) + RULES['scripts'].get('*', []):
        hit = False
        for s in soup.find_all('script'):
            if s.string and en in s.string:
                s.string.replace_with(s.string.replace(en, zh))
                hit = True
        if not hit:
            raise SystemExit(f'{page}: script snippet not found, update rules.json: {en[:80]}')


# ---------- build ----------
def english_on_purpose(el, txt):
    """Blocks that stay English by design: paper titles, work names, references, BibTeX, code, logo strips."""
    if el.name in ('pre', 'code') or el.find(class_=('px-row', 'pm-item')) is not None or el.find('a', class_='work') is not None:
        return True
    if el.find('code') is not None:
        return True
    if txt in BLOG_TITLES:      # posts keep their English paper titles
        return True
    return bool(re.match(r'^[A-Z][A-Za-z\-]+ (et al\.|and [A-Z])', txt))   # reference list entries

def build_page(page, write=True):
    src = open(os.path.join(ROOT, page)).read()
    soup = BeautifulSoup(src, 'html.parser')
    missing = []
    # title + meta
    if soup.title and soup.title.string:
        k = norm(soup.title.decode_contents())
        if k in DICT:
            soup.title.string = DICT[k]
        else:
            missing.append(('title', k))
    for m in soup.select('meta[name=description], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]'):
        k = norm(m.get('content', ''))
        if k in DICT:
            m['content'] = DICT[k]
        elif k and any(re.match(pat, k) for pat, _ in RULES.get('meta_regex', [])):
            pat, rep = next((p, r) for p, r in RULES['meta_regex'] if re.match(p, k))
            m['content'] = re.sub(pat, rep, k)
        elif k and k not in BLOG_TITLES:
            missing.append(('meta', k))
    # blocks first (their keys include the English attribute values), then attributes
    for el, k in list(blocks(soup.body)):
        if k in DICT:
            set_inner(el, DICT[k])
    # fallback: any element whose exact English content has a translation (blog cards, post headings),
    # except inside publication entries, whose titles stay English even when a post shares the title
    for el in soup.body.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'figcaption', 'td', 'th', 'span', 'a', 'button', 'div', 'label', 'summary']):
        if el.find_parent(class_='pub') is not None or 'pub' in el.get('class', []) or el.find_parent('nav') is not None:
            continue
        k = norm(el.decode_contents())
        if k in DICT and re.search(r'[A-Za-z]', k):
            set_inner(el, DICT[k])
    for el in soup.find_all(True):
        for a in ATTRS:
            v = el.get(a)
            if v and re.search(r'[A-Za-z]', v):
                k = norm(v)
                if k in DICT:
                    el[a] = DICT[k]
    apply_rules(soup)
    # what is left in English (for the report): blocks whose text still has 3+ consecutive latin words
    for el, k in blocks(soup.body):
        txt = el.get_text(' ', strip=True)
        if re.search(r'[A-Za-z]{2,}\s+[A-Za-z]{2,}\s+[A-Za-z]{2,}', txt) and not re.search(r'[一-鿿]', txt) and not english_on_purpose(el, txt):
            missing.append((el.name, k))
    translate_scripts(soup, page)
    for s in soup.select('script[type="application/ld+json"], meta[name=keywords]'):
        s.decompose()
    soup.html['lang'] = 'zh-CN'
    add_alternates(soup, page, zh_url(page))
    for img in soup.find_all('img', src=True):
        for en, zh in RULES.get('img_map', {}).items():
            if en in img['src']:
                img['src'] = img['src'].replace(en, zh)
    rewrite_urls(soup, page)
    add_switch(soup, page, to_zh=False)     # after the rewrite: its href already points out of zh/
    if write:
        out = os.path.join(ROOT, 'zh', page)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w').write(str(soup))
    return missing


def sync_english(page):
    """Add the 中文 switch and hreflang links to the English page, editing only those lines."""
    path = os.path.join(ROOT, page)
    src = open(path).read()
    depth = page.count('/')
    href = '../' * depth + 'zh/' + (re.sub(r'index\.html$', '', page) if page != 'index.html' else page)
    li = f'      <li class="lang-switch"><a href="{href}" hreflang="zh-CN" lang="zh-CN" title="切换到中文">中文</a></li>\n'
    src = re.sub(r'\s*<li class="lang-switch">.*?</li>\n', '\n', src)
    src = re.sub(r'(<nav class="topbar">.*?)(\n\s*</ul>)', lambda m: m.group(1) + '\n' + li.rstrip('\n') + m.group(2), src, count=1, flags=re.S)
    src = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">\n', '', src)
    alts = ''.join(f'<link rel="alternate" hreflang="{l}" href="{u}">\n' for l, u in (('en', en_url(page)), ('zh-CN', zh_url(page)), ('x-default', en_url(page))))
    src = re.sub(r'(<link rel="canonical" href="[^"]+">\n)', lambda m: m.group(1) + alts, src, count=1)
    open(path, 'w').write(src)


if __name__ == '__main__':
    check = '--check' in sys.argv
    if not check:
        build_js()
    total = 0
    for p in PAGES:
        miss = build_page(p, write=not check)
        if not check:
            sync_english(p)
        total += len(miss)
        print(f'{p:32s} untranslated: {len(miss)}')
        for kind, k in miss[:400]:
            print(f'    [{kind}] {re.sub(r"<svg.*?</svg>", "<svg/>", k)[:160]}')
    print('total untranslated blocks:', total)
