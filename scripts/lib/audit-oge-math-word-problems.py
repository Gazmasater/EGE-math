"""Independent checks against FIPI text/tables and manually read image measurements.
No explanation-builder functions, solved quadratics, or precomputed answers are imported.
"""
import sys,json,re,math
from fractions import Fraction as F
from decimal import Decimal,ROUND_HALF_UP
from bs4 import BeautifulSoup

def number(s):return F(re.sub(r'\s','',str(s)).replace(',','.').replace('−','-'))
def ns(s):return [number(x) for x in re.findall(r'\d+(?:[.,]\d+)?',s)]
def rounding(x,digits=0):
 x=F(x);return F((Decimal(x.numerator)/Decimal(x.denominator)).quantize(Decimal(10)**-digits,rounding=ROUND_HALF_UP))
def text(n):return re.sub(r'\s+',' ',' '.join(n.stripped_strings)) if n else ''
def read(fragment):
 s=BeautifulSoup(fragment,'html.parser');q=s.select_one('.cell_0');common=s.select_one('.oge-shared-condition');tables=[]
 for table in q.select('table'):
  rows=[]
  for tr in table.select('tr'):
   row=[]
   for td in tr.select('td,th'):row+=[text(td)]*int(td.get('colspan',1))
   rows.append(row)
  tables.append(rows)
 return text(q),text(common),tables

def validate_standalone(q,x):
 n=ns(q)
 if q.startswith('Свежие'):
  a,b,m=n;fresh='Сколько требуется' in q;raw=x if fresh else m;dry=m if fresh else x
  assert raw*(100-a)==dry*(100-b) and 0<dry<raw
 elif q.startswith('Поезд,'):
  v,u,t=n;rel=v-u if 'том же направлении' in q else v+u
  assert x*3600==rel*1000*t and x>0
 elif q.startswith(('Два велосипедиста одновременно отправляются','Два автомобиля одновременно отправляются','Первый рабочий','Первая труба','Велосипедист выехал')):
  work=q.startswith('Первый рабочий');pipe=q.startswith('Первая труба');bike=q.startswith('Велосипедист выехал')
  if work or pipe:d,S,dt=n
  else:S,d,dt=n
  isfast=('делает первый рабочий?' in q or 'скорость первого автомобиля' in q or 'пропускает вторая труба' in q or bike and q.endswith('из В в А.'))
  low=x-d if isfast else x;high=low+d
  assert 0<low<high and S/low-S/high==dt
 elif q.startswith('Моторная лодка'):
  S,delta,c=n;assert x>c and S/(x-c)-S/(x+c)==delta
 elif q.startswith('Баржа'):
  down,up,T,c=n;assert x>c and down/(x+c)+up/(x-c)==T
 elif q.startswith('Теплоход'):
  S,v,stop,total=n
  own,current=(v,x) if 'Найдите скорость течения' in q else (x,v)
  assert 0<current<own and S/(own+current)+S/(own-current)+stop==total
 elif q.startswith('Расстояние между пристанями'):
  S,L,c=n;assert x>c and (S/(x+c)+S/(x-c)+1)*c==L
 elif q.startswith('Имеются два сосуда'):
  a,b,whole,equal=n
  if 'первом' in q:acid1=x;acid2=(a+b)*whole/100-x
  else:acid2=x;acid1=(a+b)*whole/100-x
  assert 0<=acid1<=a and 0<=acid2<=b and (acid1/a+acid2/b)/2==equal/100
 elif q.startswith('Два бегуна'):
  rem,early,d=n;assert x>0 and (x+rem)/(x+d)*60+early==60
 elif q.startswith('Первые '):
  D=sum(n[::2]);T=sum(n[i]/n[i+1] for i in range(0,6,2));assert x*T==D and min(n[1::2])<=x<=max(n[1::2])
 elif q.startswith('Первую половину'):
  u,v=n;assert x*(1/u+1/v)==2
 elif q.startswith('Из А в В одновременно'):
  if 'меньше скорости' in q:d,u,limit=n;assert x>max(limit,d) and 2/x==1/(x-d)+1/u
  else:u,d=n;assert x>0 and 2/x==1/u+1/(x+d)
 elif q.startswith('Из двух городов'):
  mins,D,v,u=n;assert 0<x<D and x/u-(D-x)/v==mins/60
 else:raise AssertionError('Unknown standalone '+q)

def cells(rects):
 return {(x,y) for l,t,r,b in rects for x in range(l,r) for y in range(t,b)}
def perimeter(c):return sum((x+dx,y+dy) not in c for x,y in c for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])
# FIPI plot coordinates in half-cell steps (one metre). Rectangle unions are enumerated.
plots={
 3:{'labels':{'жилой дом':7,'гараж':2,'сарай':1,'баня':4,'теплица':5,'яблони':3},'house':[(12,2,22,8),(12,8,16,10)],'garage':[(22,14,30,20)],'shed':[(24,0,30,4)],'bath':[(0,14,6,20)],'garden':[(0,0,10,12)],'greenhouse':[(2,2,8,4)],'paths':[(4,12,26,13),(13,10,14,12),(4,13,5,14)],'platform':[(26,4,30,14)]},
 14:{'labels':{'жилой дом':3,'гараж':7,'сарай':4,'баня':6,'теплица':1,'яблони':5},'house':[(16,2,26,8),(16,8,20,10)],'garage':[(0,16,8,20)],'shed':[(2,8,6,14)],'garden':[(0,0,14,6)],'greenhouse':[(2,2,8,4)],'paths':[(10,6,11,16),(17,10,18,16),(6,12,17,13)],'platform':[(8,16,24,20)],'gate':[(14,20,16,20)]},
 18:{'labels':{'цветник':4,'гараж':2,'мангал':3,'беседка':5,'ели':7,'сарай':1,'жилой дом':6},'house':[(18,2,28,10),(21,10,25,12)],'garage':[(0,16,10,20)],'shed':[(0,0,6,4)],'flower':[(10,6,16,10),(12,10,16,12)],'paths':[(0,4,18,5),(0,5,1,12),(7,5,8,12),(17,5,18,14),(10,13,21,14)],'platform':[(0,12,10,16),(21,12,25,16)]}}
# Half-cell image distances: actual original diagrams were viewed before transcription.
grid={
 'Масловка':([1,2,3,4],[21,15,20],1), 'Осиновка':([4,2,1,3],[20,8,15],1),
 'Грушёвка':([3,2,1,4],[9,5,12],2),'Ёлочки':([4,3,1,2],[15,6,8],4),
 'Ясная':([1,2,3,4],[16,5,12],2),'Васильково':([4,3,1,2],[16,5,12],1),
 'Дивная':([1,2,3,4],[28,20,21],1),'Васильевка':([2,3,4,1],[9,5,12],3),
 'Лягушкино':([4,1,3,2],[15,6,8],1),'Пирожки':([4,1,3,2],[15,6,8],2)}
flat={'санузел':(1,[(0,0,5,6)]),'кладовая':(3,[(0,0,4,5)]),'коридор':(2,[(0,0,24,5),(0,5,5,6)]),'кухня':(7,[(0,0,10,9)]),'гостиная':(6,[(0,0,12,13)]),'спальня':(4,[(0,0,11,9)]),'большая лоджия':(5,[(0,0,11,4)]),'меньшая лоджия':(8,[(0,0,10,3)])}
forms={'санузла':'санузел','санузле':'санузел','кладовой':'кладовая','коридора':'коридор','коридоре':'коридор','кухни':'кухня','кухне':'кухня','гостиной':'гостиная','спальни':'спальня','спальне':'спальня','большей лоджии':'большая лоджия','меньшей лоджии':'меньшая лоджия','лоджии, примыкающей к спальне':'большая лоджия','лоджии, примыкающей к кухне':'меньшая лоджия'}
def flat_area(k):return len(cells(flat[k][1]))*F(4,25)
def rect_distance(a,b):
 best=None
 for l,t,r,bt in a:
  for L,T,R,B in b:
   dx=max(0,L-r,l-R);dy=max(0,T-bt,t-B);sq=dx*dx+dy*dy
   best=sq if best is None else min(best,sq)
 return math.sqrt(best)

def internet(q,tables):
 traffic=number(re.search(r'трафик составит (\d+)',q)[1]);totals=[]
 for name,fee,rate in tables[0][1:]:
  price=0 if fee=='Нет' else ns(fee)[0];included=traffic if 'Безлимит' in name else ns(name)[0];excess=max(0,traffic-included);unit=ns(rate)[0] if excess else 0;totals.append(price+excess*unit)
 return min(totals)

def practical(q,common,tables,id,fragment):
 if 'Автомобильное колесо' in common:
  def specs(s):return tuple(map(int,re.findall(r'(\d+)/(\d+)\s*R(\d+)',s)[-1]))
  def circumference_part(m):w,p,r=m;return F(r*254,10)+F(w*p,50)
  base=specs(common)
  if 'Шины какой' in q:
   d=int(re.search(r'равен (\d+) дюйм',q)[1]);rows=tables[0];col=rows[1].index(str(d))+1
   options=[int(r[0]) for r in rows[2:] if re.search(r'\d',r[col])];return min(options) if 'наименьшей' in q else max(options)
  if 'высота боковины' in q:w,p,r=specs(q);return F(w*p,100)
  D=circumference_part(base)
  if 'выходящего с завода' in q:return D
  N=circumference_part(specs(q));delta=D-N if 'уменьшится' in q else N-D;assert delta>0
  return rounding(delta/D*100,1) if 'процентов' in q else delta
 if 'форматы листов бумаги' in common:
  ff=list(map(int,re.findall('[АA](\d)',q)))
  if 'соответствие' in q:
   formats=sorted(set(ff));rows=tables[0][1:];by=sorted(rows,key=lambda r: int(r[1]),reverse=True);mapping=dict(zip(formats,[r[0] for r in by]));return ''.join(mapping[int(re.search(r'\d',z)[0])] for z in tables[1][0])
  if 'Сколько листов' in q:return 2**(ff[0]-ff[1])
  if 'площадь листа' in q:return F(10**4,2**ff[0])
  if 'ширину' in q or 'длину' in q:
   area=10**6/2**ff[0];ratio=2**(-.5) if 'ширину' in q else 2**.5
   return math.floor(math.sqrt(area*ratio)/10+.5)*10
  if 'отношение' in q:return F(7,10) if 'меньшей стороны' in q else F(14,10)
  if 'массу' in q:N=int(re.search(r'по (\d+) листов',q)[1]);density=int(re.search(r'равна (\d+)',q)[1]);return F(N*density,2**ff[0])
  h=int(re.search(r'высотой (\d+)',q)[1]);return math.floor(h*2**((ff[1]-ff[0])/2)+.5)
 if 'парным отделением' in common:
  volume=F(35,10)*F(22,10)*2
  if 'радиус' in q:
   # Two drawings: the source file, not a guessed answer, identifies the measured legs.
   legs=(30,40) if '7827BA78296691374FBD1E6BCA1798FD' in fragment else (25,60)
   return math.sqrt(sum(z*z for z in legs))
  if 'соответствие' in q:
   vals=[number(z) for z in tables[-1][0][1:]];mapping={15:3,40:1,48:2} if 'массами' in q else {15000:3,19500:2,18000:1};return ''.join(str(mapping[z]) for z in vals)
  if 'объём' in q and 'покупка' not in q:return volume
  if 'площадь пола' in q:return volume/2
  if 'покупка' in q:
   assert 12<volume<=F('15.5');return 19500-15000 if 'без учёта' in q else 15000+6500-19500
  m=int(re.search('масса которой (\d+)',q)[1]);return {40:18000,48:19500}[m]*F(9,10)
 if 'план двухкомнатной квартиры' in common:
  if 'Для объектов' in q:return ''.join(str(flat[z][0]) for z in tables[0][0][1:])
  if q.startswith('Найдите площадь'):return flat_area(forms[q.split('площадь ')[1].split('.')[0]])
  if 'процентов' in q:
   a,b=re.search(r'площадь (.*?) больше площади (.*?)\?',q).groups();a,b=forms[a.rstrip(',')],forms[b.rstrip(',')];return (flat_area(a)/flat_area(b)-1)*100
  if 'упаковок' in q:
   target=re.search(r'пол (?:в|на) (.*?)\?',q)[1];area=flat_area('большая лоджия')+flat_area('меньшая лоджия') if target=='обеих лоджиях' else flat_area(forms[target]);w,h=map(int,re.search(r'размером (\d+) см на (\d+) см',q).groups());pack=int(re.search(r'по (\d+) штук',q)[1]);return math.ceil(area*10000/(w*h*pack))
  if 'стиральную машину' in q:
   totals=[]
   for row in tables[0][1:]:
    name,capacity,loading,cost,setup,delivery,size=row;h,w,d=ns(size)
    if ('верт' in loading)!=('вертикальной' in q):continue
    if 'вместимостью' in q and number(capacity)<6:continue
    if 'по высоте' in q and h>85:continue
    if 'по глубине' in q and d>42:continue
    totals.append(number(cost)*(1+(0 if delivery=='бесплатно' else number(delivery)/100))+number(setup))
   return min(totals)
  return internet(q,tables)
 if 'трафик мобильного интернета' in common:
  mins=[175,275,150,350,300,325,375,325,200,200,325,350];gb=[F(z,4) for z in [10,14,8,16,11,12,4,6,11,13,15,9]]
  monthly=[350+max(0,m-300)*3+90*math.ceil(max(0,g-3)*2) for m,g in zip(mins,gb)]
  if q.startswith('Определите'):
   s=gb if 'трафику' in q else mins;return ''.join(str(s.index(ns(z)[0])+1) for z in tables[0][0][1:])
  if 'потратил абонент' in q:
   month=next(i for i,m in enumerate(['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре']) if m in q);return monthly[month]
  if 'Сколько месяцев' in q:
   if 'и по пакету минут, и' in q:return sum(m>300 and g>3 for m,g in zip(mins,gb))
   if 'лимит по пакету мобильного' in q:return sum(g>3 for g in gb)
   return monthly.count(350)
  if 'наименьш' in q:return min(gb if 'трафик' in q else mins)
  if 'увеличился трафик' in q:
   i=0 if 'феврале' in q else 6;return (gb[i+1]/gb[i]-1)*100
  if 'В конце' in q:
   fee=number(tables[0][1][1].split('руб')[0]);return fee if 12*fee<sum(monthly) else 350
  if 'Помимо' in q:return internet(q,tables)
  if 'в 2018 году абонентская плата' in q:old=ns(q)[1];return (F(350)/old-1)*100
  if '490 рублей' in q:return (F(490,350)-1)*100
  percent=ns(q)[1];return F(350)/(1+(-1 if 'снизилась' in q else 1)*percent/100)
 if 'Участок имеет' in common:
  g=3 if 'Сосновка' in common else 14 if 'Авдеево' in common else 18;p=plots[g]
  ar=lambda key:len(cells(p[key]))
  if q.startswith('Для объектов'):return ''.join(str(p['labels'][z]) for z in tables[0][0][1:])
  if 'отоплен' in q:
   vals=[]
   for row in tables[0][1:]:vals.append([number(re.match(r'[\d\s,]+',z)[0]) for z in row[1:]])
   gas,el=vals;return (gas[0]+gas[1]-el[0]-el[1])/(el[2]*el[3]-gas[2]*gas[3])
  if 'упаков' in q:
   needed=len(cells(p['paths']+(p['platform'] if 'площадк' in q else [])))
   if 'рассчитанных' in q:return math.ceil(F(needed)/F('3.5'))
   pack=int(re.search(r'по (\d+) штук',q)[1]);unit=F(1,4) if g==18 else 1;return math.ceil(F(needed)/(pack*unit))
  if 'расстояние' in q:
   return rect_distance(p['gate'],p['shed']) if 'ворот' in q else rect_distance(p['house'],p['garage'])
  if 'периметр' in q:return perimeter(cells(p['house']))
  if 'процентов' in q:
   if 'строения' in q:return rounding(F(sum(ar(k) for k in ['house','garage','shed','bath']),600)*100)
   if 'сарай' in q:return F(ar('shed'),600)*100
   if 'всего огорода' in q:return F(ar('greenhouse'),ar('garden'))*100
   return (1-F(ar('greenhouse'),ar('garage')))*100 if 'меньше' in q else (F(ar('garage'),ar('greenhouse'))-1)*100
  if 'открытого грунта' in q:return ar('garden')-ar('greenhouse')
  if 'баня' in q:return ar('bath')
  if 'цветник' in q:return ar('flower')
  if 'жилой дом' in q:return ar('house')
  raise AssertionError(q)
 if 'план сельской местности' in common:
  labels={'Антоновка':1,'Доломино':3,'Егорка':2,'Ванютино':4,'Жилино':5,'Горюново':6,'Богданово':7};pos={1:(20,0),2:(12,0),3:(8,0),4:(0,0),5:(0,9),6:(0,15),7:(0,21)}
  def dist(i,j):return F(str(math.dist(pos[i],pos[j])))
  if 'определите' in q:return ''.join(str(labels[z]) for z in tables[0][0][1:])
  if q.startswith('Найдите расстояние'):
   stems={k[:-1]:v for k,v in labels.items()};words=q.split();found=[]
   for w in words:
    for stem,v in stems.items():
     if w.startswith(stem):found.append(v)
   assert len(found)==2;return dist(*found)
  route=[(1,7,30)] if 'напрямик' in q else [(1,2,50),(2,5,30),(5,7,50)] if 'Егорку' in q else [(1,3,50),(3,6,30),(6,7,50)] if 'Доломино' in q else [(1,6,30),(6,7,50)]
  if 'Сколько минут' in q:return sum(dist(i,j)/v*60 for i,j,v in route)
  rate=ns(q)[0];high=sum(dist(i,j) for i,j,v in route if v==50);dirt=sum(dist(i,j) for i,j,v in route if v==30);return (41-high)*rate/dirt
 # The remaining common texts are four-village grid routes.
 key=next(k for k in grid if k in common);labels,legcells,scale=grid[key];a,b,c=[z*scale for z in legcells]
 start=re.search(r'Из деревни (\w+) в село (\w+)',common);names=[start[1],re.search(r'через деревню (\w+)',common)[1],re.search(r'до (?:деревни|села) (\w+)',common)[1],start[2]];mapping=dict(zip(names,labels));v,w=map(int,re.findall(r'скоростью (\d+) км',common))
 if 'определите' in q:return ''.join(str(mapping[re.sub(r'^[дс]\.\s*','',z)]) for z in tables[0][0][1:])
 if 'хотят купить' in q:
  want=q.split('хотят купить ')[1].split('. В каком')[0];quant=[]
  for product in ['молока','хлеба','сыра','говядины','картофеля']:
   m=re.search(r'(\d+(?:,\d+)?)\s*(?:л|кг|батона|батонов|батон)\s+'+product,want)
   quant.append(number(m[1]) if m else F(1) if product=='хлеба' and 'батон хлеба' in want else F(0))
  assert sum(z>0 for z in quant)==3
  return min(sum(qty*number(row[col]) for qty,row in zip(quant,tables[0][1:])) for col in range(1,5))
 if 'Сколько минут' in q:
  if 'сначала по шоссе' in q:return F(a-b,v)*60+F(str(math.hypot(b,c)))/w*60
  if 'через' in q:return F(a+c,v)*60
  return F(str(math.hypot(a,c)))/w*60
 # The question uses village names in their original case for grid families.
 length=a if names[0] in q else b
 return length+c if 'по шоссе' in q else math.hypot(length,c)

def audit(items):
 checked=[]
 for item in items:
  t=item['task'];r=item['record'];id=r['id'];q,common,tables=read(t['fragment']);x=number(r['answer'])
  try:
   if not common:validate_standalone(t['text'],x)
   else:
    expected=practical(q,common,tables,id,t['fragment'])
    if isinstance(expected,str):assert r['answer']==expected,(r['answer'],expected)
    else:assert abs(float(expected-x))<1e-8,(r['answer'],str(expected))
  except Exception as e:raise AssertionError(f'{id}: {e}') from e
  checked.append(id)
 return checked
if __name__=='__main__':
 payload=json.load(sys.stdin);items=payload['items'];checked=audit(items);mutations=0
 if payload.get('mutations'):
  for item in items:
   for d in [F(1),F(-1),F(1,10)]:
    changed=dict(item,record=dict(item['record']));changed['record']['answer']=str(float(number(changed['record']['answer'])+d))
    try:audit([changed])
    except (AssertionError,ValueError,ZeroDivisionError):mutations+=1
    else:raise AssertionError('Undetected wrong answer '+item['record']['id'])
 print(json.dumps(dict(checked=checked,mutationsRejected=mutations)))
