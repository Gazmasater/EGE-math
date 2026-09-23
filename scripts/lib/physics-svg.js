const fs=require('node:fs'),path=require('node:path');
const C={ink:'#263b53',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',gray:'#a6b3c2'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const label=s=>esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const txt=(x,y,s,color=C.ink,size=20,anchor='start')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="3" stroke-linejoin="round">${label(s)}</text>`;
const line=(x,y,X,Y,c=C.ink,w=2,dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const rect=(x,y,w,h,c='#eef5ff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="${C.ink}" stroke-width="2"/>`;
const dot=(x,y,c=C.blue)=>`<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`;
function arrow(x,y,dx,dy,color=C.blue,s='',off=[10,-10,'start']){
 const key=Object.keys(C).find(k=>C[k]===color);
 return `<path d="M${x} ${y}l${dx} ${dy}" stroke="white" stroke-width="7" fill="none"/><path d="M${x} ${y}l${dx} ${dy}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#ph-${key})"/>`+(s?txt(x+dx+off[0],y+dy+off[1],s,color,18,off[2]):'');
}
const force=(...a)=>arrow(...a)+dot(a[0],a[1],a[4]);
function dimensions(b){
 if(b[0]===137)return[b.readUInt32BE(16),b.readUInt32BE(20)];
 if(b.subarray(0,3).toString()==='GIF')return[b.readUInt16LE(6),b.readUInt16LE(8)];
 if(b[0]!==255||b[1]!==216)throw Error('Unknown raster');
 let n=2;while(n<b.length){if(b[n++]!==255)continue;let m=b[n++];if(m===0xd8||m===0xd9)continue;const len=b.readUInt16BE(n);if([0xc0,0xc1,0xc2].includes(m))return[b.readUInt16BE(n+5),b.readUInt16BE(n+3)];n+=len;}throw Error('JPEG dimensions');
}
function original(file,x,y,maxw,maxh){
 const b=fs.readFileSync(path.join(__dirname,'../../fipi-assets',file)),[iw,ih]=dimensions(b),s=Math.min(maxw/iw,maxh/ih),w=iw*s,h=ih*s;
 return {w,h,X:v=>x+w*v,Y:v=>y+h*v,body:`<image data-fipi-source="${esc(file)}" x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/${b[0]===137?'png':b[0]===71?'gif':'jpeg'};base64,${b.toString('base64')}"/>`};
}
function words(s,max=53){const rows=[];let row='';for(const w of String(s).split(/\s+/)){if(row.length+w.length>max){rows.push(row);row=w}else row+=(row?' ':'')+w}if(row)rows.push(row);return rows;}
function cards(stages,y){let b='';for(const[i,stage]of stages.entries()){
 const rows=stage.flatMap((s,j)=>words(s,j?56:49).map(t=>({t,j}))),h=24+rows.length*27;
 b+=`<rect x="28" y="${y}" width="624" height="${h}" rx="12" fill="${['#edf4ff','#fff5e8','#ecf8f1'][i%3]}" stroke="#c6d3e1"/>`;
 rows.forEach((r,j)=>b+=txt(48,y+29+j*27,r.t,C.ink,r.j?18:20));y+=h+16;
 }return{body:b,end:y};}
function svg(id,title,caption,body,height){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${height}" role="img" aria-labelledby="ph-title-${id}" data-physics-diagram="${id}"><title id="ph-title-${id}">${esc(caption)}</title><defs>${Object.entries(C).map(([k,c])=>`<marker id="ph-${k}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><rect width="680" height="${height}" rx="14" fill="white"/><g font-family="Arial,sans-serif">${txt(28,36,id+' · '+title,C.ink,22)}${body}</g></svg>`;}
module.exports={C,esc,txt,line,rect,dot,arrow,force,dimensions,original,cards,svg};
