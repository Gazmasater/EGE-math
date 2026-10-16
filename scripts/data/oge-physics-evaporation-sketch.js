module.exports=(r,y,escape)=>{
 const p=['<text x="225" y="34" font-size="23" fill="#17324d">Ход рассуждения</text>'];
 let z=65;
 for(const stage of r.sketch.stages){
  const lines=[''];
  for(const word of stage.split(' ')){
   if((lines.at(-1)+' '+word).length>45)lines.push(word);
   else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;
  }
  const h=32+lines.length*28;
  p.push(`<rect x="44" y="${z}" width="590" height="${h}" rx="8" fill="#e7f0f8" stroke="#829bb2" stroke-width="2"/>`);
  lines.forEach((line,j)=>p.push(`<text x="65" y="${z+33+j*28}" font-size="20" fill="#17324d">${escape(line)}</text>`));
  z+=h+20;
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:z+12};
};
