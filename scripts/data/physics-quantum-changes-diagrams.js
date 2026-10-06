const {C,txt,rect,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-quantum-changes');
const {cases}=require('./physics-quantum-changes-cases');
const catalog=require('./physics-completion-catalog.json');
const diagrams={};
for(const [id,r] of Object.entries(records)){
 let body='',y=74;
 for(const file of catalog.find(t=>t.id===id).images){const p=original(file,50,y,580,310);body+=p.body;y+=p.h+20;}
 const nuclear=cases[id].kind==='nucleus';
 body+=rect(45,y,590,90)+txt(340,y+37,nuclear?'A = Z + N; q = Ze':'E = hν; E = A + K; K = eU',C.blue,26,'middle')+
 txt(340,y+74,nuclear?'Считаем нуклоны и заряд':'Материал катода прежний: A постоянно',C.ink,22,'middle');y+=118;
 if(id==='7A8110'||id==='C1C98B')body=body.replace('E = hν; E = A + K; K = eU','E = hν; pc = E; P = ΦE').replace('Материал катода прежний: A постоянно','При неизменной частоте E постоянно');
 const stages=r.stages.map((s,i)=>[i===0?'Процесс':`Столбец ${i}`,s]);
 stages.push(['Ответ',r.answer+'; 1 — рост, 2 — уменьшение, 3 — без изменения']);
 const panel=cards(stages,y);diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
