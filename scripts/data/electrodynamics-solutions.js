const assert=require('node:assert/strict');
const records={};
for(const name of ['lc','capacitors','switch-energy','dc-power','dc-more','diodes','self-induction','circuits-final','induction-basic','electric-motion','electrostatics','magnetic-particles','magnetic-more','induction-final','magnetic-mechanics','frames','rails','lenses-basic','optical-motion','apertures','optical-systems','diffraction-camera','refraction','figures','qualitative-optics'])for(const[id,r]of Object.entries(require('./electrodynamics-'+name).records)){
 assert.ok(!records[id],id+': duplicate draft');records[id]=r;
}
module.exports={records};
