"""Search / agent discoverability for zjureal.com.

Run from the repository root after editing publications.html:
    python3 tools/seo.py
It rewrites the <head> SEO block of publications.html (description, canonical, Open Graph, Twitter, JSON-LD with
every paper as a schema.org ScholarlyArticle), adds canonical + zjureal.com Open Graph URLs to the other pages,
and regenerates robots.txt, sitemap.xml and llms.txt (a Markdown digest for LLM agents).
"""
import datetime, html, json, re

SITE = 'https://zjureal.com'
TODAY = datetime.date.today().isoformat()
ORG = {
    '@type': 'ResearchOrganization', '@id': f'{SITE}/#lab', 'name': 'REAL Lab', 'alternateName': 'REAL Lab, Zhejiang University',
    'url': SITE + '/', 'logo': f'{SITE}/assets/real.png',
    'description': 'REAL Lab at Zhejiang University researches Reasoning, Embodied, Agentic, and Lifelong-learning AI: '
                   'AI that thinks, acts, and grows in the real world.',
    'parentOrganization': {'@type': 'CollegeOrUniversity', 'name': 'Zhejiang University', 'url': 'https://www.zju.edu.cn'},
    'address': {'@type': 'PostalAddress', 'addressLocality': 'Hangzhou', 'addressCountry': 'CN'},
    'founder': {'@type': 'Person', 'name': 'Yongliang Shen', 'url': 'https://person.zju.edu.cn/shenyongliang'},
    'sameAs': ['https://github.com/ZJU-REAL', 'https://huggingface.co/ZJU-REAL', 'https://x.com/zjureal',
               'https://scholar.google.com/citations?user=UT3NzFAAAAAJ',
               'https://www.xiaohongshu.com/user/profile/67d84bef000000000d008f18'],
    'knowsAbout': ['Large language model reasoning', 'Embodied AI', 'Spatial intelligence', 'Agentic AI', 'GUI agents',
                   'Computer-use agents', 'Deep research agents', 'Reinforcement learning', 'Self-evolving agents', 'Lifelong learning'],
}
PAGES = [('index.html', '', 1.0), ('about.html', 'about.html', .8), ('research.html', 'research.html', .9),
         ('publications.html', 'publications.html', .9), ('projects.html', 'projects.html', .8),
         ('people.html', 'people.html', .7), ('join.html', 'join.html', .7)]


def papers():
    s = open('publications.html').read()
    out = []
    for g in re.finditer(r'<div class="year">([^<]+)</div>(.*?)(?=<div class="year">|</section>)', s, re.S):
        year, block = re.search(r'\d{4}', g.group(1)).group(0), g.group(2)
        for m in re.finditer(r'<div class="pub[ "].*?(?=<div class="pub[ "]|$)', block, re.S):
            b = m.group(0)
            t = re.search(r'(?:<span class="title-text">|<div class="title">)([^<]+)<', b)
            if not t:
                continue
            a = re.search(r'<div class="authors">(.*?)</div>', b, re.S)
            v = re.search(r'<div class="venue">(.*?)</div>', b, re.S)
            thumb = re.search(r'<img class="thumb" src="([^"]+)"', b)
            links = {lab: url for url, lab in re.findall(r'<a href="([^"]+)"[^>]*>(arXiv|Code|Paper|Project|Dataset)</a>', b)}
            venue = re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', v.group(1)).replace('NEW', '').replace('ORAL', '')).strip(' ,') if v else ''
            out.append({'title': html.unescape(t.group(1)).strip(), 'year': year, 'venue': venue,
                        'authors': [html.unescape(x.strip()) for x in re.sub('<[^>]+>', '', a.group(1)).split(',')] if a else [],
                        'links': links, 'thumb': thumb.group(1) if thumb else None})
    return out


def jsonld(pubs):
    items = []
    for i, p in enumerate(pubs, 1):
        url = p['links'].get('arXiv') or p['links'].get('Paper') or p['links'].get('Project') or p['links'].get('Code')
        art = {'@type': 'ScholarlyArticle', 'headline': p['title'][:110], 'name': p['title'], 'datePublished': p['year'],
               'author': [{'@type': 'Person', 'name': n} for n in p['authors']], 'publisher': {'@id': f'{SITE}/#lab'}}
        if url:
            art['url'] = url
        same = [u for k, u in p['links'].items() if u != url and k in ('arXiv', 'Paper', 'Project')]
        if same:
            art['sameAs'] = same
        if 'Code' in p['links']:
            art['isBasedOn'] = {'@type': 'SoftwareSourceCode', 'codeRepository': p['links']['Code']}
        if p['venue'] and not p['venue'].lower().startswith(('arxiv', 'preprint')):
            art['isPartOf'] = {'@type': 'Periodical', 'name': p['venue']}
        if p['thumb']:
            art['image'] = f"{SITE}/{p['thumb']}"
        items.append({'@type': 'ListItem', 'position': i, 'item': art})
    data = {'@context': 'https://schema.org', '@graph': [
        ORG,
        {'@type': 'CollectionPage', '@id': f'{SITE}/publications.html', 'url': f'{SITE}/publications.html',
         'name': 'Publications · REAL Lab, Zhejiang University', 'isPartOf': {'@type': 'WebSite', 'url': SITE + '/', 'name': 'REAL Lab'},
         'about': {'@id': f'{SITE}/#lab'}, 'dateModified': TODAY,
         'mainEntity': {'@type': 'ItemList', 'numberOfItems': len(items), 'itemListElement': items}}]}
    return json.dumps(data, ensure_ascii=False, separators=(',', ':'))


def seo_head(page, title, desc, path, extra=''):
    url = f'{SITE}/{path}'
    return (f'<title>{html.escape(title)}</title>\n'
            f'<meta name="description" content="{html.escape(desc)}">\n'
            f'<link rel="canonical" href="{url}">\n'
            f'<meta name="robots" content="index, follow, max-image-preview:large">\n'
            f'<meta property="og:type" content="website">\n'
            f'<meta property="og:site_name" content="REAL Lab, Zhejiang University">\n'
            f'<meta property="og:title" content="{html.escape(title)}">\n'
            f'<meta property="og:description" content="{html.escape(desc)}">\n'
            f'<meta property="og:image" content="{SITE}/assets/real.png">\n'
            f'<meta property="og:url" content="{url}">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n'
            f'<meta name="twitter:site" content="@zjureal">\n' + extra)


def rewrite_head(page, block):
    s = open(page).read()
    s = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', s, flags=re.S)
    s = re.sub(r'<meta name="keywords"[^\n]*\n', '', s)
    start = s.index('<title>')
    end = s.index('<meta name="twitter:card" content="summary_large_image">')
    end = s.index('\n', end) + 1
    for extra in ('<meta name="twitter:site" content="@zjureal">\n',):
        if s[end:].startswith(extra):
            end += len(extra)
    s = s[:start] + block + s[end:]
    head_links = re.search(r'<link rel="icon"[^\n]*\n<link rel="apple-touch-icon"[^\n]*\n', s)
    if head_links and s.index(head_links.group(0)) > s.index('<title>'):
        s = s.replace(head_links.group(0), '', 1)
        s = s.replace('<title>', head_links.group(0) + '<title>', 1)
    open(page, 'w').write(s)


pubs = papers()
years = sorted({p['year'] for p in pubs})
venues = sorted({re.sub(r'\s*\(.*?\)|\s*(Findings|Demo|Workshop).*', '', p['venue']) for p in pubs
                 if p['venue'] and not p['venue'].lower().startswith(('arxiv', 'preprint', '20'))})
desc_pub = (f'{len(pubs)} papers from REAL Lab at Zhejiang University ({years[0]}–{years[-1]}) on LLM reasoning, embodied and spatial AI, '
            'agentic AI (GUI, computer-use, deep research and code agents) and lifelong, self-evolving learning, with arXiv, paper and code links.')
rewrite_head('publications.html', seo_head('publications.html', 'Publications · REAL Lab, Zhejiang University', desc_pub, 'publications.html',
             f'<meta name="keywords" content="REAL Lab, Zhejiang University, ZJU, Yongliang Shen, LLM reasoning, embodied AI, agentic AI, GUI agents, '
             f'reinforcement learning, self-evolving agents, {", ".join(venues[:12])}">\n'
             f'<script type="application/ld+json">{jsonld(pubs)}</script>\n'))

OTHER = {
    'index.html': ('REAL Lab · Zhejiang University', 'REAL Lab at Zhejiang University: Reasoning, Embodied, Agentic, and Lifelong-learning AI. '
                   'Toward AI that thinks, acts, and grows in the real world.', ''),
    'about.html': ('About · REAL Lab, Zhejiang University', 'REAL Lab at Zhejiang University builds AI that reasons reliably, explores the physical world, '
                   'acts autonomously, and learns continuously. News, research pillars and how to follow us.', 'about.html'),
    'research.html': ('Research · REAL Lab, Zhejiang University', 'Research directions of REAL Lab: long-horizon, efficient and verifiable reasoning; '
                      'spatial perception and world models; GUI, computer-use, deep research and code agents; skill internalization and self-distillation.',
                      'research.html'),
    'projects.html': ('Projects · REAL Lab, Zhejiang University', 'Open-source frameworks from REAL Lab at Zhejiang University, including HuggingGPT, '
                      'HugAgentOS, ClawGUI, Easel, EasySteer, Polaris and ageval.', 'projects.html'),
    'people.html': ('People · REAL Lab, Zhejiang University', 'Members of REAL Lab at Zhejiang University, led by Yongliang Shen.', 'people.html'),
    'join.html': ('Join Us · REAL Lab, Zhejiang University', 'Open PhD, master\'s and research intern positions at REAL Lab, Zhejiang University '
                  '(School of Artificial Intelligence, School of Software Technology, College of Computer Science and Technology).', 'join.html'),
}
for page, (title, desc, path) in OTHER.items():
    extra = f'<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", **ORG}, ensure_ascii=False, separators=(",", ":"))}</script>\n' \
        if page == 'index.html' else ''
    rewrite_head(page, seo_head(page, title, desc, path, extra))

open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'  <url><loc>{SITE}/{path}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>\n' for _, path, pr in PAGES) + '</urlset>\n')

lines = ['# REAL Lab, Zhejiang University', '',
         '> REAL Lab at Zhejiang University (Hangzhou, China), led by Yongliang Shen, researches Reasoning, Embodied, Agentic, and '
         'Lifelong-learning AI: toward AI that thinks, acts, and grows in the real world.', '',
         '## Research pillars', '',
         '- **Reasoning** (reasons reliably): long-horizon, efficient and verifiable reasoning.',
         '- **Embodied** (explores the physical world): spatial perception, self-evolving spatial intelligence, prediction and world models, embodied action.',
         '- **Agentic** (acts autonomously): GUI grounding, computer-use agents, deep research agents, code agents, creation agents, agent evaluation.',
         '- **Lifelong** (learns continuously): guided exploration, skill internalization, self-distillation, post-deployment steering, self-evolving systems.', '',
         '## Pages', '',
         f'- [Research]({SITE}/research.html): directions and representative work per pillar',
         f'- [Publications]({SITE}/publications.html): {len(pubs)} papers with arXiv, paper and code links',
         f'- [Projects]({SITE}/projects.html): open-source frameworks',
         f'- [People]({SITE}/people.html) and [Join Us]({SITE}/join.html)', '',
         '## Links', '',
         '- GitHub: https://github.com/ZJU-REAL', '- Hugging Face: https://huggingface.co/ZJU-REAL', '- X: https://x.com/zjureal',
         '- Google Scholar (PI): https://scholar.google.com/citations?user=UT3NzFAAAAAJ', '- PI homepage: https://person.zju.edu.cn/shenyongliang', '',
         '## Publications', '']
for y in sorted({p['year'] for p in pubs}, reverse=True):
    lines += [f'### {y}', '']
    for p in [q for q in pubs if q['year'] == y]:
        link = p['links'].get('arXiv') or p['links'].get('Paper') or p['links'].get('Project') or p['links'].get('Code') or f'{SITE}/publications.html'
        extra = f" · code: {p['links']['Code']}" if 'Code' in p['links'] and p['links']['Code'] != link else ''
        lines.append(f"- [{p['title']}]({link}). {', '.join(p['authors'])}. *{p['venue'] or y}*{extra}")
    lines.append('')
open('llms.txt', 'w').write('\n'.join(lines))
print(f'papers: {len(pubs)}  years: {years[0]}-{years[-1]}  venues: {len(venues)}')
