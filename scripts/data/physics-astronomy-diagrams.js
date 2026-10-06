const {C,txt,line,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-astronomy'),{cases}=require('./physics-astronomy-cases');
const catalog=require('./physics-completion-catalog.json'),diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=80;const c=cases[id],images=catalog.find(t=>t.id===id).images;
 for(const file of images){const im=original(file,45,y,590,c.kind==='hr'?540:130);body+=im.body;y+=im.h+28;}
 if(['planets','asteroids'].includes(c.kind)){
  body+=`<circle cx="170" cy="${y+75}" r="98" fill="#dce9ff" stroke="${C.blue}" stroke-width="2"/>`;
  body+=txt(170,y+81,'M',C.blue,25,'middle')+dot(270,y+75)+txt(282,y+68,'m',C.ink,21)+arrow(270,y+75,-70,0,C.red,'Fтяг',[0,30,'start'])+line(170,y+180,270,y+180)+txt(220,y+203,'R ≈ радиус тела',C.ink,17,'middle');
  body+=txt(390,y+50,'v₂ = √2 · v₁',C.blue,23)+txt(390,y+88,'v₁² = gR',C.blue,23)+txt(390,y+126,'V ∼ R³',C.blue,23);y+=235;
 }else if(c.kind==='stars'){
  body+=txt(48,y,'Горячее: O → B → A → F → G → K → M :холоднее',C.blue,20);y+=45;
  body+=txt(48,y,'L = 4πR²σT⁴; плотность: ρ · 4πR³ = 3M',C.blue,22);y+=40;
 }
 const panel=cards([['Проверка пяти утверждений',c.steps.map((_,i)=>`${i+1}: ${c.expected.includes(String(i+1))?'верно':'неверно'}`).join('; ')],['Ответ',c.expected+' — номера верных утверждений']],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
