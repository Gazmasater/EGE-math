'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {conditionText}=require('../../lib/seo-text'),{auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function reverse(d,target=null){
 const cache=new Map(),n=d.n;
 function rec(r,c){const key=r*n+c;if(cache.has(key))return cache.get(key);
  if(target&&r===target[0]&&c===target[1])return [d.grid[r][c],d.grid[r][c],1];
  const children=[];if(!d.rightWalls[r][c])children.push(rec(r,c+1));if(!d.downWalls[r][c])children.push(rec(r+1,c));
  let result;if(!children.length)result=target?null:[d.grid[r][c],d.grid[r][c],1];
  else{const valid=children.filter(Boolean);result=valid.length?[d.grid[r][c]+Math.min(...valid.map(x=>x[0])),d.grid[r][c]+Math.max(...valid.map(x=>x[1])),valid.reduce((s,x)=>s+x[2],0)]:null;}
  cache.set(key,result);return result;
 }return rec(0,0);
}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');assert.ok(condition.includes('сначала максимальную сумму, затем минимальную'));
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url],'changed primary file URL');
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary data file');
 const decoded=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-robot-grid.py'),file],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024}));
 for(const key of ['n','sheet','grid','rightWalls','downWalls','oneSidedBorders'])assert.deepEqual(decoded[key],data[key],'changed original grid '+key);
 const v=reverse(decoded);assert.equal(`${v[1]} ${v[0]}`,data.answer,'answer');assert.equal(v[2],data.paths);assert.ok(Number.isSafeInteger(v[2]));
 for(let r=0;r<data.n;r++)for(let c=0;c<data.n;c++){const q=reverse(decoded,[r,c]);assert.equal(q?.[0]??null,data.low[r][c],'changed cell minimum');assert.equal(q?.[1]??null,data.high[r][c],'changed cell maximum');}
 const terminals=[];for(let r=0;r<data.n;r++)for(let c=0;c<data.n;c++)if(decoded.rightWalls[r][c]&&decoded.downWalls[r][c]){const q=reverse(decoded,[r,c]);terminals.push({row:r,col:c,cell:String.fromCharCode(65+c)+String(r+1),minimum:q?.[0]??null,maximum:q?.[1]??null,paths:q?.[2]??0});}
 assert.deepEqual(terminals,data.terminals,'changed terminal cells');
 for(const [key,sum] of [['maximumRoute',v[1]],['minimumRoute',v[0]]]){
  const route=data[key];assert.equal(route[0].row,0);assert.equal(route[0].col,0);let total=0;
  route.forEach((x,i)=>{assert.equal(x.cell,String.fromCharCode(65+x.col)+String(x.row+1));assert.equal(x.coin,decoded.grid[x.row][x.col]);total+=x.coin;
   if(i){const p=route[i-1];assert.ok(x.row===p.row&&x.col===p.col+1&&!decoded.rightWalls[p.row][p.col]||x.row===p.row+1&&x.col===p.col&&!decoded.downWalls[p.row][p.col],'route crosses wall');}
  });const end=route.at(-1);assert.ok(decoded.rightWalls[end.row][end.col]&&decoded.downWalls[end.row][end.col]);assert.equal(total,sum,'route sum');
 }
 return{answer:data.answer,kind:'grid-with-walls',cells:data.n*data.n,terminals:terminals.length,paths:v[2]};
}
module.exports={reverse,compute,auditPrimaryImage};
