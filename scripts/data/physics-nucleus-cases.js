// Параметры вручную прочитаны из условий и исходных растров ФИПИ.
// A — массовое число, Z — зарядовое; порядок ответа сохраняет порядок граф таблицы.
const cases={};
function count(id,Z,A,order='pn',table=''){cases[id]={kind:'count',Z,A,order,table};}
count('2B1449',50,119);count('BA68F8',78,187,'ne');count('23190A',47,108);
count('2DC278',30,65);count('A3ED17',31,69,'n');count('025229',83,208,'p');
count('EFD052',26,55);count('443DAA',26,56);count('4BE6E6',17,35);count('1B27E1',79,197);
count('EC8EE5',49,109);count('208C3C',79,197,'e');count('7DBD83',92,235,'n');count('BBF494',83,212);
count('B00348',31,69,'pn','Галлий: изотоп 69 имеет долю 60%, изотоп 71 — 40%. Самый распространённый из приведённых — 69.');
count('10ACF0',3,7,'pn','Литий: изотоп 7 имеет долю 93%, изотоп 6 — 7%. Наибольшая доля соответствует массовому числу 7.');
count('1182F1',29,65,'pn','Медь: изотоп 63 имеет долю 69%, изотоп 65 — 31%. Наименее распространённый из приведённых — 65.');
count('A773F6',29,65,'p','Медь: у изотопа 65 доля 31%, что меньше 69% для изотопа 63. Порядковый номер обоих изотопов равен 29.');
count('832908',19,39,'n','Калий: изотоп 39 имеет долю 93%, изотоп 41 — 6,7%. Требуется изотоп с большей долей — 39.');
count('FCC0BD',12,25,'pn','Магний: для массовых чисел 24, 26 и 25 указаны доли 79%, 11% и 10%. Минимальной доле 10% соответствует именно 25.');
count('9D0120',19,39,'pn','Калий: изотоп 39 имеет долю 93%, изотоп 41 — 6,7%. Выбираем наиболее распространённый изотоп 39.');
count('46CBD4',31,71,'pn','Галлий: доли изотопов 69 и 71 равны 60% и 40%. Меньшая доля соответствует массовому числу 71.');
count('B4965C',12,24,'pn','Магний: доли изотопов 24, 26 и 25 составляют 79%, 11% и 10%. Выбираем массовое число 24.');
count('114583',4,9,'p','В ячейке бериллия указан порядковый номер 4 и единственный приведённый стабильный изотоп с массовым числом 9, доля 100%.');
count('291E83',20,44,'pn','Кальций: для изотопов 40 и 44 указаны доли 97% и 2,1%. Наименее распространённый из приведённых — 44.');
// Члены ядерного уравнения: [название, A, Z, число частиц]. Неизвестное X задаётся отдельно.
function reaction(id,left,right,side='right',order='ZA',mode='reaction'){cases[id]={kind:'reaction',left,right,side,order,mode};}
const U235=['уран',235,92],neutron=['нейтрон',1,0],alpha=['α-частица',4,2],proton=['протон',1,1],D=['дейтерий',2,1];
reaction('51A14C',[neutron,U235],[['цезий',145,55],['нейтрон',1,0,3]],'right','A');
reaction('51C0F9',[['бериллий',9,4],['γ-квант',0,0]],[neutron]);
reaction('6E1C06',[neutron,U235],[['криптон',94,36],['нейтрон',1,0,3]]);
reaction('73F87D',[alpha,['бор',10,5]],[neutron],'right','Z');
reaction('018DD9',[['азот',14,7],alpha],[proton],'right','Z');
reaction('4E8A5D',[alpha,['литий',7,3]],[neutron],'right','Z');
reaction('A21154',[neutron,['уран',238,92]],[['нейтрон',1,0,2]],'right','Z');
reaction('F3BEA3',[D,D],[proton]);
reaction('1FCCAC',[alpha,['бор',11,5]],[neutron]);
reaction('2787C9',[proton,['литий',7,3]],[alpha]);
reaction('9CE5C3',[alpha,['бериллий',9,4]],[neutron]);
reaction('6791CC',[neutron],[['криптон',94,36],['барий',139,56],['нейтрон',1,0,3]],'left');
reaction('AC25E0',[['бор',10,5],neutron],[alpha],'right','AZ');
reaction('EDE5E5',[neutron,U235],[['барий',139,56],['нейтрон',1,0,3]]);
reaction('4E4A6F',[['бор',11,5],alpha],[neutron],'right','AZ');
reaction('783A63',[D],[['бор',10,5],neutron],'left','AZ');
reaction('EF2E6D',[['литий',6,3],D],[alpha],'right','A');
reaction('DBDB89',[D,D],[neutron]);
reaction('526485',[U235,neutron],[['ксенон',140,54],['нейтрон',1,0,2]]);
function decayNucleus(id,name,A,Z,mode,order='ZA'){
 reaction(id,[[name,A,Z]],mode==='alpha'?[alpha]:[['электрон',0,-1],['антинейтрино',0,0]],'right',order,mode);
}
decayNucleus('2B6FF4','таллий',210,81,'beta');decayNucleus('8217F2','менделевий',258,101,'alpha','AZ');
decayNucleus('7DBC2D','протактиний',226,91,'alpha');decayNucleus('6DA0D0','полоний',195,84,'alpha','Z');
decayNucleus('CCF155','платина',174,78,'alpha','Z');decayNucleus('7C1C92','осмий',195,76,'beta');
decayNucleus('27B09D','радий',226,88,'alpha');decayNucleus('AE1495','торий',234,90,'beta','Z');
decayNucleus('E0F59A','радий',229,88,'beta');decayNucleus('7F9E81','висмут',192,83,'alpha','Z');
decayNucleus('BF9E88','радий',228,88,'beta','AZ');decayNucleus('A2B69D','висмут',212,83,'alpha','pn');
// Радиоактивный распад: величины в единицах самого условия, время и T в одинаковых единицах.
function decay(id,T,t,initial,unit,mode='remaining',timeUnit='мин',extra={}){cases[id]={kind:'decay',T,t,initial,unit,mode,timeUnit,...extra};}
decay('4C2E4A',18,54,120,'мг');decay('29EB4C',10,30,28,'мг','remaining','сут');
decay('E42042',30,60,1,'','factor','сут');decay('17ABFD',10,20,100,'%','remaining','сут');
decay('F60603',48,96,1,'','factor');decay('CEDB0C',11.4,11.4,2,'мкмоль','helium','сут');
decay('E8F305',12.4,37.2,1,'мкмоль','remaining','ч');decay('DCA275',1,2,100,'%','decayed','T');
decay('382D7A',3.6,7.2,2,'мкмоль','helium','сут');
decay('AB2CB2',3.6,10.8,1,'моль','helium','сут',{atoms:'6 · 10²³',atomsNumber:6e23});
decay('0AE41E',23,92,4,'мкмоль');decay('23065B',5,15,100,'%','decayed','сут');
decay('225158',8,16,.1,'моль','remaining','сут');decay('9758C9',81,162,.2,'моль');
decay('38C6C8',3,9,.4,'моль','remaining','мин',{atoms:'2,4 · 10²³',atomsNumber:2.4e23});
decay('3D189C',73,146,2,'мкмоль','remaining','с');decay('727DED',1,2,100,'%','remaining','T');
decay('11ADE6',12.4,24.8,2,'мкмоль','remaining','ч');decay('CE6369',15,60,80,'мг','remaining','сут');
decay('CFDA37',2.6,5.2,104,'мг','remaining','года');decay('4E738E',21,42,.8,'мкмоль','remaining','ч');
decay('E47D8A',2,4,100,'%','decayed','ч');
for(const [id,lambda]of [['8F0C7B',.04],['09F656',.02],['FBBB96',.4],['89D780',.05]])cases[id]={kind:'lambda',lambda};
cases.B31CD6={kind:'time',T:21,factor:4,unit:'ч',find:'time'};
cases.E423E8={kind:'time',T:26,factor:8,unit:'лет',find:'time',initial:'2 · 10¹⁰',final:'2,5 · 10⁹'};
cases.BCED39={kind:'time',t:9,factor:8,unit:'года',find:'period'};
// Графики: непосредственно прочитанные N(0), T, степень масштаба вертикальной оси.
for(const [id,T,N0,exp,unit]of [
 ['453BF5',5,6,20,'мин'],['E416F3',25,6,20,'мин'],['8F8B26',5,6,18,'мин'],
 ['B212D5',192,100,20,'ч'],['7428AB',5,12,20,'ч'],['FA1532',50,100,18,'с'],
 ['B7393B',50,12,15,'с'],['371D5C',4,5,20,'мкс'],['B41DCE',30,8,20,'мин']
])cases[id]={kind:'graph',T,N0,exp,unit};
// Все точки исходной схемы перечислены явно; правильную определяет закон распада.
cases['1EFF0B']={kind:'points',T:6,N0:8,exp:20,unit:'мин',product:false,points:[[6,5],[12,3],[18,1],[30,1]]};
cases['8B060E']={kind:'points',T:60,N0:8,exp:20,unit:'мин',product:false,points:[[60,5],[120,2],[210,1],[240,0]]};
cases['72EC29']={kind:'points',T:20,N0:8,exp:17,unit:'ч',product:false,points:[[20,4],[40,3],[60,2],[80,1]]};
cases['1D5FAF']={kind:'points',T:20,N0:8,exp:20,unit:'ч',product:true,points:[[20,3],[40,5],[60,7],[80,8]]};
module.exports={cases};
