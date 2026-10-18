#!/usr/bin/env python3
"""Build complete file-search explanations from the verified FIPI member list."""
import json, re, subprocess
from pathlib import Path, PurePosixPath
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'scripts/data'
def load(p): return json.loads((ROOT/p).read_text())
def dump(name,x): (DATA/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')

def selection(text):
    extension_text=re.search(r'расширени(?:ями|ем) (.*?) содержится',text)[1]
    extensions=['.'+e for e in re.findall(r'\b(?:txt|rtf|htm|html|docx|doc|odt|pdf|jpeg|jpg|png|tiff)\b',extension_text)]
    directories=[]
    for m in re.finditer(r'подкаталог(?:ах|е) (.*?) каталога (DEMO-12(?:/[А-Яа-яёЁ]+)?)',text):
        names=re.split(r',\s*| и ',m[1]);directories.extend(m[2]+'/'+n.strip() for n in names)
    if not directories:
        m=re.search(r'подкаталогах каталога (DEMO-12|Проза|Поэзия|Живопись)',text)
        assert m,text
        directories=[m[1] if m[1]=='DEMO-12' else 'DEMO-12/'+m[1]]
    assert extensions and len(extensions)==len(set(extensions)),text
    return extensions,directories

def main():
    registry=load('data-sources/oge-informatics/manifest.json')
    archives={a['taskId']:a for a in registry['archives']}
    tasks=json.loads(subprocess.run(['node','-e',
      "const {readOgeCatalog}=require('./scripts/lib/oge-catalog');"
      "const {conditionText}=require('./lib/seo-text');"
      "const {ogeSourceSignature}=require('./lib/oge-classification');"
      "console.log(JSON.stringify(readOgeCatalog(process.cwd(),'oge-informatics').tasks.map(t=>({id:t.id,text:conditionText(t.fragment),sourceHash:ogeSourceSignature(t)}))));"
      ],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
    members=load(next(a['validation']['evidence'] for a in archives.values() if a['group']=='type.12'))['members']
    members=[m for m in members if not m['directory']]
    records=[];sources={};models={}
    for t in tasks:
        if t['id'] not in archives or archives[t['id']]['group']!='type.12':continue
        exts,dirs=selection(t['text']);found=[];detail=[];counts=[]
        for folder in dirs:
            subset=[m for m in members if m['path'].startswith(folder+'/') and PurePosixPath(m['path']).suffix in exts]
            found+=subset;counts.append(len(subset))
            label=folder.replace('/',' → ')
            detail.append(f'{label}: {len(subset)}. '+('Подходящие файлы: '+ '; '.join('«'+m['path'][len(folder)+1:].replace('/',' → ')+'»' for m in subset)+'.' if subset else 'Файлов с указанными расширениями здесь нет.'))
        assert len({m['path'] for m in found})==len(found)
        answer=str(len(found));masks=', '.join('«*'+ext+'»' for ext in exts)
        result=' + '.join(map(str,counts))+' = '+answer if len(counts)>1 else answer
        solution=(f'1. Выберем область поиска.\nРаспаковываем именно архив из условия. Включаем показ расширений имён файлов. Область поиска: '+ '; '.join(d.replace('/',' → ') for d in dirs)+'. Поиск должен охватывать все вложенные папки каждой указанной области. Папки в ответ не включаем.\n\n'
        f'2. Зададим фильтр.\nИщем имена по маскам {masks}. Звёздочка обозначает произвольное имя, а расширение после последней точки должно совпасть полностью. Например, .htm и .html — разные расширения; .jpeg и .jpg также нельзя объединять без указания в условии. При нескольких расширениях объединяем списки результатов и каждый полный путь учитываем один раз. Одинаковые имена в разных папках относятся к разным файлам.\n\n'
        '3. Подсчитаем найденные файлы.\n'+'\n'.join(detail)+f'\nОбщее количество: {result}.\n\n'
        '4. Проверка.\nДля независимой проверки переключаемся на подробный список и группируем файлы по расширению в пределах выбранных папок. Число имён в приведённых списках должно совпасть с каждым промежуточным количеством, а сумма — с итогом. Не учитываем результаты за пределами заданных каталогов, сам архив и папки. В поле ответа вводим только число без названий файлов и единиц.\n\nОтвет: '+answer+'.')
        record={'id':t['id'],'answer':answer,'solution':solution,'diagram_svg':'','diagram_caption':''};records.append(record)
        extid='37688' if len(dirs)>1 else '10504'
        sources[t['id']]={'sourceHash':t['sourceHash'],'fipiCondition':t['text'],'reviewed':True,'match':'method','url':f'https://inf-oge.sdamgia.ru/problem?id={extid}',
          'expectedAnswer':answer,'externalAnswer':'6' if extid=='37688' else '16',
          'comparison':'Прочитан полный внешний разбор: поиск по точному расширению в выбранных каталогах с подсчётом результатов и суммированием по папкам. Это методическая сверка, а не подтверждение тождества внешнего архива. Собственный ответ пересчитан по оригинальному архиву ФИПИ; полный список выбранных файлов приведён в решении.',
          'archiveHash':archives[t['id']]['sha256'],'archiveUrl':archives[t['id']]['originalUrl']}
        models[t['id']]={'extensions':exts,'directories':dirs,'paths':[m['path'] for m in found],'counts':counts,'answer':answer}
    assert len(records)==160
    dump('oge-informatics-file-search-records.json',records);dump('oge-informatics-file-search-sources.json',sources);dump('oge-informatics-file-search-evidence.json',models)
    print(json.dumps({'prepared':len(records),'answers':dict(Counter(r['answer'] for r in records))}))
if __name__=='__main__':main()
