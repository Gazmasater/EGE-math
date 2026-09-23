const groups=['photons','photoelectric','electric-fields','magnetic-fields','atoms','nuclei','qualitative'];
const records={};
for(const group of groups)for(const[id,r]of Object.entries(require('./quantum-'+group).records)){
 if(records[id])throw Error('Duplicate quantum solution '+id);
 records[id]=r;
}
module.exports={records};
