'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const digits='⁰¹²³⁴⁵⁶⁷⁸⁹';
function model(task){
 const text=conditionText(task.fragment);
 if(text.includes('Документ объёмом')){
  const size=text.match(/Документ объёмом (\d+) Мбайт/u),rate=text.match(/составляет 2([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*бит/u),share=text.match(/документа равен (\d+)%/u),pack=text.match(/на сжатие документа, – (\d+) секунд/u),unpack=text.match(/на распаковку – (\d+) секунд/u);assert.ok(size&&rate&&share&&pack&&unpack,'unambiguous exponent and parameters required');
  assert.match(text,/А[.)] Сжать архиватором, передать архив по каналу связи, распаковать/u);assert.match(text,/Б[.)] Передать по каналу связи без использования архиватора/u);
  return {kind:'compare',megabytes:Number(size[1]),ratePower:Number([...rate[1]].map(c=>digits.indexOf(c)).join('')),percent:Number(share[1]),pack:Number(pack[1]),unpack:Number(unpack[1])};
 }
 const duration=text.match(/другой за (\d+) (секунд|минуту)/u),total=text.match(/составит (\d+) секунд/u),share=text.match(/составляет (\d+)%/u);assert.ok(duration&&total&&share);assert.match(text,/время передачи файла пропорционально его размеру/u);assert.match(text,/Сколько всего времени/u);
 return {kind:'overhead',rawSeconds:Number(duration[1])*(duration[2]==='минуту'?60:1),totalSeconds:Number(total[1]),percent:Number(share[1])};
}
function solve(m){
 assert.ok(Number.isInteger(m.percent)&&m.percent>=0&&m.percent<=100);
 if(m.kind==='compare'){
  const bits=BigInt(m.megabytes)*8388608n,speed=2n**BigInt(m.ratePower),den=speed*100n;
  const raw100=bits*100n,compressed100=bits*BigInt(m.percent),total100=compressed100+BigInt(m.pack+m.unpack)*den,diff=raw100-total100;
  assert.notEqual(diff,0n,'the question requires a strictly faster method');
  for(const n of [raw100,compressed100,total100,diff])assert.equal(n%den,0n,'integer seconds required for this reviewed subgroup');
  const result={kind:m.kind,rawSeconds:String(raw100/den),compressedSeconds:String(compressed100/den),totalSeconds:String(total100/den),difference:String((diff<0n?-diff:diff)/den)};
  return {...result,answer:(diff>0n?'А':'Б')+result.difference};
 }
 assert.equal(m.kind,'overhead');const compressed100=BigInt(m.rawSeconds)*BigInt(m.percent),overhead100=BigInt(m.totalSeconds)*100n-compressed100;assert.ok(overhead100>=0n);assert.equal(compressed100%100n,0n);return {kind:m.kind,compressedSeconds:String(compressed100/100n),overheadSeconds:String(overhead100/100n),answer:String(overhead100/100n)};
}
function compute(task,data){assert.equal(conditionText(task.fragment),data.condition,'changed condition');const m=model(task);assert.deepEqual(m,data.model,'changed model');const result=solve(m);assert.deepEqual(result,data.calculated,'changed calculation');return result;}
module.exports={model,solve,compute};
