const assert=require('node:assert/strict');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 const {records}=require('./physics-electro-changes');
 const code=(a,b)=>Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b))?'3':b>a?'1':'2';
 const tested=new Set();
 function check(id,before,after){assert.equal(before.length,2);assert.equal(after.length,2);assert.equal(before.map((v,i)=>code(v,after[i])).join(''),records[id].answer,id);tested.add(id);}
 // These numerical experiments solve the physical systems; input scenarios and
 // quantities are specified independently from the solution prose and answers.
 const magnet=(m,q,B,v)=>{const R=m*v/(Math.abs(q)*B),a=v*v/R,F=m*a,T=2*Math.PI*R/v;return{R,a,F,T,nu:1/T,K:m*v*v/2,p:m*v,v,B};};
 function mc(id,b,a,keys){const b0=magnet(...b),a0=magnet(...a);check(id,keys.map(k=>b0[k]),keys.map(k=>a0[k]));close(b0.F,Math.abs(b[1])*b[2]*b[3]);close(a0.F,Math.abs(a[1])*a[2]*a[3]);}
 for(const[id,v1,v2,keys]of[
 ['528B03',2,4,['v','T']],['C46A08',2,4,['F','T']],['0FEA75',2,4,['a','T']],
 ['A37A23',2,4,['K','T']],['9D8D5D',4,2,['R','F']],['03E4CA',4,2,['a','nu']],
 ['CA0BC0',4,2,['R','T']],['8E92C4',2,4,['F','a']],['D1609A',4,2,['a','nu']],
 ['E9F3EC',4,2,['a','nu']],['82F3EF',2,4,['R','T']],['002C8D',2,4,['F','T']],['650D8F',4,2,['a','R']]
 ])mc(id,[3,2,5,v1],[3,2,5,v2],keys);
 mc('D4F2FC',[4,2,1,1],[1,1,1,2],['F','nu']);
 mc('7CC600',[1,1,1,2],[4,2,1,1],['B','v']);close(magnet(1,1,1,2).K,magnet(4,2,1,1).K);close(magnet(1,1,1,2).R,magnet(4,2,1,1).R);
 mc('711C0E',[3,2,5,4],[3,4,5,4],['R','T']);
 mc('EC82B0',[1,1,1,2],[4,2,1,2],['F','nu']);
 mc('94201B',[3,2,4,5],[3,2,2,5],['F','nu']);
 mc('93B3C2',[1,1,1,4],[4,2,1,2],['T','p']);close(magnet(1,1,1,4).R,magnet(4,2,1,2).R);
 mc('3C759F',[23,1,2,3],[39,1,2,3],['F','R']);
 mc('3872E7',[1,1,1,4],[4,2,2,4],['B','F']);close(magnet(1,1,1,4).R,magnet(4,2,2,4).R);
 // Electric trajectory integrated with constant acceleration; horizontal transit
 // fixes time, independently of increasing length of the curved trajectory.
 const ep=E=>{const m=2,q=3,vx=5,length=7,t=length/vx,ay=q*E/m,vy=ay*t,v=Math.hypot(vx,vy);return{a:ay,t,v,p:m*v,K:m*v*v/2};};
 for(const[id,e1,e2,keys]of[['63AADC',2,4,['p','a']],['C6E09F',4,2,['K','t']],['2A12EF',2,4,['v','t']]]){const a=ep(e1),b=ep(e2);check(id,keys.map(k=>a[k]),keys.map(k=>b[k]));}
 // U=12 V, lengths in metres and areas in m² (illustrative values only).
 const wire=(rho,l,S,series=0)=>{const R=rho*l/S+series,I=12/R;return{R,I,P:I*I*R};};
 for(const[id,b,a,keys]of[
 ['30094E',[2,3,1],[2,6,1],['I','P']],['DC1A18',[2,4,1],[2,2,1],['R','I']],
 ['B4322C',[2,3,1],[2,3,2],['R','I']],['168D9E',[2,3,1],[2,3,2],['R','I']],
 ['702A57',[2,3,Math.PI],[2,3,4*Math.PI],['I','R']],['D2D031',[2,3,1],[4,3,1],['R','P']],
 ['6F61BB',[2,3,1,5],[4,3,1,5],['R','I']]
 ]){const x=wire(...b),y=wire(...a);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 const bat=R=>{const E=12,r=2,I=E/(R+r);return{I,U:I*R,P:I*I*r,R:R+r,E};};
 for(const[id,keys]of[['4F4C06',['I','U']],['0E5ADA',['U','P']],['1C751F',['R','E']]]){const a=bat(4),b=bat(8);check(id,keys.map(k=>a[k]),keys.map(k=>b[k]));}
 const cap=(C,Q,d=2)=>({C,Q,U:Q/C,W:Q*Q/(2*C),E:Q/(C*d)});
 for(const[id,b,a,keys]of[
 ['B00D03',[2,8],[6,8],['C','U']],['8BE80E',[2,8],[6,24],['C','Q']],
 ['0A241B',[6,24],[2,8],['E','W']],['8BD8D1',[2,8],[2,4],['C','U']],
 ['1122AB',[6,24],[2,8],['Q','U']],['53FE8C',[2,8],[6,8],['Q','C']],['E5D68D',[2,4],[2,8],['C','W']]
 ]){const x=cap(...b),y=cap(...a);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 const osc=(L,C)=>{const omega=Math.sqrt(1/(L*C)),nu=omega/(2*Math.PI),T=1/nu;return{nu,T,lambda:3e8/nu};};
 for(const[id,b,a,keys]of[
 ['861E71',[3,2],[3,8],['T','lambda']],['D268B8',[3,8],[3,2],['T','lambda']],
 ['A038B3',[3,1/2],[3,1/8],['T','lambda']],['EE34BA',[3,2],[3,8],['nu','lambda']],
 ['5A8394',[3,2],[3,8],['nu','lambda']],['B76DEA',[8,3],[2,3],['T','lambda']],['A598E9',[3,1/8],[3,1/2],['nu','lambda']]
 ]){const x=osc(...b),y=osc(...a);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 // Dimensionless c=1 and frequency=2 avoid absolute small-wavelength tolerances.
 const light=n=>({n,v:1/n,nu:2,T:.5,lambda:1/(2*n)});
 for(const[id,n1,n2,keys]of[
 ['B3C07E',1,1.5,['nu','lambda']],['8156B1',1,1.47,['nu','v']],['BA1ACE',1,1.44,['nu','v']],
 ['B90D33',1,1.4,['nu','v']],['67A636',1,1.47,['T','lambda']],['4697D8',1.5,1,['lambda','v']],['91331A',1.5,1.5,['n','v']]
 ]){const x=light(n1),y=light(n2);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 check('5C450A',[2,Math.asin(2*light(1.33).lambda/2)],[2,Math.asin(2*light(1.2).lambda/2)]);
 const lens=d=>{const F=2,f=1/(1/F-1/d);return{f,D:1/F,h:f/d};};
 for(const[id,b,a,keys]of[['AFC008',6,8,['f','D']],['138A15',3,2.5,['h','D']],['CEEE60',3,4,['f','D']]]){const x=lens(b),y=lens(a);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 // Solve circuit node voltages and branch powers, including open/short states.
 const mixed=R3=>{const U=12,R1=4,R2=4,Rp=R3===0?0:1/(1/R2+1/R3),I=U/(R1+Rp);return{U1:I*R1,U2:U-I*R1,P:I*I*R1+(Rp?I*I*Rp:0)};};
 check('7E024D',[mixed(4).U2,mixed(4).P],[mixed(0).U2,mixed(0).P]);
 check('269B40',[mixed(4).U1,mixed(4).P],[mixed(8).U1,mixed(8).P]);
 const switched=pos=>{const U=12,R1=2,R2=4,R3=4,R=R2+(pos===1?R1:pos===3?R3:0),I=U/R;return{I,U1:pos===1?I*R1:0,U2:I*R2,U3:pos===3?I*R3:0,P:I*I*R};};
 for(const[id,p1,p2,keys]of[['A607F9',2,3,['I','U2']],['F42473',1,3,['U2','P']],['7AE5D6',1,2,['I','P']],['5C2075',1,2,['U1','P']],['90722B',1,3,['I','U3']]]){const x=switched(p1),y=switched(p2);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 check('844877',[0,12*12/4],[12*2/6,12*12/6]);
 const Rp=1/(1/4+1/6);check('D166D5',[12/2,12*12/2],[12/(2+Rp),12*12/(2+Rp)]);
 const series=R2=>{const I=12/(3+R2);return{I,U2:I*R2,P:12*I,P1:I*I*3};};
 for(const[id,r1,r2,keys]of[['B8EBA2',2,4,['I','U2']],['FE3FC0',4,2,['I','P']],['0D3361',2,4,['I','P1']]]){const x=series(r1),y=series(r2);check(id,keys.map(k=>x[k]),keys.map(k=>y[k]));}
 assert.equal(tested.size,71);assert.deepEqual([...tested].sort(),Object.keys(records).sort());
 for(const r of Object.values(records)){assert.match(r.answer,/^[123]{2}$/);assert.ok(r.solution.length>1000,r.id);assert.ok(r.solution.includes('Проверка.'),r.id);assert.ok(!r.solution.includes('/'),r.id);assert.equal(r.pair.length,2);}
 return true;
}
module.exports={verifyPhysics};
