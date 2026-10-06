// Учебные типы по образцу https://math-ege.sdamgia.ru/prob_catalog.
// Правила применяются к ранее проверенным семействам сохранённого банка.
// Перегенерация реестра только явно: --write; по умолчанию выполняется сверка.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {readMathematicsCatalog}=require(root+'/scripts/lib/mathematics-catalog');
const batches=require(root+'/scripts/data/math-completion-batches');
const tasks=readMathematicsCatalog();
const assignments={};
const basicProbability=new Set(['order','remaining-order','selected-tourist','defects','reserve-room','tickets','contest-day','children','two-coins','temperature','match-tosses']);
for(const b of batches)for(const id of Object.keys(b.sources)){
 const t=tasks.get(id),s=b.solve(t),f=s.family;
 let type;
 switch(b.name){
 case 'long-final': type=/^Найдите все значения/.test(t.text)?'parameters':/^Решите неравенство/.test(t.text)?'inequalities':'numbers';break;
 case 'probability': type=basicProbability.has(f)?'probability-basic.classical':['battery','markers','conditional-dice'].includes(f)?'probability-compound.conditional':['fixed-shots','lamps','until-hit','match-tosses'].includes(f)?'probability-compound.independent':'probability-compound.events';break;
 case 'basic-equations': type='basic-equations.'+({logarithm:'logarithms',exponential:'exponential','square-root':'roots','cube-root':'roots',cube:'rational',reciprocal:'rational'}[f]);break;
 case 'vectors':type='vectors.'+(f==='length'?'coordinates':'scalar');break;
 case 'arithmetic':type=id==='6D1598'?'word-problems.percent':'expressions.'+(t.codes.includes('1.5')?'trigonometry':t.codes.includes('1.6')?'logarithms':t.codes.includes('1.4')?'powers':'roots');break;
 case 'calculus':type='function-study.'+(/наибольш|наименьш/i.test(t.text)?'values':'extrema');break;
 case 'derivative-images':type=f==='analytic'?'function-study.'+(/наибольш|наименьш/i.test(t.text)?'values':'extrema'):'derivative.'+(['tangent','compare-slopes'].includes(f)?'tangent':'graph');break;
 case 'word-problems':type='word-problems.'+(f.startsWith('river-')?'water':['pipes','joint-work','workers','individual-work'].includes(f)?'work':/сплав|раствор|процент/i.test(t.text)?'percent':'motion');break;
 case 'applied-formulas':type='applied.'+(t.codes.includes('2.3')?'trigonometry':t.codes.includes('2.4')?'exponential-log':t.codes.includes('2.2')?'roots':'algebraic');break;
 case 'function-images':type=['ultrasound','capacitor','bell'].includes(f)?'applied.'+(f==='ultrasound'?'algebraic':'exponential-log'):'graphs.'+(f.includes('-')?'intersection':({log:'exponential-log',root:'roots',exponential:'exponential-log',parabola:'quadratic',hyperbola:'inverse',line:'linear'}[f]));break;
 case 'short-geometry':{
  const solid=/^(cylinder|cone|sphere|box|prism|cube)-/.test(f);
  type=solid?'solid.'+(/шар.*цилиндр|шар.*конус|конус.*шар|цилиндр.*шар|сфер|цилиндр.*конус|конус.*цилиндр|цилиндр.*параллелепипед/i.test(t.text)?'combinations':/^(cylinder|cone|sphere)-/.test(f)?'round':'polyhedra'):'plane.'+(/окружност/.test(t.text)||/^(circle|diameters|opposite|single-opposite|central|inscribed|circumradius|tangent|tangential)/.test(f)?'circles':/^(para|parallelogram)/.test(f)?'quadrilaterals':'triangles');break;
 }
 default:throw Error(b.name);
 }
 if(!type||type.endsWith('undefined'))throw Error(id+' '+b.name+' '+f);
 if(assignments[id])throw Error('duplicate '+id);
 assignments[id]={part:t.answerType==='Краткий ответ'?1:2,type,sourceCodes:t.codes,conditionSha256:t.sourceHash,batch:b.name,family:f||type};
}
const sorted=Object.fromEntries(Object.entries(assignments).sort(([a],[b])=>a.localeCompare(b)));
const target=path.join(root,'lib/math-task-assignments.json');
if(process.argv.includes('--write')) fs.writeFileSync(target,JSON.stringify(sorted,null,2)+'\n');
else assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),sorted,'Изменилась проверенная классификация: требуется ручная сверка');
console.log(JSON.stringify({assignments:Object.keys(sorted).length,firstPart:Object.values(sorted).filter(a=>a.part===1).length,secondPartAdditions:Object.values(sorted).filter(a=>a.part===2).length}));
