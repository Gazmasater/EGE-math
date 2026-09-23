const assert=require('node:assert/strict');
const records={};
for(const name of ['gases','humidity','vaporization','pistons','mercury','buoyancy','mechanical','qualitative','graphs','cycles','final']){
  for(const[id,r]of Object.entries(require('./thermal-'+name).records)){
    assert.ok(!records[id],id+': duplicate draft');records[id]=r;
  }
}
assert.equal(Object.keys(records).length,123);
module.exports={records};
