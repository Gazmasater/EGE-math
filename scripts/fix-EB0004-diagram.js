const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const now=new Date().toISOString();
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300">
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c62828"/></marker></defs>
<path d="M70 18v12l-8 8 16 8-16 8 16 8-16 8 16 8-8 8v30" fill="none" stroke="#333" stroke-width="2"/>
<path d="M230 18v12l-8 8 16 8-16 8 16 8-16 8 16 8-8 8v30" fill="none" stroke="#333" stroke-width="2"/>
<line x1="70" y1="130" x2="230" y2="130" stroke="#222" stroke-width="6"/>
<line x1="70" y1="130" x2="70" y2="88" stroke="#c62828" stroke-width="3" marker-end="url(#arrow)"/>
<line x1="230" y1="130" x2="230" y2="88" stroke="#c62828" stroke-width="3" marker-end="url(#arrow)"/>
<text x="38" y="84" fill="#c62828">F<tspan baseline-shift="sub" font-size="70%">л</tspan></text><text x="236" y="84" fill="#c62828">F<tspan baseline-shift="sub" font-size="70%">пр</tspan></text>
<line x1="150" y1="130" x2="150" y2="190" stroke="#c62828" stroke-width="3" marker-end="url(#arrow)"/><text x="157" y="188" fill="#c62828">Mg</text>
<line x1="220" y1="130" x2="220" y2="190" stroke="#c62828" stroke-width="3" marker-end="url(#arrow)"/><rect x="204" y="190" width="32" height="28" fill="#ddd" stroke="#222"/><text x="240" y="210" fill="#c62828">mg</text>
<line x1="70" y1="245" x2="230" y2="245" stroke="#183153" stroke-width="2"/><text x="142" y="240" fill="#183153">L</text>
<line x1="220" y1="265" x2="230" y2="265" stroke="#183153" stroke-width="2"/><text x="211" y="286" fill="#183153">d</text>
</svg>`;
const solution='Растяжения пружин одинаковы, поэтому по закону Гука F_л:F_пр=1:2. Из равновесия F_л+F_пр=(M+m)g, значит F_пр=⟦2¦3⟧(M+m)g. Моменты относительно левой пружины: F_прL=Mg⟦L¦2⟧+mg(L−d). При L=0,30 м, d=0,05 м, m=3 кг: ⟦2¦3⟧(M+3)=⟦M¦2⟧+⟦5·3¦6⟧. Отсюда M=3 кг. Ответ: 3 кг.';
db.prepare('update solutions set solution=?,diagram_svg=?,diagram_caption=?,updated_at=? where task_id=?').run(solution,svg,'Стержень на двух вертикальных пружинах: F_л, F_пр, Mg и mg',now,'EB0004');
console.log('EB0004 diagram updated');
