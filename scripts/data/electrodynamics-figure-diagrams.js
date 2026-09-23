const {C,txt,line,dot}=require('../lib/physics-svg');
function figureDiagram(p,y,{ray,lensSymbol}){
 const vs=p.vertices.map(([name,x,v])=>({name,x,y:v,fx:p.F*(-x)/(-x-p.F),fy:-p.F*v/(-x-p.F)}));
 const left=Math.min(...vs.map(v=>v.x))*1.10,right=Math.max(...vs.map(v=>v.fx))*1.09,X=x=>62+(x-left)/(right-left)*550;
 const top=Math.max(...vs.flatMap(v=>[Math.abs(v.y),Math.abs(v.fy)]),1),sy=105/top,ay=y+220,Y=v=>ay-v*sy,ox=X(0);
 let b=txt(340,y+25,'Построение изображений вершин',C.ink,21,'middle')+line(40,ay,642,ay,C.gray,1.3)+lensSymbol(ox,ay,150);
 for(const sign of [-1,1])b+=dot(X(sign*p.F),ay,C.ink)+txt(X(sign*p.F),ay+44,'F',C.ink,18,'middle');
 for(const [i,v]of vs.entries()){
  const color=[C.blue,C.purple,C.green,C.red][i];
  // Paraxial mapping of two physical rays from each point, including axial points.
  const pupils=v.y?[v.y,0]:[0,top*(i%2?-.72:.72)];
  for(const t of pupils)b+=ray(X(v.x),Y(v.y),ox,Y(t),color)+ray(ox,Y(t),X(v.fx),Y(v.fy),color);
 }
 const polygon=(pts,color)=>'<'+(vs.length===2?'polyline':'polygon')+' points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="'+(vs.length===2?'none':color+'14')+'" stroke="'+color+'" stroke-width="3"/>';
 b+=polygon(vs.map(v=>[X(v.x),Y(v.y)]),C.green)+polygon(vs.map(v=>[X(v.fx),Y(v.fy)]),C.red);
 // Labels for close axial vertices use separated leader positions, not overlapping text.
 for(const [i,v]of vs.entries()){
  for(const image of [false,true]){
   const px=X(image?v.fx:v.x),py=Y(image?v.fy:v.y),color=image?C.red:C.green;
   const group=vs.filter(t=>Math.abs(X(image?t.fx:t.x)-px)<28 && Math.abs(Y(image?t.fy:t.y)-py)<28);
   group.sort((a,b)=>(image?a.fx:a.x)-(image?b.fx:b.x));
   const shift=group.length>1?(group.indexOf(v)?28:-28):0,dy=(image?v.fy:v.y)>0?-16:26;
   b+=dot(px,py,color)+line(px,py,px+shift,py+dy*.6,color,1)+txt(px+shift,py+dy,v.name+(image?'′':''),color,18,'middle');
  }
 }
 b+=txt(ox+12,ay-15,'O',C.ink,18)+txt(340,y+415,'Справа — действительное изображение',C.ink,19,'middle');
 const iy=y+490,xmin=Math.min(...vs.map(v=>v.fx)),xmax=Math.max(...vs.map(v=>v.fx)),ymin=Math.min(...vs.map(v=>v.fy)),ymax=Math.max(...vs.map(v=>v.fy));
 const scale=Math.min(350/Math.max(xmax-xmin,1),220/Math.max(ymax-ymin,1)),Q=x=>340+(x-(xmin+xmax)/2)*scale,R=v=>iy+190-(v-(ymin+ymax)/2)*scale;
 b+=txt(340,iy+20,'Форма изображения крупно',C.ink,21,'middle')+polygon(vs.map(v=>[Q(v.fx),R(v.fy)]),C.red);
 if(ymin<=0&&ymax>=0)b+=line(105,R(0),575,R(0),C.gray,1,'5 5');
 for(const v of vs)b+=dot(Q(v.fx),R(v.fy),C.red)+txt(Q(v.fx)+(v.fx<(xmin+xmax)/2?-14:14),R(v.fy)+(v.fy>(ymin+ymax)/2?-12:25),v.name+'′',C.red,20,v.fx<(xmin+xmax)/2?'end':'start');
 b+=txt(340,iy+365,p.result,C.ink,21,'middle');return{body:b,h:900};
}
module.exports={figureDiagram};
