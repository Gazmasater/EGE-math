const {records}=require('./physics-em-oscillations');
const {C,txt,line,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const n=x=>Number(x.toFixed(7)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:7});
const diagrams={};
for(const r of Object.values(records)){let b='',cy=570;
 if(r.images.length){
  b+=txt(50,86,'Исходный рисунок ФИПИ',C.gray,18)+original(r.images[0],110,120,440,325).body;
  if(r.kind==='energy-minima')b+=txt(55,498,'Минимумы W_C: t = 1, 3, 5 мкс',C.blue,22)+txt(55,536,'При положительном и отрицательном пиках I',C.ink,20);
  else if(r.kind==='graph-period')b+=txt(55,495,'T₁ = '+r.T+' мкс',C.blue,23)+txt(55,533,'T₂ = '+r.answer+' мкс',C.ink,23);
  else if(r.kind.startsWith('switch-'))b+=txt(55,497,r.kind==='switch-capacitor'?'Положение 1: C; положение 2: 4C':'Положение 1: L; положение 2: Lₓ',C.blue,22)+txt(55,535,'В контуре работает одна выбранная ветвь',C.ink,20);
  else b+=txt(55,495,'ω = '+(r.omegaPi===1e6?'π·10⁶':n(r.omegaPi)+'π')+' с⁻¹',C.blue,23)+txt(55,535,'Ток и напряжение имеют одинаковый период',C.ink,20);
 }else if(r.kind.startsWith('table-')){
  const charge=r.kind==='table-inductance',a=charge?2:4,Y=v=>300-v*(charge?70:35),X=t=>120+48*t;
  b+=txt(55,86,'По данным первичной таблицы',C.gray,18)+arrow(120,300,455,0,C.ink,'t, мкс',[15,25,'end'])+arrow(120,460,0,-350,C.ink,charge?'q, мкКл':'I, мА',[-15,-5,'end']);
  for(const t of[0,2,4,6,8])b+=line(X(t),156,X(t),445,C.gray,1,'4 5')+txt(X(t),487,String(t),C.ink,18,'middle');
  const points=Array.from({length:181},(_,i)=>`${X(i/20)},${Y(a*Math.cos(Math.PI*i/80))}`).join(' ');
  b+=`<polyline points="${points}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  const samples=charge?[2,1.42,0,-1.42,-2,-1.42,0,1.42,2,1.42]:[4,2.83,0,-2.83,-4,-2.83,0,2.83,4,2.83];
  samples.forEach((v,t)=>b+=dot(X(t),Y(v),t===5&&r.kind==='table-energy'?C.red:C.blue));
  for(const v of[-a,0,a])b+=txt(104,Y(v)+6,n(v),C.ink,18,'end');
  b+=txt(65,535,r.kind==='table-energy'?'I(5 мкс) = −2,83 мА; T = 8 мкс':'Максимумы в 0 и 8 мкс: T = 8 мкс',C.blue,22);
 }else if(['total-energy-ratio','magnetic-energy-ratio','current-amplitude-ratio'].includes(r.kind)){
  b+=txt(55,92,'Энергия переходит между электрическим',C.ink,22)+txt(55,128,'и магнитным полями',C.ink,22);
  b+=`<rect x="85" y="190" width="205" height="120" rx="12" fill="#edf4ff" stroke="${C.blue}"/><rect x="390" y="190" width="205" height="120" rx="12" fill="#ecf8f1" stroke="${C.green}"/>`;
  b+=txt(187,235,'Конденсатор',C.blue,22,'middle')+txt(187,280,r.kind==='total-energy-ratio'?'CU² ÷ 2':'CU₀² ÷ 2',C.blue,25,'middle')+txt(492,235,'Катушка',C.green,22,'middle')+txt(492,280,'LI_макс² ÷ 2',C.green,24,'middle')+arrow(303,233,72,0,C.ink)+arrow(375,268,-72,0,C.ink);
  b+=txt(75,389,'Полная энергия сохраняется',C.ink,24)+txt(75,440,'Один конденсатор, одинаковое напряжение',C.ink,21)+txt(75,509,r.kind==='current-amplitude-ratio'?'При L₂ = 4L₁: I₂_макс = 0,5I₁_макс':'В обоих опытах энергия одинакова',C.blue,22);
 }else if(r.kind==='energy-period-ratio'){
  b+=txt(60,90,'Нормированная энергия W_C ÷ W_макс',C.ink,21)+arrow(120,430,440,0,C.ink,'t',[0,28,'end'])+arrow(120,430,0,-275,C.ink)+line(114,200,126,200,C.ink,1)+txt(106,206,'1',C.ink,18,'end')+txt(106,436,'0',C.ink,18,'end');
  const points=Array.from({length:161},(_,j)=>`${120+400*j/160},${430-230*Math.cos(2*Math.PI*j/160)**2}`).join(' ');
  b+=`<polyline points="${points}" fill="none" stroke="${C.blue}" stroke-width="3"/>`+line(320,200,320,430,C.gray,1,'5 4')+line(520,200,520,430,C.gray,1,'5 4')+txt(320,469,'T_зар ÷ 2',C.ink,20,'middle')+txt(520,469,'T_зар',C.ink,20,'middle')+txt(60,531,'Период энергии вдвое меньше периода заряда',C.blue,21);
 }else{
  const entries=r.kind==='area-frequency'?['S₂ = S₁ ÷ 9 → C₂ = C₁ ÷ 9','L₂ = 4L₁','(L₂C₂) ÷ (L₁C₁) = 4 ÷ 9','ν₂ ÷ ν₁ = √(9 ÷ 4) = 1,5']:r.kind==='current-period-ratio'?['q_макс одинаков','I_макс = ωq_макс = 2πq_макс ÷ T','T₁ = 9·10⁻⁸ с; T₂ = 3·10⁻⁸ с','I₂_макс ÷ I₁_макс = 3']:r.id==='8A97BF'?['Первый опыт: 4L и C','Второй опыт: L и C','T₂ ÷ T₁ = √(1 ÷ 4)','Период стал вдвое меньше']:['Новая индуктивность: L₂ = 18L₁','Новая ёмкость: C₂ = C₁ ÷ 2','(L₂C₂) ÷ (L₁C₁) = 9','T₂ ÷ T₁ = √9 = 3'];
  for(let i=0;i<entries.length;i++){const y=135+i*107;b+=`<rect x="60" y="${y-35}" width="560" height="73" rx="12" fill="${i===3?'#ecf8f1':'#edf4ff'}" stroke="#c6d3e1"/>`+txt(80,y+8,entries[i],i===3?C.green:C.ink,23);if(i<3)b+=arrow(335,y+47,0,18,C.blue);}
 }
 const cs=cards(r.stages,cy);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+18);
}
module.exports={diagrams};
