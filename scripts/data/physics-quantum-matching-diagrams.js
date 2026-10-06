const {C,txt,rect,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-quantum-matching');
const {cases}=require('./physics-quantum-matching-cases');
const cat=require('./physics-completion-catalog.json'),diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=78;const files=cat.find(t=>t.id===id).images;
 for(const[i,file]of files.entries()){
  const tiny=file.includes('innerimg'),label=cases[id].kind==='graph'?['График А','График Б'][i]:tiny?'Вариант '+i:'Исходный рисунок';
  body+=txt(50,y,label,C.ink,19);y+=18;
  const p=original(file,80,y,tiny?240:520,tiny?60:360);body+=p.body;y+=p.h+34;
 }
 const law=cases[id].kind==='levels'?'ε = Eверх − Eниз = hν; ελ = hc':cases[id].kind==='reaction'?'α: ΔA = −4, ΔZ = −2; β⁻: ΔA = 0, ΔZ = +1':'E = hν; E = pc; λν = c';
 body+=rect(40,y,600,64)+txt(340,y+40,law,C.blue,22,'middle');y+=92;
 const panel=cards([...r.stages,['Ответ',r.answer+' — сначала А, затем Б']],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
