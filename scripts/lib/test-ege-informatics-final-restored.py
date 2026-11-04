import sys,json,subprocess,zipfile,io,random,itertools,collections
kind,calculator,lib=sys.argv[1:];rng=random.Random(7319);checked=0

def run(model,text):
 global checked
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as z:z.writestr('input.txt',text)
 p=subprocess.run(['python3',calculator,lib,json.dumps(model)],input=out.getvalue(),capture_output=True,timeout=20)
 assert p.returncode==0,p.stderr.decode();checked+=1;return json.loads(p.stdout)['answer']
if kind=='sequence':
 for signed,ending,digits,count,comparison in [(True,27,5,'at-least-one','>='),(True,25,4,'at-most-two','<='),(False,13,2,'exactly-one','<=')]:
  for k in range(15):
   a=[rng.choice([-1,1] if signed else [1])*rng.choice([11,23,113,525,1000,1025,10027,99999]) for i in range(12)]+[ending,99913]
   threshold=max(v for v in a if str(abs(v)).endswith(str(ending)));s=[]
   for i in range(len(a)-2):
    t=a[i:i+3];n=sum(len(str(abs(x)))==digits for x in t)
    if ((n>=1 if count=='at-least-one' else n<=2 if count=='at-most-two' else n==1) and (sum(t)>=threshold if comparison=='>=' else sum(t)<=threshold)):s.append(sum(t))
   if not s:continue
   answer=run(dict(kind=kind,signed=signed,ending=ending,digits=digits,count=count,comparison=comparison),'\n'.join(map(str,a)))
   assert answer==f'{len(s)} {max(s)}',(a,answer,s)
elif kind=='strings':
 for i in range(20):
  s='N12'+''.join(rng.choice('NAB0123') for _ in range(30));pieces=[s[a:b] for a in range(len(s)) for b in range(a+1,len(s)+1)];best=max(len(t) for t in pieces if t[0]=='N' and t.count('N')==1 and sum(c.isdigit() for c in t)==2)
  assert run(dict(kind='initial-letter-digits',letter='N',digits=2),s)==str(best)
 for i in range(20):
  s='YY20252025'+''.join(rng.choice(['2025','Y','A','2','025']) for _ in range(8));pieces=[s[a:b] for a in range(len(s)) for b in range(a+1,len(s)+1)];best=max(len(t) for t in pieces if t.endswith('2025') and t.count('2025')==2 and t.count('Y')>=2)
  assert run(dict(kind='suffix-pattern-count',pattern='2025',letter='Y',count=2,minimum=2),s)==str(best)
elif kind=='events':
 for i in range(25):
  a=[(rng.randint(1,18),rng.randint(19,24)) for _ in range(2)]+[(lambda x:(x,x+rng.randint(1,6)))(rng.randint(1,18)) for _ in range(7)]
  best=(0,0)
  for mask in range(1,1<<len(a)):
   seq=sorted(a[j] for j in range(len(a)) if mask>>j&1)
   if all(seq[j-1][1]<=seq[j][0] for j in range(1,len(seq))):best=max(best,(len(seq),seq[-1][1]))
  assert run(dict(kind='events'),str(len(a))+'\n'+'\n'.join(f'{x} {y}' for x,y in a))==' '.join(map(str,best))
elif kind=='reject-invalid':
 cases=[({'kind':'events'},'2\n1 2\n'),({'kind':'events'},'1\n10 10\n'),({'kind':'sequence','signed':False,'ending':13,'digits':2,'count':'exactly-one','comparison':'<='},'13\n-1\n20'),({'kind':'initial-letter-digits','letter':'N','digits':2},'N12a')]
 for model,text in cases:
  z=io.BytesIO()
  with zipfile.ZipFile(z,'w') as f:f.writestr('input.txt',text)
  p=subprocess.run(['python3',calculator,lib,json.dumps(model)],input=z.getvalue(),capture_output=True);assert p.returncode!=0;checked+=1
else:raise AssertionError(kind)
assert checked>=4;print(json.dumps({'status':'ok','kind':kind,'fixtures':checked}))
