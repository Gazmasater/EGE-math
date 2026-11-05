'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
// These two unchanged 327EB5 files also serve a radius task. Only their
// reviewed headers may contain an unused field in the linear-cost task.
const reviewedLinearHeaders={
  '42a2f968e5c870317a40f7a894bc7c07b2645cd0cd0651f0dea6d09620b63575':[100,113],
  '4f87d4686feb08ec16a14feaad68144124af1c6ea946d40700232a7e97aa8131':[1200000,12013]
};
function parse(bytes,model,reviewedHeader){
  if(reviewedHeader!==undefined){
    assert.equal(model.kind,'linear-cost','reviewed header requires linear cost');
    const expected=reviewedLinearHeaders[createHash('sha256').update(bytes).digest('hex')];
    assert.ok(expected,'unreviewed file header');
    assert.deepEqual(reviewedHeader,expected,'changed reviewed header');
    assert.deepEqual(bytes.subarray(0,bytes.indexOf(10)).toString().trim().split(/\s+/).map(Number),expected);
  }
  let at=0;
  function next(){while(at<bytes.length&&bytes[at]<=32)at++;assert.ok(at<bytes.length,'missing integer');let sign=1;if(bytes[at]===45){sign=-1;at++;}let v=0,digits=0;while(at<bytes.length&&bytes[at]>=48&&bytes[at]<=57){v=v*10+bytes[at++]-48;digits++;}assert.ok(digits&&Number.isSafeInteger(v));assert.ok(at===bytes.length||bytes[at]<=32);return sign*v;}
  let N,K,M;if(model.kind.startsWith('gap-')){K=next();N=next();}else{N=next();if(model.kind==='radius-containers')M=next();}
  if(reviewedHeader!==undefined)assert.deepEqual([N,next()],reviewedHeader);
  assert.ok(N>=1&&N<=10000000);const width=['linear-cost','radius-containers'].includes(model.kind)?2:model.kind==='choose-triples'?3:1;
  const columns=Array.from({length:width},()=>new Float64Array(N));
  for(let i=0;i<N;i++)for(const column of columns)column[i]=next();while(at<bytes.length&&bytes[at]<=32)at++;assert.equal(at,bytes.length);
  return {N,...(K===undefined?{}:{K}),...(M===undefined?{}:{M}),columns};
}
function verifyWitness(data,model,e){
  const a=data.columns[0];
  if(e.indices){const indices=e.indices.map(x=>x-1);assert.deepEqual(indices.map(i=>a[i]),e.values);for(let j=1;j<indices.length;j++)assert.ok(indices[j]>indices[j-1]);
    if(e.K)for(let j=1;j<indices.length;j++)assert.ok(indices[j]-indices[j-1]>=e.K);
    let value;if(model.kind==='peak-triple'){assert.ok(model.sign*a[indices[0]]<model.sign*a[indices[1]]&&model.sign*a[indices[2]]<model.sign*a[indices[1]]);value=BigInt(model.sign)*(2n*BigInt(a[indices[1]])-BigInt(a[indices[0]])-BigInt(a[indices[2]]));}
    else value=model.operation.endsWith('product')?e.values.reduce((s,v)=>s*BigInt(v),1n):e.values.reduce((s,v)=>s+BigInt(v),0n);
    assert.equal(String(value),String(e.answer));
  }
  if(e.range){const [l,r]=e.range;let sum=0;for(let i=l-1;i<r;i++)sum+=a[i];assert.equal(sum,e.sum);assert.equal(r-l+1,e.answer);if(model.kind==='longest-signed-parity')assert.ok(sum*model.sign>0&&((sum%2)+2)%2===model.parity);else assert.equal(sum%model.modulus,0);}
  if(e.L){let left=0,right=0;for(let i=e.L-1;i<e.M;i++)left+=a[i];for(let i=e.M;i<e.R;i++)right+=a[i];assert.equal(left,e.leftSum);assert.equal(right,e.rightSum);assert.equal(model.direction*(left-right),e.answer);assert.ok(e.L<e.M&&e.M<e.R-1);}
}

module.exports={parse,verifyWitness};
