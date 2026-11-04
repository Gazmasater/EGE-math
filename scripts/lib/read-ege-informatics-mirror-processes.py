import xml.etree.ElementTree as E,zipfile,io,json,sys,re
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('x','text')]};T='{'+NS['t']+'}';O='{'+NS['o']+'}'
def read(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:root=E.fromstring(z.read('content.xml'))
    tables=root.findall('.//t:table',NS);assert len(tables)==1;rows=[]
    for rownum,row in enumerate(tables[0].findall('t:table-row',NS),1):
        vals=[];formulas=[]
        for cell in row:
            if cell.tag not in [T+'table-cell',T+'covered-table-cell']:continue
            s=' '.join(''.join(p.itertext()) for p in cell.findall('x:p',NS)).strip();repeat=int(cell.get(T+'number-columns-repeated','1'))
            if not s and repeat>3:break
            assert repeat<=3
            if cell.get(T+'formula'):
                assert len(vals)==1 and repeat==1
                assert cell.get(T+'formula')==f'of:=[.A{rownum}]+17'
                assert int(s)==int(vals[0])+17 and float(cell.get(O+'value'))==int(s)
            vals.extend([s]*repeat)
        while vals and not vals[-1]:vals.pop()
        if vals:assert int(row.get(T+'number-rows-repeated','1'))==1;rows.append(vals)
    assert len(rows[0])==3 and 'ID' in rows[0][0]
    return [{'id':int(a),'duration':int(b),'depends':[] if c=='0' else [int(v) for v in c.split(';')]} for a,b,c in rows[1:]]
if __name__=='__main__':print(json.dumps(read(sys.stdin.buffer.read()),separators=(',',':')))
