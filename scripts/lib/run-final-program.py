import sys,json,ast,io,contextlib,signal
request=json.load(sys.stdin);code=request['code'];tree=ast.parse(code)
for node in ast.walk(tree):
 if isinstance(node,ast.Import):assert [n.name for n in node.names]==['sys']
 if isinstance(node,ast.ImportFrom):assert node.module=='operator' and [n.name for n in node.names]==['truediv']
 if isinstance(node,ast.Name):assert not node.id.startswith('__')
 if isinstance(node,ast.Attribute):assert node.attr in ['stdin','read','split','append','sort']
 if isinstance(node,(ast.FunctionDef,ast.ClassDef,ast.AsyncFunctionDef,ast.With,ast.Try,ast.Delete)):raise AssertionError('unsupported construct')
 if isinstance(node,ast.Call) and isinstance(node.func,ast.Name):assert node.func.id in ['input','int','float','map','print','range','sorted','ord','chr','max','truediv']
compiled=compile(tree,'authored-final-program','exec');results=[]
for value in request['inputs']:
 old=sys.stdin;stream=io.StringIO(value);sys.stdin=stream;out=io.StringIO();scope={};signal.alarm(5)
 try:
  with contextlib.redirect_stdout(out):exec(compiled,scope)
 finally:sys.stdin=old;signal.alarm(0)
 results.append({'output':out.getvalue().strip(),'explicitScalarBytes':sum(sys.getsizeof(v) for k,v in scope.items() if not k.startswith('__') and type(v) in [int,float])})
json.dump(results,sys.stdout,ensure_ascii=False)
