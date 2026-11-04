"""Execute bounded, reviewed array fragments with the variables allowed by FIPI."""
import ast,contextlib,io,json,sys
p=json.load(sys.stdin);tree=ast.parse(p['code'])
for node in ast.walk(tree):
 assert not isinstance(node,(ast.Import,ast.ImportFrom,ast.Attribute,ast.While,ast.FunctionDef,ast.ClassDef,ast.With,ast.Try,ast.Lambda,ast.ListComp,ast.DictComp,ast.SetComp,ast.GeneratorExp))
 if isinstance(node,ast.Name):assert node.id in {'a','n','i','j','k','print','range'}
 if isinstance(node,ast.Call):assert isinstance(node.func,ast.Name) and node.func.id in {'print','range'}
code=compile(tree,'<reviewed array fragment>','exec');out=[]
for a in p['inputs']:
 assert 2<=len(a)<=30 and all(type(x) is int and abs(x)<=10000 for x in a)
 stream=io.StringIO();env={'a':a.copy(),'n':len(a),'__builtins__':{'range':range,'print':print}}
 with contextlib.redirect_stdout(stream):exec(code,env)
 out.append({'output':[int(x) for x in stream.getvalue().split()],'array':env['a']})
json.dump(out,sys.stdout)
