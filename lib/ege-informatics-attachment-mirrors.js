'use strict';
const mirrors=require('./ege-informatics-attachment-mirrors.json');
function mirroredInformaticsAsset(relative,section){
 if(section!=='ege-informatics'||!Object.hasOwn(mirrors,relative))return relative;
 const row=mirrors[relative];
 if(!/^docs\/(?:official-open\/20\d{2}\/|restored-(?:library|robot|spreadsheets|strings|processes|sequences|sorting|databases|clusters|optimization|final)\/)EGEINF[A-F\d]{6}(?:-[A-Za-z0-9_]+)?\.(?:txt|ods|odt|zip)$/u.test(row.localRelative))throw new Error('Invalid verified FIPI attachment path');
 return row.localRelative;
}
module.exports={mirroredInformaticsAsset};
