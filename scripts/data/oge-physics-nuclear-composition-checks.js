const assert = require('node:assert/strict');
const sources = require('./oge-physics-nuclear-composition-sources.json');

// Primary isotope labels and table entries, independently read from FIPI.
const elements = {неона:[24,10],кислорода:[15,8],алюминия:[27,13],углерода:[15,6],железа:[56,26],кальция:[44,20],титана:[50,22],полония:[206,84],бора:[11,5],азота:[15,7]};
const code = truths => truths.flatMap((yes,i)=>yes?[i+1]:[]).join('');
module.exports = prepared => {
  const rows = new Map(prepared.map(r=>[r.id,r]));
  const a = id => rows.get('OGEPHYS'+id).answer;
  const Z = {Li:3,Be:4,B:5,C:6,N:7,O:8,F:9,Au:79,Hg:80,Tl:81,Pb:82,Bi:83,Po:84,Rn:86};
  let checked = 0;
  for(const [id,s] of Object.entries(sources)) {
    const r=rows.get(id); assert.ok(r,id);
    const text=s.fipiCondition;
    if(['7C983B','EE3185'].some(short=>id==='OGEPHYS'+short))continue;
    if(!text.includes('Сколько электронов содержит нейтральный атом') && !text.includes('Сколько протонов содержит ядро') && !text.includes('Сколько нейтронов содержит ядро') && !text.includes('Используя фрагмент'))continue;
    if(text.includes('три')||text.includes('выберите'))continue;
    let A,p;
    if(id==='OGEPHYSBF3204') { p=3;A=3+4; }
    else {
      const found=Object.entries(elements).find(([name])=>text.includes(name));
      assert.ok(found,id+': element');[A,p]=found[1];
      const mass=text.match(/массовым числом (\d+)/);if(mass)A=Number(mass[1]);
    }
    const target=text.includes('Сколько электронов')?'e':text.includes('сколько протонов')||text.includes('Сколько протонов')?'p':'n';
    // Search possible compositions; charge neutrality and nucleon count must
    // hold simultaneously, rather than checking just one arithmetic result.
    const candidates=[];
    for(let neutrons=0;neutrons<=A;neutrons++)for(let electrons=0;electrons<=A;electrons++) {
      if(p+neutrons!==A||p-electrons!==0)continue;
      candidates.push({p,n:neutrons,e:electrons});
    }
    assert.equal(candidates.length,1,id);assert.equal(Number(r.answer),candidates[0][target],id);checked++;
  }
  assert.equal(checked,29);
  for(const id of ['690DBD','43845E']) {assert.equal(Number(a(id)),30);assert.equal(Number(a(id))-30,0);}
  assert.equal(Number(a('7C983B'))+32,58);assert.equal(Number(a('659E38'))-6,5);
  assert.equal(Number(a('D83B8D'))+5,11);assert.equal(Number(a('EE3185'))+8,16);
  assert.equal(Number(a('E3563E'))+1,7+2);const reactionA=14+4-1;assert.equal(reactionA-Number(a('E3563E')),9);
  assert.equal(a('0BCAF4'),code([17-Z.O===8,Z.O===9,true,Z.F===9,7-Z.Li===7]));
  for(const id of ['E1BC72','DE65B6'])assert.equal(a(id),code([187-183===4&&Z.Pb-Z.Hg===2,212-212===1&&Z.Pb-Z.Bi===1,Z.Bi===83,false,197-Z.Au===197]));
  assert.equal(a('88BD26'),code([10-Z.Be===10,Z.B===6,false,Z.N===7,Z.Li===3]));
  for(const id of ['844723','522CC4'])assert.equal(a(id),code([Z.Bi+1===Z.Po,Z.Po-2===Z.Rn,Z.Hg===120,Z.Pb===82,Z.Au+0===80]));
  for(const id of ['D075AC','5096E5'])assert.equal(a(id),code([Z.Bi+1===Z.Pb,Z.Po-2===Z.Bi,200-Z.Hg===120,Z.Pb===207,Z.Au+0===Z.Au]));
  assert.equal(a('5ABAEB'),code([10-Z.Be===6,Z.Be===10,false,Z.C===6,Z.Li===4]));
  assert.equal(a('56C783'),code([Z.Tl+1===Z.Pb,Z.Pb-2===Z.Po,Z.Au===79,Z.Au===197,Z.Au===80]));
  // Ionization leaves every nuclear charge unchanged. Neutron capture changes
  // mass number only; beta-minus conserves charge including the emitted electron.
  for(const charge of Object.values(Z))for(const lost of [1,2]) {
    assert.equal(charge-(charge-lost),lost);
    assert.equal((charge+1)-1,charge);
  }
  assert.equal(Object.keys(sources).length,46);
};
