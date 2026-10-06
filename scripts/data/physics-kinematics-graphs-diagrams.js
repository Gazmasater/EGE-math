const {records}=require('./physics-kinematics-graphs');
const {C,txt,original,cards,svg}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){
 let body=txt(44,85,'Исходный график ФИПИ',C.gray,20);
 const main=r.images.at(-1),im=original(main,70,112,550,380);body+=im.body;
 // The first bitmap of these conditions is an isolated axis symbol; keep its
 // original bytes too, without mistaking it for the complete graph.
 if(r.images.length>1)body+=original(r.images[0],552,58,50,30).body;
 body+=txt(44,535,r.kind==='path'?'Путь: складываем модули площадей':r.kind==='displacement-magnitude'?'Перемещение: учитываем знаки площадей':r.kind==='velocity'?'Скорость: изменение координаты за время':r.kind==='coordinate-parabola'?'Вершина параболы: начальная скорость нулевая':r.kind.includes('speed')?'Расстояние: учитываем относительное движение':'Ускорение: изменение скорости за время',C.green,21);
 const cs=cards(r.stages,568);body+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body,cs.end+16);
}
module.exports={diagrams};
