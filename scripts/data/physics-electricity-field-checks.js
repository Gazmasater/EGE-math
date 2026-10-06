const assert=require('node:assert/strict');
const {records,cases}=require('./physics-electricity-field');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(Math.abs(a),Math.abs(b),1e-30),`${a} != ${b}`);
const electric=(point,sources)=>sources.reduce((v,[x,y,q])=>{const dx=point[0]-x,dy=point[1]-y,r=Math.hypot(dx,dy);return[v[0]+q*dx/r**3,v[1]+q*dy/r**3]},[0,0]);
function direction([x,y]){if(Math.abs(x)<1e-12)return y>0?'вверх':'вниз';assert.ok(Math.abs(y)<1e-12);return x>0?'вправо':'влево';}
function verifyPhysics(){
 const done=new Set(),number=(id,x)=>{near(Number(records[id].answer.replace(',','.')),x);done.add(id)},word=(id,s)=>{assert.equal(records[id].answer,s,id);done.add(id)};
 const ratios={
  '8FC4FE':[3,3,2,1,false],D9227C:[1.5,1.5,1,6,false],'924E79':[3,3,1/3,1,false],
  '3F867D':[1/3,1/3,3,1,true],FA14BD:[4,4,2,1,false],'883BB0':[2.4,.5,1,1,false],
  '98D710':[3,2,1,4,false],'327D56':[6,6,3,1,false],FF93A0:[2,1,2,1,true],
  '3464A4':[.5,1/3,1,9,false],A41595:[1,1,3,18,false],'7F4939':[2,1,1,50,false],
  '762281':[6,1,2,1,false],EA918C:[3,1,3,1,true]
 };
 for(const[id,[a,b,d,F0,inverse]]of Object.entries(ratios)){
  // Два прямых расчёта по закону Кулона при произвольных исходных зарядах и расстоянии.
  const k=9e9,q1=2e-8,q2=-7e-8,r=.4,F=k*Math.abs(q1*q2)/r**2,Fnew=k*Math.abs(q1*a*q2*b)/(r*d)**2;
  number(id,inverse?F/Fnew:F0*Fnew/F);near(Fnew*(d*d)/(a*b),F);
 }
 for(const[id,q1,q2]of[['11272F',7,-3],['7684DC',2,-6],['BE658E',4,-8],['0E8939',3,-1]]){
  const total=q1+q2,qA=total/2,qB=total/2;near(qA+qB,total);assert.ok(q1*q2<0&&qA*qB>0);number(id,Math.abs(q1*q2)/(qA*qB));
 }
 const k=9e9;
 number('3BB12E',k*(2e-8)**2/3**2/1e-6);
 number('5604DA',k*(1e-8)**2/.6**2/1e-6);
 number('864055',k*(2e-8)**2/.3**2/1e-3);
 const q2=8e-9*.3**2/(k*2e-10);number('D48CE0',q2/1e-9);near(k*2e-10*q2/.3**2,8e-9);
 const C=8e-9,E=5,W1=.5*(3*C)*E**2,W2=.5*C*(3*E)**2;number('2CA65F',W2/W1);near(3*C*E,C*3*E);
 const accelerations={
  '72454E':[-1,[[2,1,-1],[2,-1,1]]],
  '2FB019':[1,[[-1,-2,1],[1,-2,-1]]],
  CCAAA1:[1,[[2,1,-1],[2,-1,1]]],FC35C8:[1,[[2,1,-1],[2,-1,1]]],
  '8FA4CE':[-1,[[-2,1,-1],[-2,-1,1]]],
  '170361':[-1,[[-1,2,-1],[1,2,1]]]
 };
 for(const[id,[probe,sources]]of Object.entries(accelerations)){
  const E=electric([0,0],sources),force=E.map(x=>x*probe);word(id,direction(force));
  for(const charge of sources){const v=electric([0,0],[charge]).map(x=>x*probe),expected=charge[2]>0?cases[id].vplus:cases[id].vminus;assert.deepEqual(v.map(Math.sign),expected,id+': force arrows')}
 }
 const square=[[-1,1,-1],[1,1,1],[-1,-1,-1],[1,-1,1]];
 word('144026',direction(electric([0,0],square).map(x=>-x)));
 for(const id of ['F492D3','8DCB3A'])word(id,direction(electric([0,0],[[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1]])));
 for(const[id,point,sources]of[
  ['EB53BC',[3,0],[[0,0,1],[1,0,1]]],['7C1EDE',[0,0],[[1,0,-1],[2,0,-1]]],
  ['1A0E58',[3,0],[[0,0,-1],[1,0,-1]]],['2241AF',[0,0],[[1,0,1],[2,0,1]]],
  ['BCB00B',[0,0],[[-1,0,1],[1,0,-5]]]
 ])word(id,direction(electric(point,sources)));
 const fc=2.5e-8,fb=9e-9,bc=.8,ac=Math.sqrt(bc*bc/(fc/fb-1)),ab=Math.hypot(ac,bc);
 number('2583B9',ac);number('D8D69E',Math.sqrt(.6**2*(fc/fb-1)));near(fc*ac*ac,fb*ab*ab);near(ab,1);
 const EA=electric([0,0],[[-4,-4,2]]),EBunit=electric([0,0],[[4,-4,1]]),slope=-2/6;
 const qb=(slope*EA[0]-EA[1])/(EBunit[1]-slope*EBunit[0]);number('A3169F',qb);
 const Etotal=electric([0,0],[[-4,-4,2],[4,-4,qb]]);near(Etotal[1]/Etotal[0],slope);assert.ok(Etotal[0]>0&&Etotal[1]<0);
 assert.deepEqual([...done].sort(),Object.keys(records).sort());return{count:done.size,status:'ok'};
}
module.exports={verifyPhysics};
