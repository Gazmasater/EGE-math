'use strict';
const assert=require('node:assert/strict');
function expr(source){
 const tokens=source.match(/\s*(?:"[^"]*"|'[^']*'|\d+|[A-Za-z_]\w*|\/\/|==|!=|>=|<=|[%+<>(),-])/g)?.map(x=>x.trim())||[];
 assert.equal(tokens.join(''),source.replace(/\s/g,''),'unrecognized expression '+source);let p=0;
 function atom(){let t=tokens[p++];if(t==='-')return{op:'neg',x:atom()};if(t==='('){const x=compare();assert.equal(tokens[p++],')');return x;}if(/^\d+$/.test(t))return{value:Number(t)};if(/^["']/.test(t))return{value:t.slice(1,-1)};assert.match(t,/^[A-Za-z_]\w*$/);if(tokens[p]!=='(')return{name:t};p++;const args=[];if(tokens[p]!==')'){do{args.push(compare());if(tokens[p]!==',')break;p++;}while(true);}assert.equal(tokens[p++],')');assert.ok(['input','int','range'].includes(t));return{call:t,args};}
 function product(){let x=atom();while(['%','//'].includes(tokens[p])){const op=tokens[p++];x={op,a:x,b:atom()};}return x;}
 function sum(){let x=product();while(['+','-'].includes(tokens[p])){const op=tokens[p++];x={op,a:x,b:product()};}return x;}
 function compare(){let x=sum();if(['==','!=','>=','<=','>','<'].includes(tokens[p])){const op=tokens[p++];x={op,a:x,b:sum()};}return x;}
 const x=compare();assert.equal(p,tokens.length);return x;
}
function parse(code){
 const lines=code.trimEnd().split('\n').map(raw=>({raw,indent:raw.length-raw.trimStart().length,text:raw.trim()}));let i=0;
 function block(indent){const nodes=[];while(i<lines.length&&lines[i].indent===indent&&lines[i].text!=='else:'){
  const l=lines[i++];let n,m;if((m=l.text.match(/^(if|while) (.*):$/))){n={type:m[1],condition:expr(m[2]),body:child(indent)};if(n.type==='if'&&lines[i]?.indent===indent&&lines[i].text==='else:'){i++;n.other=child(indent);}}
  else if((m=l.text.match(/^for (\w+) in (.*):$/)))n={type:'for',name:m[1],range:expr(m[2]),body:child(indent)};
  else if((m=l.text.match(/^(\w+) (\+=|=) (.*)$/)))n={type:'assign',name:m[1],add:m[2]==='+=',value:expr(m[3])};
  else if((m=l.text.match(/^print\s*\((.*)\)$/)))n={type:'print',value:expr(m[1])};else throw Error('Unsupported source line '+l.text);
  n.source=l.text;nodes.push(n);
 }return nodes;}
 function child(indent){assert.ok(i<lines.length&&lines[i].indent>indent);return block(lines[i].indent);}
 const nodes=block(0);assert.equal(i,lines.length);return nodes;
}
function execute(nodes,input,{trace=false,state={}}={}){
 const env={...state},values=Array.isArray(input)?[...input]:[input],output=[],steps=[];let cycles=0;
 function e(x){if(Object.hasOwn(x,'value'))return x.value;if(x.name){assert.ok(Object.hasOwn(env,x.name),x.name);return env[x.name];}if(x.call){const args=x.args.map(e);if(x.call==='input'){assert.ok(values.length);return values.shift();}if(x.call==='int')return Number(args[0]);assert.equal(x.call,'range');const [a,b]=args.length===1?[0,args[0]]:args;return Array.from({length:Math.max(0,b-a)},(_,i)=>a+i);}if(x.op==='neg')return-e(x.x);const a=e(x.a),b=e(x.b);switch(x.op){case'+':return a+b;case'-':return a-b;case'%':return a%b;case'//':return Math.floor(a/b);case'==':return a===b;case'!=':return a!==b;case'>=':return a>=b;case'<=':return a<=b;case'>':return a>b;case'<':return a<b;default:throw Error(x.op);}}
 function body(nodes){for(const n of nodes){if(n.type==='assign')env[n.name]=(n.add?env[n.name]:0)+e(n.value);else if(n.type==='print')output.push(String(e(n.value)));else if(n.type==='if')body(e(n.condition)?n.body:n.other||[]);else{const iteration=()=>{assert.ok(++cycles<=100);const before={...env};body(n.body);if(trace)steps.push({before,after:{...env}});};if(n.type==='while'){while(e(n.condition))iteration();}else{assert.equal(n.type,'for');for(const v of e(n.range)){env[n.name]=v;iteration();}}}}}
 body(nodes);return{output,steps,state:env};
}
function condition(text){
 const intro=text.split('Бейсик')[0];let kind= intro.includes('степенью числа')?'power':intro.includes('последовательность из четырёх')?'list':'digits';
 let target=kind==='power'?'power':/минимальн/.test(intro)?'min':/максимальн/.test(intro)?'max':/сумму/.test(intro)?'sum':'count';
 let predicate,parameter,m;
 if(kind==='power'){predicate='power';parameter=Number(intro.match(/степенью числа (\d+)/)[1]);}
 else if((m=intro.match(/(?:большую|больших) (\d+)/))){predicate='gt';parameter=Number(m[1]);}
 else if((m=intro.match(/меньшую (\d+)/))){predicate='lt';parameter=Number(m[1]);}
 else if(/нечётн/.test(intro)){predicate='notmod';parameter=2;}
 else if(/чётн/.test(intro)){predicate='mod';parameter=2;}
 else{predicate=/не делящ|НЕ кратн/.test(intro)?'notmod':'mod';m=intro.match(/(?:на(?:цело на)?|кратную|кратных|кратны[хе]) (\d+)/);assert.ok(m,intro);parameter=Number(m[1]);}
 const part=text.split('Последовательно выполните следующее.')[1].split('2. Приведите')[0];const nums=part.split('при вводе')[1].match(/\d+/g).map(Number);assert.equal(nums.length,kind==='list'?4:1);
 return{kind,target,predicate,parameter,given:kind==='list'?nums:nums[0]};
}
function qualifies(x,s){switch(s.predicate){case'mod':return x%s.parameter===0;case'notmod':return x%s.parameter!==0;case'gt':return x>s.parameter;case'lt':return x<s.parameter;default:throw Error(s.predicate);}}
function expected(input,s){if(s.kind==='power'){let v=1;for(let k=0;v<=1000;k++,v*=s.parameter)if(v===input)return[String(k)];return['NO'];}
 let values=[];if(s.kind==='list')values=input;else{let n=input;do{values.push(n%10);n=Math.floor(n/10);}while(n);}
 const selected=values.filter(v=>qualifies(v,s));if(!selected.length)return['NO'];let value;if(s.target==='min')value=Math.min(...selected);else if(s.target==='max')value=Math.max(...selected);else if(s.target==='count')value=selected.length;else value=selected.reduce((a,b)=>a+b,0);
 return(s.kind==='list'?[selected.length,value]:[value]).map(String);
}
function proveDigits(nodes,s){
 assert.equal(s.kind,'digits');const loopIndex=nodes.findIndex(n=>n.type==='while');assert.ok(loopIndex>0);const loop=nodes[loopIndex];const name={min:'minDigit',max:'maxDigit',sum:'sum',count:'count'}[s.target];const sentinel={min:10,max:-1,sum:0,count:0}[s.target];
 const init=execute(nodes.slice(0,loopIndex),[1]).state;assert.equal(init[name],sentinel);let states=new Map([['0,'+sentinel,{count:0,value:sentinel}]]);let transitions=0,terminal=0;
 for(let depth=1;depth<=10;depth++){
  const next=new Map();for(const st of states.values())for(let digit=0;digit<10;digit++){
   const hit=qualifies(digit,s),count=st.count+Number(hit);let value=st.value;
   if(hit)value=s.target==='min'?Math.min(value,digit):s.target==='max'?Math.max(value,digit):s.target==='sum'?value+digit:value+1;
   const after=execute(loop.body,[],{state:{N:10+digit,[name]:st.value}}).state;assert.equal(after[name],value);assert.equal(after.N,1);transitions++;
   const out=execute(nodes.slice(loopIndex+1),[],{state:{...after,N:0}}).output;assert.deepEqual(out,count?[String(value)]:['NO']);terminal++;
   next.set(count+','+value,{count,value});
  }states=next;
 }
 return{transitions,terminal,depth:10};
}
module.exports={parse,execute,condition,expected,proveDigits};
