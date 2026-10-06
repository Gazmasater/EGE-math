const assert=require('node:assert/strict');
const {records}=require('./physics-mechanics-changes');
const expected={DF724F:'11',F4D3FF:'21',FCA2F2:'13',E53EF5:'33','1FCB02':'23','589E07':'21',CCDA00:'33','9A460B':'21',FB9B74:'12','010677':'32',AFD87F:'21',AEDF70:'32','470EB5':'12',D443B8:'32',A431BF:'12',A843B2:'13','3968B6':'32',D84519:'13',E2791B:'32','607C12':'21','32F41D':'11',FB0F2E:'13','10BE25':'33',C30E2B:'21','4835D0':'32',BDFED1:'21','9A9FD1':'32','9810DD':'21',E7DBDE:'32','4DEC5A':'12',ACF9A7:'11',CA81AC:'33','82BCA1':'22','45DEC1':'31','4D97CC':'11','7D94CC':'23','29F6CD':'11',AE87C1:'11',C357C5:'21','8FD6CF':'23','4C8BE1':'22','0F00EB':'22',DCFBE7:'12',C0AFE6:'31','7EC464':'12','72E162':'33',A2C161:'33',A5CD6A:'23','95206E':'13','6AAD61':'31','07E032':'23',B66331:'13',C89B35:'11','9A5739':'23',E1173A:'21',EC2538:'13','6F893A':'13','8E5337':'32',FA548D:'33',D8368D:'32',A9B584:'12','9D3F89':'31','8247AC':'31'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const g=9.8,rad=a=>a*Math.PI/180;
function orbit(R){const GM=3.986e14,m=150,force=GM*m/R**2,omega=Math.sqrt(force/(m*R)),v=omega*R;return{R,a:omega**2*R,v,T:2*Math.PI/omega,F:force,K:m*v*v/2,U:-GM*m/R};}
function spring(m,k,A=.12){const omega=Math.sqrt(k/m),T=2*Math.PI/omega,v=omega*A;near(m*v*v,k*A*A);return{f:1/T,T,v};}
function projectile(v,angle,H=0,m=2){const vy=v*Math.sin(rad(angle)),vx=v*Math.cos(rad(angle)),t=(vy+Math.sqrt(vy*vy+2*g*H))/g;const result={t,L:vx*t,H:H+vy*vy/(2*g),a:g,v:Math.hypot(vx,vy-g*t)};near(m*result.v**2/2,m*v*v/2+m*g*H);return result;}
function slope(m,angle=30,mu=.16){const alpha=rad(angle),N=m*g*Math.cos(alpha),fr=mu*N,a=(m*g*Math.sin(alpha)-fr)/m,L=3;near(m*(2*a*L)/2,m*g*L*Math.sin(alpha)-fr*L);return{a,t:Math.sqrt(2*L/a),work:fr*L,gravity:m*g*L*Math.sin(alpha),mu,N};}
function pull(m,beta=0){const alpha=rad(32),mu=.2,T=m*g*(Math.sin(alpha)+mu*Math.cos(alpha))/(Math.cos(beta)+mu*Math.sin(beta)),N=m*g*Math.cos(alpha)-T*Math.sin(beta),F=mu*N;near(T*Math.cos(beta),m*g*Math.sin(alpha)+F);near(N+T*Math.sin(beta),m*g*Math.cos(alpha));return{T,work:F*2,mu};}
function float(m,rho,S=.01){const V=m/rho;return{h:V/S,V,mass:rho*V,F:rho*g*V,weight:m*g};}
function phase(y){const m=2,E=500,K=E-m*g*y;assert.ok(K>0);return{a:g,K,p:Math.sqrt(2*m*K),U:m*g*y};}
function verifyPhysics(){
 assert.equal(Object.keys(records).length,63);assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());const checked=new Set();
 const verify=(id,before,after)=>{assert.equal(before.length,2);assert.equal(after.length,2);let answer='';for(let i=0;i<2;i++){const a=before[i],b=after[i];assert.ok(Number.isFinite(a)&&Number.isFinite(b));answer+=Math.abs(b-a)<1e-8*Math.max(1,Math.abs(a),Math.abs(b))?'3':b>a?'1':'2';}assert.equal(answer,expected[id],id+': independent model');assert.equal(records[id].answer,answer,id);checked.add(id);};
 const compare=(id,a,b,keys)=>verify(id,keys.map(k=>a[k]),keys.map(k=>b[k]));
 // Independently evaluate forces and angular motion at two radii.
 const orbitCases=[['F4D3FF',7e6,8e6,'a','T'],['FB9B74',8e6,7e6,'v','T'],['AFD87F',7e6,8e6,'a','T'],['470EB5',8e6,7e6,'a','T'],['A431BF',6.771e6,6.671e6,'v','T'],['607C12',7e6,8e6,'v','T'],['C30E2B',8e6,7e6,'R','a'],['BDFED1',8e6,7e6,'U','a'],['9810DD',7e6,8e6,'a','T'],['4DEC5A',6.671e6,6.771e6,'T','v'],['82BCA1',8e6,7e6,'R','T'],['4D97CC',7e6,8e6,'R','U'],['29F6CD',8e6,7e6,'F','v'],['DCFBE7',7e6,8e6,'T','K'],['7EC464',8e6,7e6,'v','T'],['E1173A',7e6,8e6,'a','T']];
 for(const[id,R1,R2,...keys]of orbitCases){const a=orbit(R1),b=orbit(R2);compare(id,a,b,keys);near(a.a*a.R,a.v*a.v);near(a.U,-2*a.K);near(b.U,-2*b.K);assert.ok(a.U<0&&b.U<0);}
 const s=spring(2,50);compare('DF724F',s,spring(2,200),['f','v']);compare('9A460B',s,spring(2,200),['T','v']);compare('4C8BE1',s,spring(8,50),['f','v']);compare('0F00EB',s,spring(2,12.5),['f','v']);compare('A9B584',s,spring(2,12.5),['T','v']);
 compare('E53EF5',slope(2),slope(5),['t','a']);compare('3968B6',slope(3),slope(1),['a','work']);compare('D8368D',slope(2),slope(1),['a','gravity']);
 for(const beta of [0,rad(12),rad(25)]){compare('1FCB02',pull(3,beta),pull(1,beta),['work','mu']);compare('B66331',pull(2,beta),pull(3,beta),['T','mu']);}compare('FB0F2E',pull(1),pull(2),['work','mu']);
 compare('589E07',phase(5),phase(8),['p','U']);compare('010677',phase(5),phase(8),['a','K']);compare('D443B8',phase(5),phase(8),['a','p']);compare('8E5337',phase(5),phase(8),['a','p']);compare('9D3F89',phase(8),phase(5),['a','K']);
 const floatCases=[['E2791B',900,1000,'F','h'],['10BE25',1000,800,'mass','F'],['4835D0',800,1000,'weight','h'],['E7DBDE',800,1000,'mass','h'],['45DEC1',1000,900,'weight','h'],['6AAD61',1000,800,'weight','h'],['9A5739',1000,1080,'h','F'],['FA548D',800,1000,'weight','F'],['8247AC',1000,900,'F','h']];
 for(const[id,rho1,rho2,...keys]of floatCases)compare(id,float(.4,rho1),float(.4,rho2),keys);
 compare('CCDA00',float(.4,1000),float(.4,1000),['h','F']);const h1=.4/(400*.01),h2=.4/(600*.01);assert.ok(h2<h1);near(400*h1/1000,600*h2/1000);
 compare('72E162',float(.4,1000,.01),float(.4,1000,.005),['F','mass']);
 const h=projectile(5,0,3);compare('CA81AC',h,projectile(5,0,3,1),['t','a']);compare('7D94CC',h,projectile(2,0,3),['L','a']);compare('AE87C1',h,projectile(5,0,6),['t','L']);compare('C89B35',h,projectile(5,0,6),['L','v']);compare('EC2538',h,projectile(10,0,3,1),['L','t']);compare('6F893A',h,projectile(10,0,3,4),['L','a']);
 const ob=projectile(10,25);compare('D84519',ob,projectile(15,25),['L','a']);compare('A5CD6A',ob,projectile(5,25),['H','a']);compare('32F41D',projectile(10,20),projectile(10,30),['L','t']);compare('ACF9A7',projectile(10,20),projectile(10,30),['H','t']);
 const disk=w=>[w*w*.2,3*g];verify('FCA2F2',disk(1),disk(2));
 verify('8FD6CF',[2*g*Math.cos(rad(15)),.6],[2*g*Math.cos(rad(25)),.6]);assert.ok(Math.tan(rad(25))<.6);
 const pendulum=rho=>[Math.sqrt(g/.7)/(2*Math.PI),rho*.00001*g*.7*(1-Math.cos(rad(4)))];verify('AEDF70',pendulum(7800),pendulum(2700));
 verify('A843B2',[0,50],[Math.sqrt(50/2)*.12,50]);
 const extension=2*g/50,z=.1;verify('C357C5',[50*extension**2/2,2*g*1],[50*(extension-z)**2/2,2*g*(1+z)]);assert.ok(extension>z);near(50*((extension-z)**2-extension**2)/2+2*g*z,50*z*z/2);
 verify('9A9FD1',[70*5,70*g*100],[70*5,70*g*90]);verify('A2C161',[2000*2**2/2,1000*g*1.5],[2000*2**2/2,1000*g*1.5]);
 verify('C0AFE6',[1000,340/1000],[1000,5000/1000]);verify('95206E',[340,1000],[5000,1000]);
 const cube=d=>[101325+1000*g*d,7800*.001*g-1000*.001*g];verify('07E032',cube(.8),cube(.4));
 assert.deepEqual([...checked].sort(),Object.keys(records).sort());
 for(const r of Object.values(records)){assert.ok(r.solution.length>1000,r.id);assert.ok(r.solution.includes('Проверка.'),r.id);assert.ok(!r.solution.includes('/'),r.id);assert.equal(r.stages.length,3);for(const label of r.pair)assert.ok(r.solution.includes(label),r.id);assert.ok(r.solution.includes('Ответ: '+r.answer+'.'),r.id);}
 return true;
}
module.exports={verifyPhysics};
