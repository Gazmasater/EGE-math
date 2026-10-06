// Порядок столбцов и направление изменения прочитаны вручную из всех 49 условий.
const cases={};
function nucleus(id,mode,order,expected,isotope){cases[id]={kind:'nucleus',mode,order,expected,isotope};}
nucleus('C49040','beta-',['A','q'],'31');
nucleus('524FFA','alpha-capture',['A','n'],'11');
nucleus('C573F4','beta+',['A','p'],'32');
nucleus('ECAC1C','beta-',['A','p'],'31');
nucleus('3A02DC','gamma',['A','nuc'],'33');
nucleus('7CBD5C','alpha',['n','q'],'22');
nucleus('2F9AA8','alpha',['A','p'],'22',{name:'висмут-212',A:212,Z:83});
nucleus('5D57A7','beta-',['p','n'],'12',{name:'эйнштейний-256',A:256,Z:99});
nucleus('4D9ECE','electron-capture',['A','q'],'32');
nucleus('08356D','beta-',['n','A'],'23',{name:'торий-231',A:231,Z:90});
nucleus('E0A96C','alpha',['q','n'],'22');
nucleus('15A633','isotope-lighter',['p','el'],'33');
nucleus('320D3D','beta-',['A','q'],'31',{name:'эйнштейний-256',A:256,Z:99});
nucleus('6B0B8A','alpha',['q','n'],'22');
nucleus('00AFC7','neutron-capture',['A','nuc'],'11');
nucleus('890B30','neutron-capture',['q','nuc'],'31');
// nu — частота; wave — длина; E — энергия фотона; U — модуль запирающего
// напряжения; I — интенсивность. order содержит величины в порядке таблицы.
function photo(id,driver,direction,order,expected,transition){cases[id]={kind:'photo',driver,direction,order,expected,transition};}
photo('74B30F','nu',1,['nu','work'],'13',['жёлтый','синий']);
photo('EB4A08','E',-1,['U','limit'],'23');
photo('09D479','wave',-1,['K','limit'],'13');
photo('2E7F74','nu',-1,['K','work'],'23',['синий','жёлтый']);
photo('54B370','nu',1,['E','work'],'13');
photo('7A2AB4','wave',1,['wave','K'],'12',['синий','зелёный']);
photo('451A14','nu',1,['U','v'],'11',['красный','зелёный']);
photo('7A8110','I',-1,['E','p'],'33');
photo('ACD726','nu',-1,['nu','work'],'23',['синий','жёлтый']);
photo('EBA323','U',-1,['wave','K'],'12');
photo('B4DADC','wave',1,['E','limit'],'23');
photo('EE43D0','nu',-1,['nu','K'],'22',['фиолетовый','зелёный']);
photo('0A5B5E','wave',-1,['wave','K'],'21',['жёлтый','синий']);
photo('B9E35F','nu',-1,['E','K'],'22');
photo('B3B85A','nu',1,['E','K'],'11');
photo('AC915D','I',-1,['U','v'],'33');
photo('3D9E5E','U',1,['K','limit'],'13');
photo('432BA1','nu',-1,['nu','K'],'22',['синий','оранжевый']);
photo('A9E7AB','wave',-1,['wave','K'],'21',['красный','жёлтый']);
photo('ACE8CB','E',1,['wave','U'],'21');
photo('2D8D9E','U',1,['K','limit'],'13');
photo('D9F395','nu',1,['K','work'],'13');
photo('4CF3E9','E',-1,['wave','limit'],'13');
photo('E136E8','I',1,['electronRate','v'],'13');
photo('36CFE0','I',-1,['U','v'],'33');
photo('C06E62','wave',-1,['wave','K'],'21',['жёлтый','зелёный']);
photo('63D969','U',1,['wave','limit'],'23');
photo('10C93F','U',1,['K','limit'],'13');
photo('8DE137','E',-1,['wave','limit'],'13');
photo('27D78C','wave',1,['wave','K'],'12',['фиолетовый','красный']);
photo('C1C98B','I',1,['photonRate','c'],'13');
photo('8C528C','wave',1,['wave','K'],'12',['ультрафиолетовый','синий']);
photo('5AF6A9','nu',-1,['U','work'],'23',['синий','зелёный']);
module.exports={cases};
