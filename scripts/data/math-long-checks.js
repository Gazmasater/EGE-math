const assert=require('node:assert/strict');
const near=(a,b,e=1e-7)=>Math.abs(a-b)<e;
function unique(xs){return xs.filter(Number.isFinite).filter((x,i,a)=>!a.slice(0,i).some(y=>near(x,y)));}
function quadratic(A,B,C){if(near(A,0,1e-12))return near(B,0,1e-12)?[]:[-C/B];const D=B*B-4*A*C;if(D< -1e-10)return[];if(Math.abs(D)<1e-10)return[-B/(2*A)];return[(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)];}
const parameterCases={
 '4B165E':{original:(x,a)=>(x*x-x)*a*a-(x**4-x**3-x+1)*a-x**3+x*x,factors:(x,a)=>(x-1)*(a-x*x)*(a*x+1),roots:a=>[1,...quadratic(1,0,-a),...quadratic(0,a,1)],accept:a=>(a<=0&&a!==-1)||a===1},
 'E76FF5':{original:(x,a)=>(x*x-x)*a*a+(x**4-x**3-x+1)*a-x**3+x*x,factors:(x,a)=>(x-1)*(a+x*x)*(a*x-1),roots:a=>[1,...quadratic(1,0,a),...quadratic(0,a,-1)],accept:a=>a===-1||(a>=0&&a!==1)},
 '5F6C59':{original:(x,a)=>(x+1)*a*a+x*(x+1)**2*a+x**4+2*x**3-2*x-1,factors:(x,a)=>(x+1)*(a+x+1)*(a+x*x-1),roots:a=>[-1,-a-1,...quadratic(1,0,a-1)],accept:a=>a===0||a>1},
 'AEA2CF':{original:(x,a)=>(x-2)*a*a+(x**3-x*x-4)*a+x**4-4*x*x,factors:(x,a)=>(x-2)*(a+x*x)*(a+x+2),roots:a=>[2,-a-2,...quadratic(1,0,a)],accept:a=>a===-4||a>0},
 'FD16D2':{original:(x,a)=>(x-1)*a*a-(x**3-2*x*x+3*x-2)*a-x**4+3*x**3-2*x*x,factors:(x,a)=>(x-1)*(a-x*x)*(a+x-2),roots:a=>[1,2-a,...quadratic(1,0,-a)],accept:a=>a<0||a===1},
 '8F4718':{original:(x,a)=>a*x**4-2*x**3+(a**3-a)*x*x-(2*a*a-2)*x+a*x**3-2*x*x+(a**3-a)*x-2*a*a+2,factors:(x,a)=>(x+1)*(a*x-2)*(x*x+a*a-1),roots:a=>[-1,...quadratic(0,a,-2),...quadratic(1,0,a*a-1)],accept:a=>a===0||(Math.abs(a)>1&&a!==-2)},
 'F7E0EA':{original:(x,a)=>x**4-x**3-3*x*x-x+a*(x+1)*x-3*x**3+3*x*x+9*x+3-3*a*(x+1),factors:(x,a)=>(x-3)*(x+1)*(x*x-2*x+a-1),roots:a=>[3,-1,...quadratic(1,-2,a-1)],accept:a=>a===-2||a>2}
};
const boundary=[-6,-4,-3,-2,-1,-2/Math.sqrt(11),-.6,0,1,2,3,25/8,4,6];
const parameters=unique([...Array.from({length:2001},(_,i)=>(i-1000)/100),...boundary.flatMap(a=>[a-1e-5,a,a+1e-5])]);
function verifyParameters(id){
 const d=parameterCases[id];
 if(d){for(const a of parameters){for(const x of [-3,-1.7,0,1,2.4,6])assert.ok(Math.abs(d.original(x,a)-d.factors(x,a))<1e-7,`${id}: factorization`);const roots=unique(d.roots(a));assert.equal(roots.length===2,d.accept(a),`${id}: a=${a}, roots=${roots}`);for(const x of roots)assert.ok(Math.abs(d.original(x,a))<1e-5*(1+Math.abs(x)**4),`${id}: substitution`);}return;}
 for(const a of parameters){
  if(id==='073F98'||id==='577658'){
   // Решаем квадратные уравнения на обеих полуосях, без использования линейных формул решения.
   const sign=id==='073F98'?-1:1;
   const roots=unique([...quadratic(-2,sign*a-3*sign+9,a*a-6*a).filter(x=>x>=0),...quadratic(-2,sign*a-3*sign-9,a*a-6*a).filter(x=>x<0)]);
   const four=a>0&&a<6&&a!==2&&a!==4;assert.equal(id==='073F98'?roots.length===4:roots.length<4,id==='073F98'?four:!four,`${id} a=${a}`);
  }else if(id==='162563'||id==='831474'){
   const m=id==='162563'?2:3,c=m+1,bad=m===2?2:3;
   const roots=unique(quadratic(m*m,0,-a*a).filter(x=>Math.abs((x+c)**2-a*a)>1e-8));assert.equal(roots.length===2,![0,bad,-bad,6,-6].includes(a),`${id} a=${a}`);
  }else if(id==='45927B'||id==='D5A8E6'){
   const first=id==='45927B',pairs=[...quadratic(a,first?2*a:a+2,first?6-a:3*a+1).map(y=>[1,y]),...quadratic(first?2*a:a,first?5:2*a,first?1:2*a+3).map(x=>[x,first?x:1])];
   const distinct=pairs.filter((p,i)=>!pairs.slice(0,i).some(q=>near(p[0],q[0])&&near(p[1],q[1])));
   const accept=first?((a<0&&a!==-3)||(a>3&&a<25/8)):(a> -2/Math.sqrt(11)&&a<0&&a!==-.6);
   assert.equal(distinct.length===4,accept,`${id} a=${a}: ${JSON.stringify(distinct)}`);
   for(const[x,y]of distinct){const value=first?a*x*x+a*y*y-(2*a-5)*x+2*a*y+1:a*x*x+a*y*y+2*a*x+(a+2)*y+1;assert.ok(Math.abs(value)<1e-6*(1+x*x+y*y));}
  }else throw Error('Unknown parameter '+id);
 }
}
const log=(x,b)=>Math.log(x)/Math.log(b);
const inequalities={
 '481BB0':{domain:x=>x>1,value:x=>3**log(log(x,3),3)+log(x,9)**2-8,accept:x=>x>1&&x<=81},
 '62BFA4':{domain:x=>x>1,value:x=>2**log(log(x,2),2)+log(x,4)**2-3,accept:x=>x>1&&x<=4},
 '4E8757':{domain:x=>x>1,value:x=>3**log(2**x-2,3)+4**x-18,accept:x=>x>1&&x<=2},
 'B0D5E7':{domain:x=>x<2,value:x=>-(3**log(25-5**x,3)+25**x-45),accept:x=>x>=1&&x<2},
 'CC3F47':{domain:x=>Math.abs(x)<2,value:x=>-(3**log(4-x*x,3)+x**4-10),accept:x=>Math.abs(x)>=Math.sqrt(3)&&Math.abs(x)<2},
 '5E53DB':{domain:x=>x!==1,value:x=>-(x*x+4*x-5)/log(.2*5**x,3),accept:x=>x>=-5&&x!==1},
 '41D348':{domain:x=>x!==0,value:x=>(9**x-4*3**x+3)/log(2**x,5),accept:x=>x<=1&&x!==0},
 'CB6359':{domain:x=>x<6||x>7,value:x=>7*log(x*x-13*x+42,12)-8-log((x-7)**7/(x-6),12),accept:x=>(x>=-6&&x<6)||(x>7&&x<=18)}
};
function verifyInequality(id){const d=inequalities[id],bounds=[-6,-5,-2,-Math.sqrt(3),0,1,Math.sqrt(3),2,4,6,7,18,81];for(const x of [...Array.from({length:6501},(_,i)=>i/50-30),...bounds.flatMap(x=>[x-1e-5,x,x+1e-5])]){const ok=d.domain(x)&&d.value(x)<=1e-9;assert.equal(ok,d.accept(x),`${id}: x=${x} value=${d.domain(x)?d.value(x):'undefined'}`);}}
function verifyNumbers(id){
 if(id==='0FB969'){const sums=[];for(let u=0;u<=4;u++)for(let v=0;v<=9;v++)sums.push(7*u+22*v);const differences=unique(sums.map(s=>Math.abs(226-2*s)));assert.ok(differences.includes(8));assert.ok(!differences.includes(0));assert.equal(Math.min(...differences.filter(Boolean)),6);}
 else if(id==='2B4308'||id==='D8F724'){const sugar=id==='2B4308'?1:3,other=4-sugar,ratios=[];for(let n=1;n<=12;n++)for(let heavyS=0;heavyS<=sugar*n;heavyS++)for(let heavyO=0;heavyO<=other*n;heavyO++){const S=20*sugar*n+40*heavyS,T=20*other*n+40*heavyO;ratios.push(S/(S+T));}assert.equal(Math.min(...ratios),sugar===1?.1:.5);assert.equal(Math.max(...ratios),sugar===1?.5:.9);assert.ok(ratios.includes(sugar===1?.2:.8));assert.ok(!ratios.includes(sugar===1?.6:.4));}
 else if(id==='34A218'){const counts=new Set();for(let u=0;u<=1;u++)for(let v=0;v<=12;v++){const w=132-111*u-11*v;if(w>=0)counts.add(3*u+2*v+w);}assert.ok(counts.has(60));assert.ok(!counts.has(80));assert.equal(counts.size,14);}
 else if(id==='4B81D5'){const sums=[];for(let u=0;u<=12;u++)for(let v=0;v<=16;v++)for(let w=0;w<=25;w++){const z=50-4*u-3*v-2*w;if(z>=0)sums.push(1111*u+111*v+11*w+z);}assert.ok(sums.includes(113));assert.ok(!sums.includes(114));assert.equal(Math.max(...sums.filter(s=>s<10000)),9554);}
 else if(id==='7F366B'){let[a,b]=[1,3];for(let i=0;i<3;i++)[a,b]=[a+b,2*a+b];assert.deepEqual([a,b],[22,31]);for(let b=2;b<=150;b++)for(let a=1;a<b;a++){const c=3*a+2*b,d=4*a+3*b;assert.ok(c*3>d*2&&c*7<d*5);assert.equal(3*c-2*d,a);assert.equal(3*d-4*c,b);}assert.ok(7/12<2/3);assert.equal(5*10>7*7,true);}
 else if(id==='A65127'){let min=Infinity,max=0;for(let n=4;n<=100;n++)for(let k=2;k<=n-2;k++){const s=5*n+11*k;if(s%n===0)min=Math.min(min,n);if(s>=n*(n-1)/2)max=Math.max(max,n);}assert.equal(min,11);assert.equal(max,31);assert.equal(29*16+2*5,29*30/2+39);assert.equal(2*16+9*5,11*7);}
 else if(id==='C009C4'){const sums=new Set();for(let u=0;u<=16;u++)for(let v=0;v<=29;v++)sums.add(2*u+5*v);assert.ok(sums.has(175));assert.ok(!sums.has(176));for(let n=0;n<=3;n++){const possible=new Set([...sums].flatMap(x=>Array.from({length:n+1},(_,i)=>x+i)));assert.equal(Array.from({length:180},(_,i)=>i+1).every(x=>possible.has(x)),n===3);}}
 else if(id==='D3C577'){const valid=[];for(let n=11;n<=26;n++)for(let g=0;g<=n;g++)if(100*g<=21*n)valid.push({n,g,q:100*(g+1)/(n+1)});assert.ok(valid.some(v=>v.g===5));assert.ok(!valid.some(v=>v.q===30));assert.equal(Math.max(...valid.filter(v=>Number.isInteger(v.q)).map(v=>v.q)),25);}
 else throw Error('Unknown number task '+id);
}
const parameterIds=new Set([...Object.keys(parameterCases),'073F98','577658','162563','831474','45927B','D5A8E6']);
function verifyLong(r){if(parameterIds.has(r.id))verifyParameters(r.id);else if(inequalities[r.id])verifyInequality(r.id);else verifyNumbers(r.id);}
module.exports={verifyLong};
