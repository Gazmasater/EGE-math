'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const sha=b=>createHash('sha256').update(b).digest('hex');
function select(a,m){const n=a.length,f=a.map(x=>a.reduce((s,y)=>s+(x===y),0)),min=Math.min(...a),max=Math.max(...a),sum=a.reduce((s,x)=>s+x,0),squares=a.reduce((s,x)=>s+BigInt(x)**2n,0n),single=a.filter((x,i)=>f[i]===1),repeat=a.filter((x,i)=>f[i]>1),u=single.reduce((s,x)=>s+x,0),r=repeat.reduce((s,x)=>s+x,0),distinct=f.every(x=>x===1),k=m.kind;
 if(k==='extremes-square')return BigInt(min+max)**2n>squares-BigInt(min)**2n-BigInt(max)**2n;
 if(k==='max-square'){const others=[...a];others.splice(others.indexOf(max),1);return BigInt(max)**2n>2n*BigInt(others[0])*BigInt(others[1]);}
 if(k==='distinct-twice-extreme-sum-le')return distinct&&3*(min+max)<=sum;
 if(k==='distinct-triple-extreme-sum-ge')return distinct&&5*(min+max)>=2*sum;
 if(k==='distinct-extreme-product'){const others=[...a];others.splice(others.indexOf(min),1);others.splice(others.indexOf(max),1);return distinct&&3n*BigInt(min)*BigInt(max)<=2n*others.reduce((s,x)=>s*BigInt(x),1n);}
 if(k.startsWith('quad-')){if(2*max>=sum)return false;const eq=a[0]+a[1]===a[2]+a[3]||a[0]+a[2]===a[1]+a[3]||a[0]+a[3]===a[1]+a[2];return {'quad-equal-pairs':eq,'quad-no-equal-pairs':!eq,'quad-one-pair':f.filter(x=>x===2).length===2&&single.length===2,'quad-distinct':distinct}[k];}
 if(k.startsWith('two-pairs-')){if(f.filter(x=>x===2).length!==4||single.length!==3)return false;switch(k){case 'two-pairs-single-mean-gt':return 7*r<4*sum;case 'two-pairs-max-single':return single.includes(max);case 'two-pairs-mean-lt-max-single':return single.some(x=>4*x>r);case 'two-pairs-single-mean-le-all':return 4*u<=3*r;}}
 if(k.startsWith('triple-')){if(f.filter(x=>x===3).length!==3||single.length!==n-3)return false;switch(k){case 'triple-square':return repeat.reduce((s,x)=>s+BigInt(x)**2n,0n)>single.reduce((s,x)=>s+BigInt(x)**2n,0n);case 'triple-not-extreme':return single.some(x=>x<repeat[0])&&single.some(x=>x>repeat[0]);case 'triple-single-mean-ge':return 3*u>=4*r;}}
 throw Error(k);
}
function gcd(a,b){a=a<0n?-a:a;while(b)[a,b]=[b,a%b];return a;}
function frac(n,d=1n){const g=gcd(n,d);return [n/g,d/g];}
function number(v){const s=String(v),parts=s.split('.');assert.ok(!s.includes('e'));return frac(BigInt(parts.join('')),10n**BigInt(parts[1]?.length||0));}
const add=(a,b)=>frac(a[0]*b[1]+b[0]*a[1],a[1]*b[1]),sub=(a,b)=>frac(a[0]*b[1]-b[0]*a[1],a[1]*b[1]),divide=(a,n)=>frac(a[0],a[1]*BigInt(n)),cmp=(a,b)=>a[0]*b[1]<b[0]*a[1]?-1:a[0]*b[1]>b[0]*a[1]?1:0,sum=a=>a.reduce(add,[0n,1n]),max=a=>a.reduce((x,y)=>cmp(x,y)>0?x:y),min=a=>a.reduce((x,y)=>cmp(x,y)<0?x:y),iso=s=>s.includes('-')?s:s.split('.').reverse().join('-');
function temperature(rows,m){
const points=[],selected=[];let value,answer,winners=[];
 if(m.hours){
  const months=m.months||[m.month],columns=m.hours.map(h=>rows[0].indexOf(String(h).padStart(2,'0')+':00:00'));assert.ok(columns.every(c=>c>0));
  for(let i=1;i<rows.length;i++){const date=iso(rows[i][0]);if(!months.includes(Number(date.slice(5,7))))continue;const v=columns.map(c=>number(rows[i][c]));for(const c of columns)selected.push({row:i+1,column:c+1,value:rows[i][c]});let metric;
   if(m.kind==='delta'||m.kind==='day')metric=m.direction===1?sub(v[1],v[0]):sub(v[0],v[1]);else if(m.kind==='daily-mean')metric=divide(sum(v),v.length);else metric=null;points.push({date,values:v,metric});}
  if(m.kind==='maximum-minus-mean'){const values=points.flatMap(p=>p.values);value=sub(max(values),divide(sum(values),values.length));}
  else{value=(m.minimum?min:max)(points.map(x=>x.metric));winners=points.filter(x=>cmp(x.metric,value)===0).map(x=>x.date).sort();}
  answer=m.kind==='day'?Number(winners[0].slice(-2)):Number(value[0]/value[1]);
 }else{
  const groups=m.months.map((month,j)=>{const c=m.column??m.columns[j],v=[];for(let i=1;i<rows.length;i++)if(Number(iso(rows[i][0]).slice(5,7))===month){v.push(number(rows[i][c]));selected.push({row:i+1,column:c+1,value:rows[i][c]});}return v;});value=m.kind==='monthly-extremes'?sub(max(groups[0]),min(groups[1])):sub(divide(sum(groups[0]),groups[0].length),divide(sum(groups[1]),groups[1].length));answer=Number(value[0]/value[1]);
 }
 return {answer:String(answer),value:{numerator:String(value[0]),denominator:String(value[1])},selectedCells:selected,winningDates:winners};
}
function solve(sheets,m){
 const nonempty=Object.values(sheets).filter(a=>a.length);assert.equal(nonempty.length,1);const rows=nonempty[0];
 if(m.width){const indices=[];rows.forEach((a,i)=>{assert.equal(a.length,m.width);assert.ok(a.every(x=>Number.isSafeInteger(x)&&x>0));if(select(a,m))indices.push(i+1);});assert.ok(indices.length);return {answer:String(m.select==='first-index'?indices[0]:indices.length),rows:rows.length,indices};}
 assert.ok(rows.length>1);const columns=m.hours?m.hours.map(h=>h+1):(m.columns||[m.column]);for(const a of rows.slice(1))assert.ok(columns.every(c=>typeof a[c]==='number'&&Number.isFinite(a[c])),'missing numeric temperature');
 return temperature(rows,m);
}
const root=path.resolve(__dirname,'../..'),results=new Map();
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text');assert.equal(conditionText(task.fragment),data.condition,'changed condition');
 const models=require('../data/ege-informatics-mirror-spreadsheets-models.json');assert.deepEqual(data.model,models[task.id],'changed model');
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,[data.url],'changed attachment');assert.match(data.url,/^\/fipi\/ege-informatics\/docs\/restored-spreadsheets\/EGEINF[A-F\d]{6}\.ods$/u);
 const file=path.join(root,data.url.slice(1).replace(/^fipi\//u,'fipi-assets/')),bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256,'changed file');
 const key=data.fileSha256+JSON.stringify(data.model);if(!results.has(key)){
  const sheets=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-mirror-spreadsheets.py')],{input:bytes,encoding:'utf8',timeout:60000,maxBuffer:15*1024*1024}));results.set(key,solve(sheets,data.model));
 }
 const result=results.get(key);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={select,solve,temperature,compute};
