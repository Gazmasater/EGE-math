'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const sha=b=>createHash('sha256').update(b).digest('hex');
function cell(r,c){let s='';for(c++;c;c=Math.floor((c-1)/26))s=String.fromCharCode(65+(c-1)%26)+s;return s+(r+1);}
function modelFromCondition(s){const finish=s.includes('«угловых»')?'corners':'bottom-right';const order=s.includes('сначала минимальную сумму, затем максимальную')?'min-max':s.includes('сначала максимальную сумму, затем минимальную')?'max-min':null;assert.ok(order,'unknown answer order');return {finish,order};}
function solve(d,model){
 assert.ok(['corners','bottom-right'].includes(model.finish));assert.ok(['min-max','max-min'].includes(model.order));const n=d.n;assert.ok(n>1&&n<30);
 for(const k of ['grid','rightWalls','downWalls'])assert.ok(d[k].length===n&&d[k].every(r=>r.length===n));
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){assert.ok(Number.isInteger(d.grid[r][c])&&d.grid[r][c]>0);assert.equal(typeof d.rightWalls[r][c],'boolean');assert.equal(typeof d.downWalls[r][c],'boolean');if(c===n-1)assert.ok(d.rightWalls[r][c]);if(r===n-1)assert.ok(d.downWalls[r][c]);}
 const matrix=v=>Array.from({length:n},()=>Array(n).fill(v)),low=matrix(null),high=matrix(null),pathsByCell=matrix(0),pl=matrix(null),ph=matrix(null);low[0][0]=high[0][0]=d.grid[0][0];pathsByCell[0][0]=1;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  if(!r&&!c)continue;const parents=[];
  if(c&&!d.rightWalls[r][c-1]&&pathsByCell[r][c-1])parents.push([r,c-1]);if(r&&!d.downWalls[r-1][c]&&pathsByCell[r-1][c])parents.push([r-1,c]);if(!parents.length)continue;
  let lo=parents[0],hi=parents[0];for(const a of parents){if(low[a[0]][a[1]]<low[lo[0]][lo[1]])lo=a;if(high[a[0]][a[1]]>high[hi[0]][hi[1]])hi=a;pathsByCell[r][c]+=pathsByCell[a[0]][a[1]];}
  assert.ok(Number.isSafeInteger(pathsByCell[r][c]));low[r][c]=d.grid[r][c]+low[lo[0]][lo[1]];high[r][c]=d.grid[r][c]+high[hi[0]][hi[1]];pl[r][c]=lo;ph[r][c]=hi;
 }
 const terminals=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(d.rightWalls[r][c]&&d.downWalls[r][c]&&(model.finish==='corners'||r===n-1&&c===n-1))terminals.push({row:r,col:c,cell:cell(r,c),minimum:low[r][c],maximum:high[r][c],paths:pathsByCell[r][c]});
 const valid=terminals.filter(t=>t.paths);assert.ok(valid.length,'no allowed finish is reachable');let a=valid[0],b=valid[0];for(const t of valid){if(t.minimum<a.minimum)a=t;if(t.maximum>b.maximum)b=t;}
 const minimum=a.minimum,maximum=b.maximum,paths=valid.reduce((s,t)=>s+t.paths,0);assert.ok(Number.isSafeInteger(paths));
 function route(t,prev){let r=t.row,c=t.col;const out=[];for(;;){out.push({row:r,col:c,cell:cell(r,c),coin:d.grid[r][c]});if(!r&&!c)break;[r,c]=prev[r][c];}return out.reverse();}
 return {n,model:{...model},answer:model.order==='min-max'?`${minimum} ${maximum}`:`${maximum} ${minimum}`,minimum,maximum,low,high,pathsByCell,paths,terminals,minimumRoute:route(a,pl),maximumRoute:route(b,ph),reachableCells:pathsByCell.flat().filter(Boolean).length,internalWalls:d.rightWalls.reduce((s,row)=>s+row.slice(0,-1).filter(Boolean).length,0)+d.downWalls.slice(0,-1).flat().filter(Boolean).length};
}
const root=path.resolve(__dirname,'../..'),parsed=new Map(),results=new Map();
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text');const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed condition');const model=modelFromCondition(condition);assert.deepEqual(model,data.model,'changed finish or order');
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,[data.url],'changed attachment');assert.match(data.url,/^\/fipi\/ege-informatics\/docs\/restored-robot\/EGEINF[A-F\d]{6}\.ods$/u);
 const file=path.join(root,data.url.slice(1).replace(/^fipi\//u,'fipi-assets/')),bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256,'changed file');
 if(!parsed.has(data.fileSha256))parsed.set(data.fileSha256,JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-mirror-robot.py')],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:3*1024*1024})));
 const grid=parsed.get(data.fileSha256);assert.ok(grid.grid.flat().every(v=>v<=100),'data violates primary coin bound');if(condition.includes('N < 26'))assert.ok(grid.n<26);
 for(const k of ['n','grid','rightWalls','downWalls'])assert.deepEqual(grid[k],data.grid[k],'changed grid '+k);
 const key=data.fileSha256+JSON.stringify(model);if(!results.has(key))results.set(key,solve(grid,model));const result=results.get(key);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={cell,modelFromCondition,solve,compute};
