const {solveLong}=require('./math-long-solutions');
const {verifyLong}=require('./math-long-checks');
const {solveFunctionImages,verifyFunctionImages}=require('./math-function-images');
const {solveProbability}=require('./math-probability-solutions');
const {verifyProbability}=require('./math-probability-checks');
const {solveBasicEquation,verifyBasicEquation}=require('./math-basic-equations');
const {solveVector,verifyVector}=require('./math-vector-solutions');
const {solveArithmetic,verifyArithmetic}=require('./math-arithmetic-solutions');
const {solveCalculus,verifyCalculus}=require('./math-calculus-solutions');
const {solveWord,verifyWord}=require('./math-word-solutions');

const {solveApplied,verifyApplied}=require('./math-applied-solutions');

const {solveGeometryShort,verifyGeometryShort}=require('./math-geometry-short');

const {solveDerivativeImages,verifyDerivativeImages}=require('./math-derivative-images');

module.exports=[
  {name:'long-final',count:30,solve:solveLong,verify:verifyLong,sources:require('./math-long-sources.json')},
  {name:'function-images',count:63,solve:solveFunctionImages,verify:verifyFunctionImages,sources:require('./math-function-images-sources.json')},
  {name:'probability',count:110,solve:task=>task.codes.includes('6.2')?solveProbability(task):null,verify:verifyProbability,sources:require('./math-probability-sources.json')},
  {name:'basic-equations',count:54,solve:solveBasicEquation,verify:verifyBasicEquation,sources:require('./math-basic-equation-sources.json')},
  {name:'vectors',count:31,solve:solveVector,verify:verifyVector,sources:require('./math-vector-sources.json')},
  {name:'arithmetic',count:61,solve:solveArithmetic,verify:verifyArithmetic,sources:require('./math-arithmetic-sources.json')},
  {name:'calculus',count:60,solve:solveCalculus,verify:verifyCalculus,sources:require('./math-calculus-sources.json')},
  {name:'word-problems',count:61,solve:solveWord,verify:verifyWord,sources:require('./math-word-sources.json')},
  {name:'applied-formulas',count:53,solve:solveApplied,verify:verifyApplied,sources:require('./math-applied-sources.json')},
  {name:'short-geometry',count:115,solve:solveGeometryShort,verify:verifyGeometryShort,sources:require('./math-geometry-short-sources.json')},
  {name:'derivative-images',count:65,solve:solveDerivativeImages,verify:verifyDerivativeImages,sources:require('./math-derivative-images-sources.json')}
];
