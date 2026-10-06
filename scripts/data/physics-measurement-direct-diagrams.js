const {original,cards,svg,arrow,txt,C}=require('../lib/physics-svg');
const cases=require('./physics-measurement-direct-cases.json');
const {records}=require('./physics-measurement-direct');
const diagrams={};
for(const c of cases){
 const r=records[c.id],h=r.mechanics?520:c.kind==='kelvin'?470:420;
 const y=c.kind==='friction'?120:72;
 let im=original(c.image,0,y,600,h);
 im=original(c.image,(680-im.w)/2,y,600,h);
 let body=im.body,end=y+im.h+26;
 if(['weight','gravity'].includes(c.kind)){
  const positions={
   '72C2B7':{x:.071,top:.79,center:.89},
   '79D8BD':{x:.82,top:.66,center:.80},
   'E11CE9':{x:.88,top:.70,center:.84},
   'F6EA64':{x:.88,top:.90,center:.96}
  };
  const q=positions[c.id],x=im.X(q.x),top=im.Y(q.top),center=im.Y(q.center);
  body+=arrow(x,top,0,-64,C.blue,'T',[17,['79D8BD','F6EA64'].includes(c.id)?18:-3]);
  body+=arrow(x,center,0,72,C.red,'mg',[['79D8BD','E11CE9'].includes(c.id)?45:17,8]);
  const ax=x<340?70:610;
  body+=arrow(ax,center,0,-68,C.gray,'y',[12,0]);
  end=Math.max(end,center+106);
  body+=txt(340,end,'Груз покоится: T − mg = 0',C.ink,20,'middle');
  end+=28;
 }else if(c.kind==='friction'){
  body+=arrow(im.X(.714),im.Y(.476),-92,0,C.blue,'T',[-12,-13,'end']);
  body+=arrow(im.X(.82),im.Y(.89),92,0,C.red,'F_тр',[0,27,'end']);
  body+=arrow(im.X(.80),im.Y(.89),0,-91,C.green,'N',[-15,-5,'end']);
  body+=arrow(im.X(.88),im.Y(.52),0,98,C.purple,'mg',[-18,20,'end']);
  end=Math.max(end,im.Y(.52)+143);
  body+=arrow(142,end,0,-52,C.gray,'y',[10,0])+arrow(142,end,-64,0,C.gray,'x',[-12,7,'end']);
  body+=txt(364,end,'T − F_тр = 0; N − mg = 0',C.ink,19,'middle');
  end+=28;
 }
 const panel=cards(r.stages,end);
 diagrams[c.id]=svg(c.id,r.title,r.diagramCaption,body+panel.body,panel.end+12);
}
module.exports={diagrams};
