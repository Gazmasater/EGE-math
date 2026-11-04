'use strict';
const {createHash}=require('node:crypto');
const reviews=require('./ege-informatics-restored-attachments.json');
function restoreEgeInformaticsAttachments(fragment,id){
 const review=reviews[id];if(!review)return fragment;
 const content=fragment.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
 if(createHash('sha256').update(content).digest('hex')!==review.sourceHash)return fragment;
 const marker=/<TD\b[^>]*class='cell_0'>/g,matches=[...fragment.matchAll(marker)];
 if(matches.length!==1||/class="fipi-attachment"/.test(fragment))return fragment;
 const links=review.files.map(({url,label})=>{
  if(!/^\/fipi\/ege-informatics\/restored-2021\/[\w.-]+\.(ods|odt|txt)$/.test(url)||/[<>&"']/.test(label))throw new Error('Invalid restored attachment');
  return `<a class="fipi-attachment" href="${url}" download>${label}</a>`;
 }).join(' ');
 // Add links inside the condition cell; never change the downloaded raw HTML.
 return fragment.replace(marker,match=>match+'<p class="fipi-restored-attachments">'+links+'</p>');
}
module.exports={restoreEgeInformaticsAttachments};
