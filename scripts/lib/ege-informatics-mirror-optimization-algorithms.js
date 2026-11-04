'use strict';
const assert=require('node:assert/strict');
function solve(d,m){
  const a=d.columns[0],n=a.length;assert.equal(n,d.N);const kind=m.kind;
  if(kind==='peak-triple'){
    const tree=new Float64Array(2003);tree.fill(-Infinity);let low=Infinity,best=-Infinity;
    function get(i){let v=-Infinity;for(;i>0;i-=i&-i)v=Math.max(v,tree[i]);return v;}
    function put(i,v){for(;i<tree.length;i+=i&-i)tree[i]=Math.max(tree[i],v);}
    for(const raw of a){const x=m.sign*raw,rank=1001-x;best=Math.max(best,get(rank-1)-x);if(low<x)put(rank,2*x-low);low=Math.min(low,x);}
    assert.ok(Number.isFinite(best));return {answer:String(best)};
  }
  if(kind==='gap-pair'||kind==='gap-triple'){
    const k=d.K,maximum=!m.operation.startsWith('min-'),product=m.operation.endsWith('product'),empty=maximum?-Infinity:Infinity;
    const better=maximum?Math.max:Math.min,one=new Float64Array(n),two=new Float64Array(n);two.fill(empty);let best=empty;
    for(let i=0;i<n;i++){
      one[i]=i?better(one[i-1],a[i]):a[i];
      if(i)two[i]=two[i-1];
      if(i>=k){const pair=product?one[i-k]*a[i]:one[i-k]+a[i];two[i]=better(two[i],pair);
        if(kind==='gap-pair')best=better(best,pair);
        else if(Number.isFinite(two[i-k])){
          if(product){const v=BigInt(two[i-k])*BigInt(a[i]);if(best===empty||(maximum?v>best:v<best))best=v;}
          else best=better(best,two[i-k]+a[i]);
        }
      }
    }
    assert.ok(typeof best==='bigint'||Number.isFinite(best));return {answer:String(best)};
  }
  if(kind==='block-difference'){
    let first1=-Infinity,first2=-Infinity,second1=-Infinity,second2=-Infinity,best=-Infinity;
    for(const raw of a){const x=raw*m.direction;
      const newSecond2=Math.max(second1,second2)-x,newSecond1=first2-x,newFirst2=Math.max(first1,first2)+x;
      first1=x;first2=newFirst2;second1=newSecond1;second2=newSecond2;best=Math.max(best,second2);
    }
    assert.ok(Number.isFinite(best));return {answer:String(best)};
  }
  if(kind==='longest-signed-parity'){
    const p=new Float64Array(n+1),indices=new Uint32Array(n+1);
    for(let i=0;i<n;i++)p[i+1]=p[i]+m.sign*a[i];for(let i=0;i<=n;i++)indices[i]=i;
    indices.sort((i,j)=>p[i]-p[j]||i-j);const first=[Infinity,Infinity];let best=0;
    for(let start=0;start<=n;){let end=start+1;while(end<=n&&p[indices[end]]===p[indices[start]])end++;
      for(let at=start;at<end;at++){const j=indices[at],parity=((p[j]%2)+2)%2;best=Math.max(best,j-first[parity^m.parity]);}
      for(let at=start;at<end;at++){const j=indices[at],parity=((p[j]%2)+2)%2;first[parity]=Math.min(first[parity],j);}
      start=end;
    }
    assert.ok(best>0);return {answer:String(best)};
  }
  if(kind==='max-divisible-subarray'){
    const mod=m.modulus,first=Array(mod).fill(null),last=Array(mod).fill(null);first[0]=last[0]=[0,0];let p=0;
    for(let i=0;i<n;i++){p+=a[i];const r=p%mod;if(first[r]===null)first[r]=[p,i+1];last[r]=[p,i+1];}
    let best=-1,length=Infinity;
    for(let r=0;r<mod;r++)if(first[r]&&last[r][1]>first[r][1]){const v=last[r][0]-first[r][0],l=last[r][1]-first[r][1];if(v>best||v===best&&l<length){best=v;length=l;}}
    assert.ok(best>=0);return {answer:String(length),sum:best};
  }
  if(kind==='linear-cost'||kind==='radius-containers'){
    const weights=Float64Array.from(d.columns[1],v=>Math.floor((v+m.capacity-1)/m.capacity));
    if(kind==='linear-cost'){
      let cost=0n,total=0;for(let i=0;i<n;i++){total+=weights[i];cost+=BigInt(weights[i])*BigInt(a[i]-a[0]);}
      let best=cost,left=weights[0];for(let i=1;i<n;i++){cost+=BigInt(2*left-total)*BigInt(a[i]-a[i-1]);if(cost<best)best=cost;left+=weights[i];}
      return {answer:String(best)};
    }
    const prefix=new Float64Array(n+1);for(let i=0;i<n;i++)prefix[i+1]=prefix[i]+weights[i];
    function lower(x){let lo=0,hi=n;while(lo<hi){const mid=(lo+hi)>>>1;if(a[mid]<x)lo=mid+1;else hi=mid;}return lo;}
    let best=0;for(let i=0;i<n;i++)best=Math.max(best,prefix[lower(a[i]+d.M+1)]-prefix[lower(a[i]-d.M)]);
    return {answer:String(best)};
  }
  if(kind==='circular-cost'){
    const weight=new BigInt64Array(2*n+1),weightedIndex=new BigInt64Array(2*n+1),half=Math.floor(n/2);
    for(let i=0;i<2*n;i++){weight[i+1]=weight[i]+BigInt(a[i%n]);weightedIndex[i+1]=weightedIndex[i]+BigInt(a[i%n])*BigInt(i);}
    let best=null;
    for(let s=0;s<n;s++){
      const split=s+half+1,end=s+n;
      const cw=weightedIndex[split]-weightedIndex[s]-BigInt(s)*(weight[split]-weight[s]);
      const ccw=BigInt(n+s)*(weight[end]-weight[split])-(weightedIndex[end]-weightedIndex[split]);
      const cost=cw+ccw;if(best===null||cost<best)best=cost;
    }
    return {answer:String(best)};
  }
  if(kind==='choose-triples'){
    const k=m.modulus;let dp=new Float64Array(k);dp.fill(-Infinity);dp[0]=0;
    for(let i=0;i<n;i++){const next=new Float64Array(k);next.fill(-Infinity);
      for(const col of d.columns){const x=col[i],rem=x%k;for(let r=0;r<k;r++){const q=(r+rem)%k;if(dp[r]+x>next[q])next[q]=dp[r]+x;}}
      dp=next;
    }
    let best=-Infinity;for(let r=1;r<k;r++)best=Math.max(best,dp[r]);assert.ok(Number.isFinite(best));return {answer:String(best)};
  }
  throw Error(kind);
}
module.exports={solve};
