module.exports=(r,y,escape)=>{
 if(r.sketch.kind!=='scattering')return require('./oge-physics-evaporation-sketch')(r,y,escape);
 const p=[],marker=`url(#arrow-${r.id})`;
 const label=(s,x,z)=>p.push(`<text x="${x}" y="${z}" font-size="20" fill="#17324d">${escape(s)}</text>`);
 const arrow=(x,z,a,b)=>p.push(`<path d="M ${x} ${z} L ${a} ${b}" stroke="#b05613" stroke-width="3" marker-end="${marker}"/>`);
 p.push('<path d="M 68 82 L 586 62 L 586 142 L 68 122 Z" fill="#fff0b5"/><rect x="35" y="82" width="34" height="40" rx="5" fill="#839bb2"/>');
 label('Луч прожектора',60,32);label('Капля воды',283,191);
 for(const [x,z,radius]of [[190,84,6],[267,118,7],[334,102,12],[424,84,6],[513,128,7]])p.push(`<circle cx="${x}" cy="${z}" r="${radius}" fill="#b7dfef" stroke="#467c96" stroke-width="2"/>`);
 arrow(85,102,301,102);arrow(347,102,565,102);arrow(334,102,377,42);arrow(334,102,481,240);
 p.push('<path d="M 496 256 Q 520 235 544 256 Q 520 277 496 256 Z" fill="white" stroke="#467c96" stroke-width="2"/><circle cx="520" cy="256" r="7" fill="#17324d"/>');
 label('Свет в сторону наблюдателя',75,251);label('Глаз',497,302);
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:330};
};
