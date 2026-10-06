// Все направления стрелок и номера вариантов прочитаны с исходных рисунков ФИПИ.
const cases={
 '7D7448':{kind:'formula',order:['wave','nu'],options:['p/h','h/p','E/p','E/h'],expected:'24'},
 '64FC99':{kind:'formula',order:['nu','p'],options:['h/wave','h*wave/c','c/wave','c*wave'],expected:'31'},
 BD7F43:{kind:'reaction',alpha:3,beta:2,expected:'32',alphaData:[227,89,223,87],betaData:[238,93,238,94],others:'В вариантах 1 и 4 слева присутствуют сталкивающиеся частицы: это реакции с бомбардировкой ядра, а не самопроизвольные распады.'},
 FA06DF:{kind:'reaction',alpha:1,beta:3,expected:'13',alphaData:[239,94,235,92],betaData:[11,6,11,7],others:'В варианте 2 ядро азота облучается α-частицами — это не α-распад. В варианте 4 испускается позитрон и зарядовое число уменьшается: это β⁺-распад, а требуется электронный β⁻-распад.'},
 '93EDA9':{kind:'reaction',alpha:3,beta:1,expected:'31',alphaData:[227,89,223,87],betaData:[11,6,11,7],others:'В вариантах 2 и 4 слева вместе с ядром стоят налетающие частицы — нейтрон или дейтрон. Возникновение гелия в реакции с бомбардировкой само по себе не делает её α-распадом.'},
 FF6C82:{kind:'reaction',alpha:1,beta:4,expected:'14',alphaData:[176,77,172,75],betaData:[178,71,178,72],others:'Вариант 2 описывает столкновение двух ядер, вариант 3 — захват нейтрона с испусканием γ-кванта. Эти процессы не относятся к требуемым α- и β-распадам.'},
 D4FFF9:{kind:'graph',expected:'23'},
 '369826':{kind:'graph',expected:'21'}
};
function levels(id,arrows,queries,output,expected){cases[id]={kind:'levels',arrows,queries,output,expected};}
// Стрелка [начальный уровень, конечный уровень]; уровни E0<E1<E2<E3<E4.
// Запрос [abs|emit, min|max, nu|wave|energy]. Выход — номер стрелки или варианта энергии/перехода.
levels('F926FD',[[0,4],[0,2],[1,0],[3,0]],[['abs','min','wave'],['emit','min','nu']],'energy','41');
levels('AB5BFF',[[0,3],[2,0],[0,1],[4,0]],[['abs','min','nu'],['emit','max','nu']],'arrow','34');
levels('F37670',[[1,0],[2,0],[0,3],[0,4]],[['abs','min','nu'],['emit','max','nu']],'arrow','32');
levels('90AF7F',[[1,0],[4,0],[0,2],[0,3]],[['abs','min','wave'],['emit','min','nu']],'energy','31');
levels('6BBB75',[[1,0],[2,0],[0,3],[0,4]],[['emit','max','wave'],['abs','min','energy']],'arrow','13');
levels('BE27DA',[[1,0],[2,0],[0,3],[0,4]],[['abs','max','nu'],['emit','min','nu']],'arrow','41');
levels('4AE2AE',[[1,0],[4,0],[0,2],[0,3]],[['abs','max','wave'],['emit','min','energy']],'energy','21');
levels('5B1FA7',[[0,3],[0,4],[2,0],[1,0]],[['abs','min','wave'],['emit','min','nu']],'energy','41');
levels('BE82C1',[[1,0],[3,0],[0,2],[0,4]],[['abs','max','wave'],['emit','min','nu']],'energy','21');
levels('41596C',[[0,1],[0,2],[3,0],[4,0]],[['abs','min','nu'],['emit','min','energy']],'arrow','13');
levels('9F8E6C',[[0,1],[0,2],[3,0],[4,0]],[['abs','max','wave'],['emit','min','energy']],'arrow','13');
levels('6A3D3F',[[0,1],[0,2],[3,0],[4,0]],[['abs','max','nu'],['emit','min','nu']],'arrow','23');
levels('8DC935',[[1,0],[2,0],[0,3],[0,4]],[['abs','min','nu'],['emit','max','nu']],'arrow','32');
levels('667358',[[0,1],[0,2],[3,0],[4,0]],[['abs','max','wave'],['emit','max','wave']],'transition','13');
levels('9AC530',[[0,1],[0,2],[3,0],[4,0]],[['abs','max','wave'],['emit','min','wave']],'transition','14');
module.exports={cases};
