"""Run reviewed streaming programs; input sets are bounded by source constraints."""
import ast,io,json,sys,contextlib
p=json.load(sys.stdin);tree=ast.parse(p['code'])
for node in ast.walk(tree):
 assert not isinstance(node,(ast.Import,ast.Attribute,ast.While,ast.FunctionDef,ast.ClassDef,ast.With,ast.Try,ast.Lambda,ast.ListComp,ast.GeneratorExp,ast.DictComp,ast.SetComp))
 if isinstance(node,ast.ImportFrom):assert node.module=='array' and [(a.name,a.asname) for a in node.names]==[('array',None)]
 if isinstance(node,ast.Call):assert isinstance(node.func,ast.Name) and node.func.id in {'input','int','range','max','print','array'}
 if isinstance(node,ast.For):assert isinstance(node.iter,ast.Call) and isinstance(node.iter.func,ast.Name) and node.iter.func.id=='range' and len(node.iter.args)==1 and isinstance(node.iter.args[0],ast.Name) and node.iter.args[0].id=='n'
compiled=compile(tree,'<reviewed streaming program>','exec');out=[]
for a in p['inputs']:
 assert 1<=len(a)<=12000 and all(type(x) is int and 1<=x<=10000 for x in a)
 stream=io.StringIO();it=iter([str(len(a)),*map(str,a)]);env={'input':lambda:next(it)}
 with contextlib.redirect_stdout(stream):exec(compiled,env)
 try:next(it);raise AssertionError('unread input')
 except StopIteration:pass
 data={k:v for k,v in env.items() if type(v) in [int,list] or type(v).__module__=='array' and type(v).__name__=='array'}
 # Explicit data objects only, excluding interpreter infrastructure and name tables.
 storage=sum(sys.getsizeof(v)+(sum(sys.getsizeof(x) for x in v) if type(v) is list else 0) for v in data.values())
 out.append({'output':[int(x) for x in stream.getvalue().split()],'explicitDataBytes':storage})
json.dump(out,sys.stdout)
