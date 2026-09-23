const assert=require('node:assert/strict');
const close=(a,b,label='')=>assert.ok(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${label}: ${a} ≠ ${b}`);
function verifyPhysics() {
  const done=[];const check=(id,fn)=>{fn();done.push(id);};
  check('7D75F6',()=>{
    const m=2,k=200,v=1,F=20,A=F/k;
    close(A,.1);close(k*A*A/2,m*v*v/2);close(k*A,F);close(v*Math.sqrt(k*m),F);
  });
  check('CCDEE7',()=>{
    const m=2,k=200,A=.1,v=1,omega=Math.sqrt(k/m);
    close(m*v*v/2,k*A*A/2);close(v,A*omega);close(omega,10);
    for(let n=0;n<=80;n++){const phase=n*Math.PI/40,x=A*Math.cos(phase),u=-A*omega*Math.sin(phase);close(m*u*u/2+k*x*x/2,1);assert.ok(Math.abs(u)<=v+1e-12);}
  });
  check('23085B',()=>{
    const k=200,A=.2,T=1.6,t=.6,x=-.142,omega=2*Math.PI/T,m=k/omega**2,g=10,delta=m*g/k;
    const K=k*(A*A-x*x)/2;close(K,1.9836);assert.ok(Math.abs(K-2)<.02);
    const phase=omega*t,v=-A*omega*Math.sin(phase);close(m*v*v/2,2);close(phase,3*Math.PI/4);
    const times=[0,.2,.4,.6,.8,1,1.2,1.4,1.6,1.8],xs=[.2,.142,0,-.142,-.2,-.142,0,.142,.2,.142];
    for(let n=0;n<times.length;n++)assert.ok(Math.abs(A*Math.cos(omega*times[n])-xs[n])<.001);
    for(const displacement of [-.2,-.142,0,.142,.2]){
      close(k*(delta+displacement)**2/2-m*g*displacement-k*delta*delta/2,k*displacement**2/2);
      close(m*g-k*(delta+displacement),-k*displacement);
    }
    assert.ok(m*g-k*(delta+x)>0,'Выше равновесия ускорение вниз');
  });
  check('F717A0',()=>{
    for(const k of [20,100])for(const S of [.01,.05])for(const x0 of [.01,.1]){
      const p0=100000,m=2,p1=p0-k*x0/S;assert.ok(p1>0&&p1<p0);
      close(p0*S-p1*S-k*x0,0);assert.ok(p0*S-p0*S-k*x0<0,'При открытии первая сила влево');
      close(p0*S-p0*S-k*0,0);
      const omega=Math.sqrt(k/m);
      for(let n=0;n<=60;n++){const phase=n*Math.PI/30,x=x0*Math.cos(phase),v=-x0*omega*Math.sin(phase),a=-omega*omega*x;close(m*a,-k*x);close(m*v*v/2+k*x*x/2,k*x0*x0/2);assert.ok(-.1*v*v<=0);}
      assert.ok(-x0*omega<0,'Первое прохождение нового равновесия — со скоростью влево');
    }
  });
  check('963FCF',()=>{
    const L=.010,R=1,B=1,l=.10,W=8e-6,v=.4,I=B*l*v/R;
    close(I,.04);close(L*I*I/2,W);close(R/(B*l)*Math.sqrt(2*W/L),v);close(B*I*l,.004);
    close(B*I*l*v,I*I*R,'Работа движущей силы и джоулевы потери в установившемся режиме');
  });
  assert.deepEqual(done.sort(),Object.keys(require('./waves-catalog.json')).sort(),'Проверены все пять моделей');
  return done;
}
module.exports={verifyPhysics};
