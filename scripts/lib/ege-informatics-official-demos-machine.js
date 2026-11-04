'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),{conditionText}=require(root+'/lib/seo-text'),hash=b=>createHash('sha256').update(b).digest('hex'),sum=a=>a.reduce((x,y)=>x+y,0);
function spreadsheet(rows,year){
 assert.ok([2024,2025,2026].includes(year));const width=year===2025?6:7;let hits=[];
 for(const [i,row] of rows.entries()){
  assert.ok(row.length===width&&row.every(x=>Number.isSafeInteger(x)&&x>0));const sorted=[...row].sort((a,b)=>a-b),runs=[];
  for(let j=0;j<width;){let k=j+1;while(k<width&&sorted[k]===sorted[j])k++;runs.push([sorted[j],k-j]);j=k;}
  const shape=runs.map(x=>x[1]).sort().join(','),target=year===2025?'1,1,1,3':year===2024?'1,1,1,2,2':'1,1,1,1,3';if(shape!==target)continue;
  const repeated=sum(runs.filter(x=>x[1]>1).map(([x,n])=>x*n)),single=sum(runs.filter(x=>x[1]===1).map(x=>x[0]));
  if(year===2025?repeated>single:year===2024?3*repeated<4*single:3*single<=4*repeated)hits.push(i+1);
 }
 assert.ok(year!==2026||hits.length);return {answer:String(year===2026?sum(rows[hits.at(-1)-1]):hits.length),rows:rows.length,hitRows:hits};
}
function sequence(a,year){
 assert.ok([2025,2026].includes(year)&&a.length>=2&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=100000));let minimum=Infinity;
 for(const x of a)if(year===2025||String(x).length===2)minimum=Math.min(minimum,x);assert.ok(Number.isFinite(minimum));let largest=0,hits=[];
 for(let i=1;i<a.length;i++){
  const x=a[i-1],y=a[i];const valid=year===2025?[x,y].some(v=>v-16*Math.floor(v/16)===minimum):[x,y].filter(v=>String(v).length===2).length===1&&(x+y)%minimum===0;
  if(valid){hits.push(i);largest=Math.max(largest,x+y);}
 }
 return {answer:hits.length+' '+largest,minimum,hitIndices:hits};
}
function string(s,letter,wanted,minimumPatterns=0){
 assert.ok(Number.isInteger(wanted)&&wanted>0);let left=0,count=0,patterns=0,best=0,start=null,end=null;
 for(let right=0;right<s.length;right++){
  if(s[right]===letter)count++;
  if(right>=3&&right-3>=left&&s.startsWith('2025',right-3))patterns++;
  while(count>wanted){if(s[left]===letter)count--;if(left+3<=right&&s.startsWith('2025',left))patterns--;left++;}
  if(count===wanted&&patterns>=minimumPatterns&&right-left+1>best){best=right-left+1;start=left;end=right+1;}
 }
 return {answer:String(best),length:s.length,start,end,windowSha256:hash(start===null?'':s.slice(start,end))};
}
function boxes(a,gap=3){
 assert.ok(Number.isInteger(gap)&&gap>=1&&a.length>=1&&a.length<=10000&&a.every(x=>Number.isInteger(x)&&x>0&&x<=10000));const present=new Set(a),maximum=Math.max(...a),dp=new Int32Array(maximum+gap+2);let length=0,smallest=0;
 for(let x=maximum;x>=1;x--){const candidate=present.has(x)?1+dp[x+gap]:0;dp[x]=Math.max(candidate,dp[x+1]);if(candidate>length){length=candidate;smallest=x;}}
 return {answer:length+' '+smallest,records:a.length};
}
function document(paragraphs,year){
 assert.ok([2025,2026].includes(year));const needle=year===2025?'по':'рук',chapters=year===2025?['XII','XIV']:['XIII','XIV','XV'];
 if(year===2025){assert.equal(paragraphs.filter(x=>x.trim()==='Том 2').length,1);const start=paragraphs.indexOf('ЧАСТЬ ТРЕТЬЯ');assert.ok(start>=0);const end=paragraphs.findIndex((x,i)=>i>start&&/^ЧАСТЬ /.test(x));assert.ok(end>start);paragraphs=paragraphs.slice(start+1,end);}
 const fragments=chapters.map(ch=>{const matches=paragraphs.flatMap((x,i)=>x.trim()===ch?[i]:[]);assert.equal(matches.length,1);const start=matches[0],end=paragraphs.findIndex((x,i)=>i>start&&/^[IVX]+$/.test(x.trim()));assert.ok(end>start);return paragraphs.slice(start+1,end).join('\n');});
 let all=0,whole=0,lower=0,upper=0;const positions=[];
 for(const [chapter,s]of fragments.entries())for(let i=0;i<=s.length-needle.length;i++){
  const found=s.slice(i,i+needle.length);if(found!==needle&&found!==needle[0].toUpperCase()+needle.slice(1))continue;all++;
  const letter=c=>!!c&&/\p{L}/u.test(c),join=c=>['-','‐','‑'].includes(c);let a=i,b=i+needle.length;
  while(a>0&&(letter(s[a-1])||(join(s[a-1])&&letter(s[a-2]))))a--;
  while(b<s.length&&(letter(s[b])||(join(s[b])&&letter(s[b+1]))))b++;
  if(a===i&&b===i+needle.length)whole++;else{positions.push({chapter:chapters[chapter],offset:i});if(found===needle)lower++;else upper++;}
 }
 return {answer:String(positions.length),all,whole,lower,upper,chapters,positions,selectionSha256:hash(fragments.join('\n'))};
}
const cache=new Map();
function compute(task,data,readFile=fs.readFileSync){
 assert.equal(conditionText(task.fragment),data.condition);const urls=[...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(x=>x[1]);assert.deepEqual(urls,data.files.map(x=>x.url));assert.equal(data.files.length,1);
 const f=data.files[0];assert.match(f.url,/^\/fipi\/ege-informatics\/docs\/official-open\/20\d{2}\/EGEINF[A-F\d]{6}\.(ods|odt|txt)$/);const bytes=readFile(path.join(root,'fipi-assets',f.url.slice('/fipi/'.length)));assert.equal(hash(bytes),f.sha256,'changed attachment');
 const key=JSON.stringify([data.mode,data.year,f.sha256]);let result=cache.get(key);
 if(!result){
  if(data.mode==='spreadsheet'){
   const script="import runpy,io,json,sys; m=runpy.run_path(sys.argv[1]); print(json.dumps(m['read_ods'](io.BytesIO(sys.stdin.buffer.read()))))";
   const sheets=Object.values(JSON.parse(execFileSync('python3',['-c',script,path.join(__dirname,'read-ege-informatics-database-ods.py')],{input:bytes,encoding:'utf8',maxBuffer:16000000}))).filter(x=>x.length);assert.equal(sheets.length,1);result=spreadsheet(sheets[0],data.year);
  }else if(data.mode==='document'){
   const parsed=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-odt.py')],{input:bytes,encoding:'utf8',maxBuffer:16000000}));assert.equal(parsed.notes,0);result=document(parsed.paragraphs,data.year);
  }else if(data.mode==='sequence')result=sequence(bytes.toString('utf8').trim().split(/\s+/).map(Number),data.year);
  else if(data.mode==='string'){
   const s=bytes.toString('utf8').trim();assert.ok(s.length<=10000000);assert.match(s,data.year===2024?/^[TUVWXYZ]+$/:/^[A-Z\d]+$/);result=string(s,data.year===2024?'T':'Y',data.year===2024?100:80,data.year===2024?0:90);
  }else if(data.mode==='boxes'){const a=bytes.toString('utf8').trim().split(/\s+/).map(Number),n=a.shift();assert.equal(n,a.length);result=boxes(a);}
  else throw Error('Unknown mode');
  cache.set(key,result);
 }
 assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={spreadsheet,sequence,string,boxes,document,compute};
