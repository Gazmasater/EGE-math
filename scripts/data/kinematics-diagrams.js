const fs=require('node:fs');
const path=require('node:path');
const sources=require('./kinematics-sources.json');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sub=s=>esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const C={ink:'#344054',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',grid:'#d0d5dd'};
const text=(x,y,s,color=C.ink,size=18,anchor='start')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="3" stroke-linejoin="round">${sub(s)}</text>`;
const line=(x1,y1,x2,y2,color=C.ink,width=2,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
const arrow=(x,y,dx,dy,color=C.blue,label='',lx=9,ly=-7)=>`<path d="M${x} ${y}l${dx} ${dy}" fill="none" stroke="${color}" stroke-width="3" marker-end="url(#k-${Object.keys(C).find(k=>C[k]===color)})"/>`+(label?text(x+dx+lx,y+dy+ly,label,color):'');
const dot=(x,y,color=C.blue,r=5)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
function wrap(id,title,body,height=560) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${height}" role="img" aria-labelledby="k-title-${id}" data-kinematics-diagram="${id}"><title id="k-title-${id}">${esc(title)}</title><defs>${Object.entries(C).map(([k,c])=>`<marker id="k-${k}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><g font-family="Arial,sans-serif"><rect width="680" height="${height}" rx="12" fill="white"/>${text(26,34,title,C.ink,22)}${body}</g></svg>`;
}
function graph({x=90,y=140,w=475,h=290,tMax,vMax,ticksT,ticksV,xLabel='t, с',yLabel='v, м·с⁻¹'}) {
  const X=t=>x+w*t/tMax,Y=v=>y+h-h*v/vMax;
  let body='';
  for(const [t,label] of ticksT){body+=line(X(t),y,X(t),Y(0),C.grid,1,'4 5')+text(X(t),Y(0)+27,label,C.ink,17,'middle');}
  for(const [v,label] of ticksV){body+=line(x,Y(v),x+w,Y(v),C.grid,1,'4 5')+text(x-12,Y(v)+6,label,C.ink,17,'end');}
  body+=arrow(x,Y(0),w+27,0,C.ink)+arrow(x,Y(0),0,-h-24,C.ink)+text(x+w+36,Y(0)+6,xLabel,C.ink,17)+text(x-15,y-40,yLabel,C.ink,18);
  return {X,Y,body,x,y,w,h};
}
const diagrams={};
const configurations={
  '34E52A':{title:'Разгон на участке 20 м',v0:5,v1:15,time:2,area:'s=20 м',ticks:[0,5,10,15],max:17.5,acc:'a_x=+5 м·с⁻²'},
  '9AC70F':{title:'Торможение на участке 20 м',v0:15,v1:5,time:2,area:'s=20 м',ticks:[0,5,10,15],max:17.5,acc:'a_x=−5 м·с⁻²'},
  '3D4BAC':{title:'Последние 200 с перед остановкой',v0:10,v1:0,time:200,area:'s=1000 м',ticks:[0,5,10],max:12,acc:'a_x=−0,05 м·с⁻²'},
  'E3DCE5':{title:'Последний километр перед остановкой',v0:10,v1:0,time:200,area:'s=1000 м',ticks:[0,5,10],max:12,acc:'τ=200 с'},
  '3848C6':{title:'Разгон поезда из состояния покоя',v0:0,v1:20,time:400,area:'s=4000 м',ticks:[0,10,20],max:23,acc:'a=0,05 м·с⁻²'},
};
for(const [id,c] of Object.entries(configurations)) {
  const g=graph({tMax:c.time,vMax:c.max,ticksT:[[0,'0'],[c.time/2,String(c.time/2)],[c.time,String(c.time)]],ticksV:c.ticks.map(v=>[v,String(v)]),xLabel:'t, с'});
  let b=`<path d="M${g.X(0)} ${g.Y(0)}L${g.X(0)} ${g.Y(c.v0)}L${g.X(c.time)} ${g.Y(c.v1)}L${g.X(c.time)} ${g.Y(0)}Z" fill="#e0edff"/>`+g.body+
    line(g.X(0),g.Y(c.v0),g.X(c.time),g.Y(c.v1),C.blue,4)+dot(g.X(0),g.Y(c.v0))+dot(g.X(c.time),g.Y(c.v1))+
    text(320,385,c.area,C.blue,23,'middle')+text(400,95,c.acc,C.ink,19,'middle');
  if(id==='3848C6')b+=dot(g.X(200),g.Y(10),C.green,6)+text(g.X(200)+14,g.Y(10)-13,'1 км',C.green,18);
  b+=text(26,500,'Площадь под графиком скорости равна пройденному пути.',C.ink,18);
  b+=arrow(455,530,85,0,C.ink,'Ox',8,6)+arrow(c.v1>c.v0?270:355,530,c.v1>c.v0?65:-65,0,C.red,'F_рез',10,-8);
  diagrams[id]=wrap(id,c.title,b,570);
}

{
  const g=graph({tMax:3,vMax:3.5,ticksT:[[0,'0'],[1,'1'],[3,'3']],ticksV:[[0,'0'],[1,'v₁'],[3,'3v₁']],yLabel:'v',xLabel:'t, с'});
  diagrams['083006']=wrap('083006','Скорость пропорциональна времени',
    `<rect x="${g.X(1)}" y="${g.y}" width="${g.X(3)-g.X(1)}" height="${g.h}" fill="#eff8ff"/>`+g.body+
    line(g.X(0),g.Y(0),g.X(3),g.Y(3),C.blue,4)+dot(g.X(1),g.Y(1))+dot(g.X(3),g.Y(3))+
    text(370,215,'Δt=2 с',C.purple,22)+text(370,250,'t₁=1 с',C.blue,22)+
    text(30,505,'Отсчёт времени начинается при v₀=0.',C.ink,19)+arrow(475,535,75,0,C.ink,'Ox',8,5)+arrow(300,535,70,0,C.red,'F_рез',10,-8),575);
}

{
  const g=graph({x:265,y:140,w:310,h:285,tMax:1,vMax:24,ticksT:[[0,'0'],[1,'1']],ticksV:[[0,'0'],[10,'10'],[20,'20']],xLabel:'t, с'});
  const b=`<path d="M${g.X(0)} ${g.Y(0)}L${g.X(0)} ${g.Y(10)}L${g.X(1)} ${g.Y(20)}L${g.X(1)} ${g.Y(0)}Z" fill="#e0edff"/>`+g.body+
    line(g.X(0),g.Y(10),g.X(1),g.Y(20),C.blue,4)+dot(g.X(0),g.Y(10))+dot(g.X(1),g.Y(20))+
    arrow(135,110,0,305,C.ink,'Oy',9,10)+dot(75,140,C.ink,8)+dot(75,320,C.ink,8)+
    arrow(83,140,0,65,C.blue,'v₀',10,0)+arrow(83,320,0,106,C.blue,'2v₀',10,0)+
    arrow(75,140,0,115,C.red,'mg',-36,0)+line(175,140,175,320,C.grid,2,'5 5')+
    text(182,238,'15 м',C.ink,17)+text(425,375,'s=15 м',C.blue,22,'middle')+
    text(30,505,'a_y=g=10 м·с⁻²; тело всё время движется вниз.',C.ink,19);
  diagrams['B9584F']=wrap('B9584F','Бросок вертикально вниз',b);
}

{
  const g=graph({tMax:1,vMax:4.6,ticksT:[[0,'0'],[.5,'τ:2'],[1,'τ']],ticksV:[[0,'0'],[2,'2'],[4,'4']],xLabel:'t'});
  diagrams['854BA3']=wrap('854BA3','Встреча велосипедиста и бегуна',g.body+
    line(g.X(0),g.Y(0),g.X(1),g.Y(4),C.blue,4)+line(g.X(0),g.Y(2),g.X(1),g.Y(2),C.purple,4)+
    dot(g.X(1),g.Y(4))+text(290,185,'Велосипедист',C.blue,19)+text(355,g.Y(2)-13,'Бегун',C.purple,19)+
    text(28,495,'К моменту τ пройденные пути равны:',C.ink,20)+text(28,529,'½·4·τ = 2·τ. Скорость бегуна — 2 м·с⁻¹.',C.ink,20),565);
}

function projectile(id,fence=false) {
  // Геометрические масштабы по x и y одинаковы: касательная показывает истинный угол броска.
  const vx=fence?8:10/Math.sqrt(3),vy=fence?8:10,h0=fence?1.6:0,top=fence?4.8:5;
  const scale=fence?38:39,ox=90,oy=425,X=x=>ox+x*scale,Y=y=>oy-y*scale;
  const end=fence?1.4:2,points=[];
  for(let i=0;i<=70;i++){const t=end*i/70;points.push(`${X(vx*t)},${Y(h0+vy*t-5*t*t)}`);}
  const ta=vy/10,ax=vx*ta,ay=h0+vy*ta-5*ta*ta;
  let b=arrow(ox,oy,520,0,C.ink,'Ox',9,6)+arrow(ox,oy,0,-325,C.ink,'Oy',8,-3)+
    `<polyline data-trajectory="${id}" points="${points.join(' ')}" fill="none" stroke="${C.blue}" stroke-width="4"/>`+
    dot(X(0),Y(h0))+dot(X(ax),Y(ay))+
    arrow(X(0),Y(h0),vx*7,-vy*7,C.blue,'v₀',9,-4)+arrow(X(ax),Y(ay),95,0,C.blue,'v_x',8,-8)+
    line(X(0),Y(top),X(ax),Y(top),C.grid,2,'5 5')+
    text(X(ax)-5,Y(ay)-25,'v_y=0',C.blue,20,'middle');
  if(fence) {
    b+=`<path d="M${X(6.4)} ${oy}V${Y(4.8)}" stroke="#8b6d4a" stroke-width="9"/>`+
      dot(X(6.4),Y(4.8))+line(ox,Y(h0),X(6.4),Y(h0),C.grid,1,'4 4')+
      text(ox-13,Y(h0)+7,'h₀',C.ink,19,'end')+text(ox-13,Y(top)+7,'h',C.ink,19,'end')+
      text(X(6.4),oy+32,'S=6,4 м',C.ink,19,'middle')+text(26,505,'h₀=1,6 м; h=4,8 м; u_x=u_y=8 м·с⁻¹.',C.ink,19)+
      text(26,537,'Верх забора совпадает с вершиной траектории.',C.ink,19);
  } else {
    b+=line(X(ax),Y(top),X(ax),oy,C.grid,2,'5 5')+text(ox-13,Y(top)+6,'H=5 м',C.ink,17,'end')+
      `<path d="M${ox+40} ${oy}A40 40 0 0 0 ${ox+20} ${oy-34.64}" fill="none" stroke="${C.purple}" stroke-width="2"/>`+
      text(ox+45,oy-22,'60°',C.purple,19)+text(26,505,'Через 1 с камень достигает высоты 5 м.',C.ink,20)+
      text(26,537,'Скорость горизонтальна; ускорение направлено вниз.',C.ink,19);
  }
  // Сила рисуется поверх забора и вспомогательного пунктира, чтобы её стрелка не скрывалась.
  b+=line(X(ax),Y(ay),X(ax),Y(ay)+80,'white',7)+arrow(X(ax),Y(ay),0,80,C.red,'mg',12,0)+dot(X(ax),Y(ay));
  return wrap(id,fence?'Бросок мяча через забор':'Верхняя точка траектории',b,570);
}
diagrams['D01BEA']=projectile('D01BEA');diagrams['9AC6EF']=projectile('9AC6EF',true);

{
  const id='77E11B',src=sources[id].image,data=fs.readFileSync(path.join(__dirname,'../../fipi-assets',src)).toString('base64');
  let b=`<image data-fipi-source="${esc(src)}" href="data:image/png;base64,${data}" x="110" y="90" width="115.7" height="366.6"/>`;
  for(const [t,py] of [[0,34],[1,54],[2,109],[3,206]])b+=text(91,90+py*1.3+6,`t=${t} с`,C.ink,17,'end');
  b+=arrow(123,90+109*1.3,0,75,C.red,'mg_п',-65,0)+text(300,110,'Положения через 1 с',C.ink,21);
  for(const [i,t,y] of [[0,0,0],[1,1,6],[2,2,24],[3,3,54]])b+=text(305,155+i*38,`${t} с`,C.ink,20)+text(425,155+i*38,`${y} м`,C.blue,20);
  b+=text(290,345,'Δy: 6; 18; 30 м',C.ink,20)+text(290,382,'Приросты: 12; 12 м',C.ink,20)+text(290,430,'a_y=+12 м·с⁻²',C.blue,24)+text(26,515,'Ось Oy направлена вниз, поэтому a_y положительна.',C.ink,19);
  diagrams[id]=wrap(id,'Свободное падение на другой планете',b);
}

{
  let b='';
  for(const [off,h,index] of [[0,50,1],[330,78,2]]) {
    const s=h/130,c=Math.sqrt(1-s*s),a=-Math.asin(s)*180/Math.PI;
    const ax=off+38,ay=375,length=285,bx=ax+length*c,by=ay-length*s;
    const baseX=ax+length*.58*c,baseY=ay-length*.58*s;
    const cmX=baseX-17*s,cmY=baseY-17*c;
    // Результирующая контактных сил проходит по вертикали через центр масс.
    const contactX=cmX,contactY=baseY+17*s*s/c;
    b+=text(off+25,84,`Опыт ${index}: h${index===1?'₁':'₂'}=${h} см`,C.ink,21)+
      line(ax,ay,off+315,ay,C.ink,2)+line(ax,ay,bx,by,C.ink,6)+line(bx,by,bx,ay,C.grid,2,'5 5')+
      `<rect x="${baseX-28}" y="${baseY-34}" width="56" height="34" transform="rotate(${a} ${baseX} ${baseY})" fill="#fff1dd" stroke="${C.ink}" stroke-width="2"/>`+
      text(ax-12,ay+25,'A')+text(bx+7,by-10,'B')+
      arrow(cmX,cmY,0,94,C.red,'mg',10,5)+arrow(contactX,contactY,-s*94*c,-c*94*c,C.blue,'N',-18,-7)+
      arrow(contactX,contactY,c*94*s,-s*94*s,C.green,'F_тр',10,-6)+
      arrow(off+242,175,42*c,-42*s,C.ink,'Ox',4,-1)+arrow(off+242,175,-42*s,-42*c,C.ink,'Oy',-7,-8)+
      text(off+25,430,`tgα${index===1?'₁':'₂'}=${index===1?'5:12≈0,417':'0,75'}<0,8`,C.ink,18)+
      text(off+25,465,'Брусок покоится',C.blue,21);
  }
  b+=text(26,515,'Трение покоя: F_тр=mg·sinα. При подъёме доски оно растёт.',C.ink,18)+text(26,547,'F_тр2 : F_тр1 = 78 : 50 = 1,56.',C.green,21);
  diagrams['E24F06']=wrap('E24F06','Два положения доски: силы на бруске',b,580);
}

module.exports={diagrams};
