"""Check an ODT against the original FIPI HTML, independently of the generator.

Uses only Python's standard library. Input: {fragment, file}; output: audit counts.
"""
import copy, json, re, sys, zipfile
from html.parser import HTMLParser
from xml.etree import ElementTree as E

NS = {k: 'urn:oasis:names:tc:opendocument:xmlns:' + v for k, v in {
    'office': 'office:1.0', 'style': 'style:1.0', 'text': 'text:1.0',
    'table': 'table:1.0', 'fo': 'xsl-fo-compatible:1.0'}.items()}
def q(name):
    prefix, local = name.split(':'); return '{' + NS[prefix] + '}' + local
def compact(s): return re.sub(r'\s+', ' ', s.replace('\xad', '')).strip()

class Node:
    def __init__(self, tag, attrs=None): self.tag, self.attrs, self.children = tag, attrs or {}, []
    def nodes(self, tag):
        for child in self.children:
            if isinstance(child, Node):
                if child.tag == tag: yield child
                yield from child.nodes(tag)
    def text(self):
        return ''.join(c if isinstance(c, str) else '\n' if c.tag == 'br' else c.text() for c in self.children)

class Parser(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True); self.root = Node('root'); self.stack = [self.root]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs)); self.stack[-1].children.append(node)
        if tag not in {'br','img','input','hr','meta','link','wbr','area','source','col','embed'}: self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag: self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)

def source_chars(node, inherited=(False,False,False,'normal')):
    bold, italic, underline, position = inherited
    if node.tag in ('b','strong'): bold = True
    if node.tag in ('i','em'): italic = True
    if node.tag == 'u': underline = True
    if node.tag in ('sup','sub'): position = {'sup':'super','sub':'sub'}[node.tag]
    css = dict(re.findall(r'([\w-]+)\s*:\s*([^;]+)', node.attrs.get('style','').lower()))
    if 'font-weight' in css: bold = css['font-weight'].strip() in ('bold','700','800','900')
    if 'font-style' in css: italic = css['font-style'].strip() == 'italic'
    if 'text-decoration' in css: underline = 'underline' in css['text-decoration']
    fmt = (bold,italic,underline,position)
    for c in node.children:
        if isinstance(c,str):
            for char in c:
                if not char.isspace() and char != '\xad': yield (char,fmt)
        else: yield from source_chars(c,fmt)

def styles_of(root):
    return {s.get(q('style:name')): {k:v for child in s for k,v in child.attrib.items()}
            for s in root.findall('.//style:style', NS)}

def odt_chars(node, styles, inherited=None):
    props = dict(inherited or {})
    props.update(styles.get(node.get(q('text:style-name')),{}))
    if node.tag == q('text:span'):
        assert props.get(q('fo:font-size')) == '14pt', 'font size'
    position = props.get(q('style:text-position'),'0% 100%').split()[0]
    fmt = (props.get(q('fo:font-weight')) == 'bold', props.get(q('fo:font-style')) == 'italic',
           props.get(q('style:text-underline-style'),'none') != 'none',
           position if position in ('super','sub') else 'normal')
    for char in node.text or '':
        if not char.isspace(): yield (char,fmt)
    for child in node:
        yield from odt_chars(child,styles,props)
        for char in child.tail or '':
            if not char.isspace(): yield (char,fmt)

def odt_text(node):
    return (node.text or '') + ''.join(('\n' if c.tag==q('text:line-break') else odt_text(c))+(c.tail or '') for c in node)

def audit(fragment, content, settings):
    html = Parser(fragment).root
    cell = next(n for n in html.nodes('td') if 'cell_0' in n.attrs.get('class','').split())
    children = [c for c in cell.children if isinstance(c,Node)]
    end = next(i for i,n in enumerate(children) if 'Файл ответа' in n.text())
    instruction = compact(' '.join(n.text() for n in children[:end+1]))
    source = [n for n in children[end+1:] if compact(n.text()).strip('_')]
    assert all(n.tag in ('p','table') for n in source), 'unexpected sample block'
    assert '14 пункт' in instruction and '*.odt' in instruction
    props = styles_of(content); body = content.find('office:body/office:text', NS)
    assert body is not None and len(body)==len(source), 'block order or blank paragraph'
    assert not content.findall('.//office:scripts',NS), 'executable content'
    assert not content.findall('.//text:a',NS), 'unexpected external links'
    layout = settings.find('.//style:page-layout-properties',NS)
    cm = lambda v: float(v.removesuffix('cm'))
    width = cm(layout.get(q('fo:page-width'))) - cm(layout.get(q('fo:margin-left'))) - cm(layout.get(q('fo:margin-right')))
    paragraphs = cells = styled = 0; ordinary = 0; merges = []
    table_rows = table_columns = table_width = None
    def paragraph(src, dst, inside=False):
        nonlocal paragraphs, styled, ordinary
        assert dst.tag==q('text:p'), 'paragraph element'
        assert compact(odt_text(dst))==compact(src.text()), 'paragraph text or order'
        expected=list(source_chars(src)); actual=list(odt_chars(dst,props))
        assert actual==expected, 'character formatting'
        styled += sum(any(fmt[:3]) or fmt[3]!='normal' for _,fmt in expected); paragraphs+=1
        sp = props[dst.get(q('text:style-name'))]
        alignment = src.attrs.get('align') or ('left' if inside else 'justify')
        assert sp.get(q('fo:text-align'))==alignment, 'paragraph alignment'
        assert 100<=float(sp[q('fo:line-height')].removesuffix('%'))<=150, 'line spacing'
        assert sp[q('fo:margin-left')]==sp[q('fo:margin-right')]=='0cm'
        if inside:
            assert sp[q('fo:text-indent')]=='0cm' and sp[q('fo:margin-bottom')]=='0pt'
        else:
            assert not dst.findall('.//text:line-break',NS), 'prose must wrap naturally to paragraph width'
            centered=alignment=='center'
            if not centered: ordinary+=1
            all_indent='Отступ первой строки абзацев' in instruction or 'Абзацный отступ' in instruction
            two='первого и второго абзац' in instruction
            indent=not centered and (all_indent or ordinary==1 or two and ordinary==2)
            assert sp[q('fo:text-indent')]==('1cm' if indent else '0cm'), 'first line indent'
            assert 12<=float(sp[q('fo:margin-bottom')].removesuffix('pt'))<=24, 'paragraph spacing'
    for src,dst in zip(source,body):
        if src.tag=='p': paragraph(src,dst); continue
        assert dst.tag==q('table:table'), 'table order'
        tp=props[dst.get(q('table:style-name'))];table_width=cm(tp[q('style:width')])
        assert tp[q('table:align')]=='center', 'table alignment'
        if 'Ширина таблицы равна' in instruction: assert abs(table_width-width)<1e-5,'full table width'
        else: assert 0<table_width<width, 'narrow table width'
        assert 12<=float(tp[q('fo:margin-bottom')].removesuffix('pt'))<=24
        columns=dst.findall('table:table-column',NS)
        actual_width=sum(cm(props[c.get(q('table:style-name'))][q('style:column-width')]) for c in columns)
        assert abs(actual_width-table_width)<1e-4, 'column widths'
        rows=list(src.nodes('tr'));odt_rows=dst.findall('table:table-row',NS)
        table_rows,table_columns=len(rows),len(columns)
        assert len(rows)==len(odt_rows),'row count'
        occupied=set()
        for ri,(row,odt_row) in enumerate(zip(rows,odt_rows)):
            assert len(odt_row)==len(columns),'grid width'
            ci=0
            for sc in (c for c in row.children if isinstance(c,Node) and c.tag in ('td','th')):
                while (ri,ci) in occupied: ci+=1
                dc=odt_row[ci];assert dc.tag==q('table:table-cell'),'cell position'
                cs,rs=int(sc.attrs.get('colspan',1)),int(sc.attrs.get('rowspan',1))
                if cs>1 or rs>1:merges.append({'row':ri+1,'column':ci+1,'colspan':cs,'rowspan':rs})
                assert int(dc.get(q('table:number-columns-spanned'),1))==cs,'column merge'
                assert int(dc.get(q('table:number-rows-spanned'),1))==rs,'row merge'
                for rr in range(ri,ri+rs):
                    for cc in range(ci,ci+cs):
                        assert (rr,cc) not in occupied,'overlapping cell';occupied.add((rr,cc))
                        if (rr,cc)!=(ri,ci): assert odt_rows[rr][cc].tag==q('table:covered-table-cell'),'covered cell'
                cp=props[dc.get(q('table:style-name'))]
                assert cp[q('style:vertical-align')]=='middle','vertical alignment'
                assert cp[q('fo:border')]=='0.5pt solid #000000','table borders'
                ps=[p for p in sc.nodes('p') if compact(p.text())]
                assert len(dc)==len(ps),'cell paragraph count'
                for sp,dp in zip(ps,dc): paragraph(sp,dp,True)
                cells+=1;ci+=cs
    return {'paragraphs':paragraphs,'ordinaryParagraphs':ordinary,'cells':cells,'styledCharacters':styled,
            'tableRows':table_rows,'tableColumns':table_columns,'tableWidthCm':table_width,'merges':merges,'status':'ok'}

def main():
    data=json.load(sys.stdin)
    with zipfile.ZipFile(data['file']) as z:
        assert z.namelist()[0]=='mimetype' and z.getinfo('mimetype').compress_type==0
        assert z.read('mimetype')==b'application/vnd.oasis.opendocument.text'
        assert set(z.namelist())=={'mimetype','content.xml','styles.xml','META-INF/manifest.xml'}
        content=E.fromstring(z.read('content.xml'));settings=E.fromstring(z.read('styles.xml'))
    result=audit(data['fragment'],content,settings)
    # Negative cases exercise text preservation and the actual paragraph/style checks.
    rejected=0
    for mode in ('text','format','indent','spacing','merge'):
        bad=copy.deepcopy(content)
        if mode=='text': bad.find('.//text:span',NS).text='ИСПОРЧЕНО'
        elif mode=='format':
            target=bad.find('.//style:text-properties',NS);target.set(q('fo:font-size'),'12pt')
        elif mode in ('indent','spacing'):
            target=bad.find('.//style:paragraph-properties',NS)
            target.set(q('fo:text-indent') if mode=='indent' else q('fo:margin-bottom'),'3cm' if mode=='indent' else '0pt')
        else: bad.find('.//table:table-cell',NS).set(q('table:number-columns-spanned'),'99')
        try: audit(data['fragment'],bad,settings)
        except AssertionError: rejected+=1
        else: raise AssertionError('undetected document mutation: '+mode)
    print(json.dumps({**result,'rejectedEdits':rejected}))

if __name__=='__main__':main()
