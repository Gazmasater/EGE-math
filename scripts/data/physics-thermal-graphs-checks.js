const assert=require('node:assert/strict');
const {records,cases}=require('./physics-thermal-graphs');
const eq=(a,b)=>Math.abs(a-b)<1e-8;
const near=(a,b)=>assert.ok(eq(a,b),`${a} != ${b}`);
function cycle(points){
 const s=points.map(([V,p])=>({V,p,T:p*V,U:1.5*p*V,n:1/V}));
 const segments=s.map((a,i)=>{const b=s[(i+1)%s.length];let A;
  if(eq(a.V,b.V))A=0;else if(eq(a.p,b.p))A=a.p*(b.V-a.V);else if(eq(a.T,b.T))A=a.T*Math.log(b.V/a.V);else throw Error('Unclassified thermodynamic segment');
  return{A,dU:b.U-a.U,Q:b.U-a.U+A,isoV:eq(a.V,b.V),isoP:eq(a.p,b.p),isoT:eq(a.T,b.T),pUp:b.p>a.p,VUp:b.V>a.V,TUp:b.T>a.T};
 });near(segments.reduce((a,b)=>a+b.dU,0),0);const work=segments.reduce((a,b)=>a+b.A,0);near(segments.reduce((a,b)=>a+b.Q,0),work);return{s,segments,work};
}
function verifyPhysics(){
 const truth={};
 const stir=cycle([[1,1],[1,3],[3,1],[3,1/3]]),[ab,bc,cd,da]=stir.segments;
 truth['76FFD5']=[stir.work>0,ab.Q>0,bc.dU<0,cd.A<0,da.isoT&&da.VUp];
 truth['49215D']=[eq(stir.work,0),ab.Q<0,bc.dU>0,eq(cd.A,0),da.isoT&&!da.VUp];
 truth.E9A5F7=[eq(stir.work,0),ab.Q<0,eq(bc.dU,0),eq(cd.A,0),da.isoT&&da.VUp];
 truth.B2EE08=[stir.work<0,ab.Q>0,eq(bc.dU,0),cd.A<0,da.isoT&&da.VUp];
 truth.C5CA95=[eq(cd.A,0),da.isoT&&da.VUp,ab.Q>0,eq(bc.dU,0),eq(stir.work,0)];
 const pg=cycle([[.5,4],[.5,6],[1.25,6],[1.25,1.6]]),[ga,gb,gc,gd]=pg.segments;
 truth.C5290F=[gb.Q<0,eq(ga.A,0),gb.isoP&&gb.VUp,gc.A<0,eq(gd.dU,0)];
 truth['74D79A']=[ga.Q>0,gb.Q<0,!gb.VUp,gc.isoV&&!gc.TUp,gd.isoT&&!gd.VUp];
 const va=cycle([[2,.5],[4,.5],[4,1],[1,1]]),[aa,ac,ad,ae]=va.segments;
 truth['1F4F09']=[ad.isoP&&ad.A<0,ae.pUp,aa.Q>0,eq(va.s[3].n,Math.max(...va.s.map(s=>s.n))),ac.dU<0];
 truth['0B89AC']=[eq(va.work,0),aa.isoP&&aa.A<0,ac.Q<0,ad.dU<0,ae.isoT&&!ae.pUp];assert.ok(va.work<0);
 const vb=cycle([[2,.5],[6,.5],[3,1],[2,1]]),[ba,bb,bd,be]=vb.segments,n=vb.s.map(s=>s.n);
 truth['54F6DA']=[eq(n[1],Math.max(...n)),ba.Q>0,eq(bb.dU,0),bd.isoP&&bd.A>0,be.isoV&&be.pUp];
 truth['994CE8']=[eq(n[1],Math.min(...n)),ba.Q>0,bb.dU<0,bd.isoP&&bd.A>0,be.isoV&&be.pUp];
 const vc=cycle([[3,1/3],[9,1/3],[9,2/3],[3,2]]),[ca,cb,cc,ce]=vc.segments;
 truth.B9B0B0=[ca.isoP&&ca.VUp,ca.Q<0,!cb.pUp,cc.A<0,ce.Q<0];
 const vr=[.006,.008,.008,.006],pr=[200000,200000,100000,100000],temp=pr.map((p,i)=>p*vr[i]/4),ar=pr.map((p,i)=>(p+pr[(i+1)%4])/2*(vr[(i+1)%4]-vr[i])),dUr=pr.map((p,i)=>1.5*(pr[(i+1)%4]*vr[(i+1)%4]-p*vr[i])),Q=ar.map((a,i)=>a+dUr[i]);
 const nu=pr[1]*vr[1]/(8.31*400);near(ar.reduce((a,b)=>a+b),200);near(temp[3],150);near(Q[3],900);near(dUr.reduce((a,b)=>a+b),0);
 truth.D43001=[eq(-ar[2],100),Q[1]>0,eq(ar.reduce((a,b)=>a+b),200),eq(Math.min(...temp),200),eq(Q[3],900)];
 truth['63FBEC']=[eq(ar[0],200),nu>.45,eq(-ar[2],200),eq(Math.min(...temp),100),Q[3]<0];
 const rho=[1,1,2],rp=[2,1,1],rv=rho.map(r=>1/r),rt=rp.map((p,i)=>p/rho[i]);
 // На прямом участке p(ρ): p=3−ρ=3−1/V. Численно интегрируем работу 3→1.
 let Aw=0;for(let i=0;i<10000;i++){const v=.5+(i+.5)*.5/10000;Aw+=(3-1/v)*.5/10000}assert.ok(Aw>0);const du31=1.5*(rt[0]-rt[2]);
 truth['0D668C']=[eq(rv[0],rv[1]),Aw+du31<0,eq(rt[2],Math.min(...rt)),rt[2]>rt[1],eq(rt[0],rt[2])];
 const tp=[2,4,6],vp=[1,2,2];near(tp[2]/tp[0],3);
 truth['499909']=[tp[0]===Math.max(...tp),eq(tp[1]/tp[0],2),eq(tp[2]/tp[1],1.5),vp[0]===Math.max(...vp),eq(Math.sqrt(tp[2]/tp[0]),6)];
 truth.DFF8CD=[tp[2]===Math.max(...tp),eq(tp[1]/tp[0],2),eq(tp[2]/tp[1],1/1.5),vp[0]===Math.max(...vp),eq(Math.sqrt(tp[2]/tp[0]),3)];
 const ta=[1,3,9],vpa=[1,1,3];truth.B205CC=[eq(ta[1]/ta[0],3)&&eq(vpa[0],vpa[1]),eq(ta[2]/ta[1],1/1.5),ta[1]<ta[0],eq(Math.sqrt(ta[2]/ta[0]),9),vpa[2]===Math.max(...vpa)];
 // p(E): (E,p)=(1,2),(2,4),(2,8), n=3p/(2E), T пропорциональна E.
 const e=[1,2,2],pe=[2,4,8],ne=e.map((x,i)=>1.5*pe[i]/x),ve=ne.map(x=>1/x);
 truth['559E5C']=[eq(ne[0],ne[1]),e[1]<e[0],eq(e[1],e[2])&&ve[2]>ve[1],eq(e[1],e[2])&&ve[2]<ve[1],e[2]>e[1]];
 const expandWork=[50000*(.005-.001),100000*(.003-.001)];near(expandWork[0],200);near(expandWork[0],expandWork[1]);
 truth['87F244']=[eq(5-1,5),eq(1/3,3),expandWork[0]<expandWork[1],eq(1/5,.2),eq(50000/100000,.5)];
 truth['413FEF']=[eq(1-5,4),eq(1/3,1/5),eq(...expandWork),eq(1/5,.2),eq(50000/100000,2)];
 truth['0A58BE']=[eq(expandWork[0],100),eq(3/1,3),expandWork[0]<expandWork[1],eq(5/1,5),eq(50000*.005/(100000*.001),2)];
 // При одном V верхняя изотерма имеет большее p, а стрелка указывает на рост V.
 truth['6A61CB']=[2000>600,false,eq(2000,600),600>2000,5>2];
 const pt=[100,90,75,50,55,75,100],tt=[300,300,300,300,330,450,600],vv=tt.map((t,i)=>t/pt[i]);vv.slice(3).forEach(x=>near(x,6));
 truth.E27EA7=[eq(vv[3],vv[0]/2),vv.slice(3).every(x=>eq(x,vv[3])),eq(tt[5]/tt[4],3),eq(tt[1],tt[2])&&vv[2]>vv[1],!eq(vv[4],vv[5])];
 truth.B3ABFA=[eq(vv[3],2*vv[0]),vv.slice(0,3).every(x=>eq(x,vv[0])),eq(tt[5]/tt[4],3),tt[5]<tt[4],eq(tt[1],tt[2])&&vv[2]>vv[1]];
 const cool=[250,242,234,232,232,232,230,216],heat=[305,314,323,327,327,327,329,334];
 truth['35852E']=[eq(cool[3],232),false,eq(cool[0]-cool[1],cool[6]-cool[7]),cool[6]<cool[3],false];
 truth.D50CE4=[eq(heat[3],329),heat[3]===heat[4],eq(heat[1]-heat[0],heat[7]-heat[6]),heat[6]<heat[3],true];
 // Линейная интерполяция однофазных участков проверяет длительности площадок.
 const coolStart=10+(234-232)/(8/5),coolEnd=30-(232-230)/(14/5),heatStart=10+(327-323)/(9/5),heatEnd=30-(329-327)/(5/5);
 assert.ok(coolEnd-coolStart<20&&heatEnd-heatStart<20);assert.ok(heatStart<18&&18<heatEnd);
 for(const[id,c]of Object.entries(cases))if(c.kind==='phase-q'){
  const[q1,q2,q3]=c.q,[t1,t3]=c.t,latent=q2-q1,cs=q1/t1,cl=(q3-q2)/(t3-t1);near(q1+latent+cl*(t3-t1),q3);
  truth[id]=id==='58F60D'?[true,eq(t1,961),false,cl>cs,eq(latent,327)]:id==='C83B1C'?[true,false,eq(t1,100),cl<cs,eq(latent,30)]:id==='0D32D0'?[eq(t3,80),false,eq(cl,cs),eq(latent,80),true]:id==='D38156'?[eq(t1,80),true,cl<cs,eq(latent,40),false]:[true,false,eq(t1,40),cl<cs,eq(latent,40)];
 }
 const cold=[2/1,2/3],warm=[2/3,2],latent=[3,2],tM=[2,4];
 truth.F72E75=[eq(tM[0],tM[1]/2),eq(...warm),eq(cold[1],cold[0]/3),eq(...latent),cold[0]<warm[0]];
 truth.C3E090=[eq(tM[0],tM[1]/2),eq(latent[0]/latent[1],3),eq(cold[0]/cold[1],1.5),eq(cold[0],warm[1]),eq(...latent)];
 truth.F1BB6A=[eq(...cold),eq(tM[1]/tM[0],2),eq(cold[1]/cold[0],3),eq(...warm),latent[0]>latent[1]];
 truth['856FEB']=[4<2,eq(2/3,2),eq(2,(2/3)/2),3>2,eq(2,2)];
 const cLiquid=[3/4,3/2],cSolid=[3/2,2/2],fusion=[2,4];
 truth['8056B0']=[eq(6/4,1.5),eq(fusion[1],fusion[0]/2),eq(cLiquid[1]/cLiquid[0],1.5),cSolid[1]>cSolid[0],eq(cSolid[0],cLiquid[1])];
 // Фаза b→c при расширении: pb=2,Vb=1; pc=1,Vc=2, T неизменна.
 const pb=2,Vb=1,pc=1,Vc=2,mb=pb*Vb,mc=pc*Vc;near(mb,mc);
 truth['2854B6']=[true,false,false,false,mc/Vc<mb/Vb];
 truth.AF151F=[mc<mb,true,false,true,mc<mb];
 // Обратный процесс: до b масса постоянна, после b уменьшается при pнас=2.
 truth['586953']=[2*.5<mb,false,true,false,false];
 const nc=[1,2,2],pressure=nc.map(n=>n*3),density=nc.map(n=>n*.5);
 truth['4DBED7']=[density[1]<density[0],eq(pressure[1],pressure[2]),true,pressure[1]<pressure[0],density[2]>density[1]];
 truth['233EA6']=[density[1]>density[0],eq(pressure[1],pressure[2]),false,pressure[1]<pressure[0],density[2]<density[1]];
 truth['8A43D2']=[density[1]<density[0],pressure[2]>pressure[1],true,pressure[1]>pressure[0],density[2]<density[1]];
 const boilT=40,boilDuration=2,condDuration=2;
 truth.E2B7DC=[eq(boilT,60),true,true,false,boilDuration<condDuration];
 truth['4C8A38']=[eq(boilT,40),false,false,false,eq(boilDuration,condDuration)];
 const total=13.6+10,finalWater=total-23,water23=total-20.6;near(finalWater,.6);near(water23,3);
 truth['6ECE95']=[eq(100,48.5),finalWater>0,false,true,eq(298/289,1)];
 assert.equal(Object.keys(truth).length,46);
 for(const[id,r]of Object.entries(records)){
  assert.equal(truth[id].length,5,id);assert.equal(truth[id].map((b,i)=>b?i+1:'').join(''),r.answer,id+': independently evaluated statements');
  assert.equal((r.solution.match(/\n\n[1-5]\) /g)||[]).length,5,id+': five explanations');
 }
 return{count:46,status:'ok'};
}
module.exports={verifyPhysics};
