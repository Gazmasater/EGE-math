'use strict';
const {conditionText} = require('./seo-text');

// In this bank FIPI puts the game rules in question 1, while questions 2/3
// merely refer to "task 19". Match explicit group IDs, never adjacent tasks.
function attachEgeInformaticsGames(html) {
  const starts=[...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi)];
  const bodyEnd=html.search(/<\/body\s*>/i);
  const lastEnd=bodyEnd<0?html.length:bodyEnd;
  const parts=starts.map((m,i)=>({id:m[1],html:html.slice(m.index,starts[i+1]?.index??lastEnd)}));
  const groups=new Map();
  for(const part of parts) {
    const match=part.html.match(/number-in-group-text['"]>(\d+) \(([A-F0-9]+)\)/i);
    if(!match) continue;
    part.position=Number(match[1]); part.group=match[2].toUpperCase();
    // Remove FIPI's empty common container, including its script-only wrapper.
    part.html=part.html.replace(/<section class="oge-shared-condition"[^>]*>[\s\S]*?<\/section>/g,section=>
      conditionText(section).replace('Общее условие','').trim()?section:'');
    if(part.position!==1) continue;
    const cell=part.html.match(/<td\b[^>]*class=['"]cell_0['"][^>]*>([\s\S]*?)<\/td>/i)?.[1];
    if(!cell || !/Два игрока/.test(conditionText(cell))) throw new Error(`Unknown game group ${part.group}`);
    const paragraphs=[...cell.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)];
    const boundary=paragraphs.find(p=>/^(?:Будем говорить|Известно, что|Укажите|Найдите)/.test(conditionText(p[0])));
    if(!boundary) throw new Error(`Game rules boundary missing: ${part.id}`);
    const rules=cell.slice(0,boundary.index);
    if(!/начальн/i.test(conditionText(rules)) || !/заверша/i.test(conditionText(rules))) throw new Error(`Incomplete game rules: ${part.id}`);
    groups.set(part.group,{id:part.id,rules});
  }
  for(const part of parts) {
    if(!part.group) continue;
    const game=groups.get(part.group);
    if(!game) throw new Error(`Game ${part.group} has no first question on its source page`);
    const shared=`<section class="oge-shared-condition" data-game-group="${part.group}" aria-label="Правила игры"><h2>Правила игры</h2>${game.rules}</section>`;
    if(part.position===1) part.html=part.html.replace(game.rules,()=>shared);
    else part.html=part.html.replace(/(<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"][^>]*>)/i,
      opening=>`${opening}${shared}<p class="game-source"><a href="/tasks/${game.id}">Первое задание этого блока</a></p>`);
  }
  return starts.length?html.slice(0,starts[0].index)+parts.map(p=>p.html).join('')+html.slice(lastEnd):html;
}
module.exports={attachEgeInformaticsGames};
