import ast,operator
from functools import lru_cache
@lru_cache(maxsize=512)
def parse(expr):return ast.parse(expr,mode="eval")
from decimal import Decimal
OPS={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Eq:operator.eq,ast.Lt:operator.lt,ast.Gt:operator.gt,ast.LtE:operator.le,ast.GtE:operator.ge}
def number(v):
 try:return Decimal(v)
 except:return v
def evaluate(expr,env):
 def walk(n):
  if isinstance(n,ast.Expression):return walk(n.body)
  if isinstance(n,ast.Constant):return Decimal(n.value) if type(n.value) in (int,float) else n.value
  if isinstance(n,ast.Name):return env[n.id]
  if isinstance(n,ast.Tuple):return tuple(walk(e) for e in n.elts)
  if isinstance(n,ast.BoolOp):return (all if isinstance(n.op,ast.And) else any)(walk(x) for x in n.values)
  if isinstance(n,ast.BinOp):return OPS[type(n.op)](walk(n.left),walk(n.right))
  if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return -walk(n.operand)
  if isinstance(n,ast.IfExp):return walk(n.body) if walk(n.test) else walk(n.orelse)
  if isinstance(n,ast.Compare):
   vals=[walk(n.left)]+[walk(c) for c in n.comparators]
   return all((a in b) if isinstance(op,ast.In) else OPS[type(op)](a,b) for a,op,b in zip(vals,n.ops,vals[1:]))
  if isinstance(n,ast.Call):
   if isinstance(n.func,ast.Name) and n.func.id=='abs':return abs(walk(n.args[0]))
   if isinstance(n.func,ast.Attribute) and n.func.attr=='endswith':return walk(n.func.value).endswith(walk(n.args[0]))
  raise ValueError(ast.dump(n))
 return walk(parse(expr))
def formula(expr,row,nrows,first):
 def walk(n):
  if isinstance(n,ast.Expression):return walk(n.body)
  if isinstance(n,ast.Constant):return ('TRUE()' if n.value else 'FALSE()') if isinstance(n.value,bool) else '"'+n.value.replace('"','""')+'"' if isinstance(n.value,str) else str(n.value)
  if isinstance(n,ast.Name):return str(row) if n.id=='ROW' else 'AVERAGE($B$2:$B$'+str(nrows)+')' if n.id=='GLOBAL_MEAN_B' else '$'+first[0]+'$'+first[1:] if n.id=='FIRST_RESULT' else n.id+str(row)
  if isinstance(n,ast.BoolOp):return ('AND' if isinstance(n.op,ast.And) else 'OR')+'('+ ';'.join(walk(x) for x in n.values)+')'
  if isinstance(n,ast.BinOp):return '('+walk(n.left)+{ast.Add:'+',ast.Sub:'-',ast.Mult:'*'}[type(n.op)]+walk(n.right)+')'
  if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return '-'+walk(n.operand)
  if isinstance(n,ast.IfExp):return 'IF('+walk(n.test)+';'+walk(n.body)+';'+walk(n.orelse)+')'
  if isinstance(n,ast.Compare):
   if len(n.ops)==1 and isinstance(n.ops[0],ast.In):return 'OR('+ ';'.join(walk(n.left)+'='+walk(x) for x in n.comparators[0].elts)+')'
   vals=[n.left]+n.comparators;tests=[walk(a)+{ast.Eq:'=',ast.Lt:'<',ast.Gt:'>',ast.LtE:'<=',ast.GtE:'>='}[type(op)]+walk(b) for a,op,b in zip(vals,n.ops,vals[1:])];return tests[0] if len(tests)==1 else 'AND('+';'.join(tests)+')'
  if isinstance(n,ast.Call):
   if isinstance(n.func,ast.Name) and n.func.id=='abs':return 'ABS('+walk(n.args[0])+')'
   if isinstance(n.func,ast.Attribute) and n.func.attr=='endswith':return 'RIGHT('+walk(n.func.value)+';'+str(len(n.args[0].value))+')='+walk(n.args[0])
  raise ValueError(ast.dump(n))
 return walk(parse(expr))
def calculate(model):
 rows=model['rows'][1:];envs=[dict(zip('ABCDEFGHIJKLMNOPQRSTUVWXYZ',map(number,row)),ROW=Decimal(i)) for i,row in enumerate(rows,2)]
 gm=sum(e['B'] for e in envs)/len(envs) if all(isinstance(e.get('B'),Decimal) for e in envs) else Decimal(0)
 first=None;results=[]
 for spec in model['calculations']+model['chart']:
  for e in envs:e.update(GLOBAL_MEAN_B=gm,FIRST_RESULT=first)
  selected=[e for e in envs if evaluate(spec['where'],e)];vals=[evaluate(spec['value'],e) for e in selected];total=sum(vals,Decimal(0));op=spec['op'];assert vals,(model['id'],spec)
  result={'count':lambda:Decimal(len(vals)),'sum':lambda:total,'mean':lambda:total/len(vals),'min':lambda:min(vals),'max':lambda:max(vals),'range':lambda:max(vals)-min(vals),'percent':lambda:Decimal(len(vals))*100/len(envs),'mean-difference':lambda:abs(total/len(vals)-sum(evaluate(spec['value'],e) for e in envs)/len(envs))}[op]()
  results.append({'value':str(result),'selectedRows':len(vals),'sum':str(total),'min':str(min(vals)),'max':str(max(vals))})
  if first is None:first=result
 return results
