import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchIndex,searchCatalogue} from '../search.mjs';
const cars = [
  {id:'amc',brand:'AMC',name:'Eagle',generations:[]},
  {id:'aix',brand:'Aixam',name:'City',generations:[]},
  {id:'alt',brand:'Altamera',name:'Unknown',generations:[]},
  {id:'bmw',brand:'BMW',name:'3 Series',referenceVariants:[{name:'320i'}],generations:[{id:'f31',name:'F31',specifications:[{id:'spec',name:'320i (184 hp)'}]}]},
];
const index=buildSearchIndex(cars,['Hidden brand']);
test('suggestions use prefixes rather than contained letters',()=>{
  const brands=searchCatalogue(index,'AM').filter(r=>r.entry.type==='brand').map(r=>r.entry.title);
  assert.deepEqual(brands,['AMC']);
  assert(searchCatalogue(index,'am')[0].entry.type==='brand');
  assert(!searchCatalogue(index,'ixam').length);
  assert(searchCatalogue(index,'ixam',true).some(r=>r.entry.title==='Aixam'));
});
test('global model, alias, generation and specification matching retains destination',()=>{
  assert(searchCatalogue(index,'3 ser').some(r=>r.entry.route.carID==='bmw'));
  assert(searchCatalogue(index,'F31').some(r=>r.entry.route.generationID==='f31'));
  assert(searchCatalogue(index,'320i').some(r=>r.entry.type==='model'));
  assert(searchCatalogue(index,'BMW F31 184',true).some(r=>r.entry.route.specificationID==='spec'));
  assert(searchCatalogue(index,'hidden').some(r=>r.entry.type==='brand'));
});
test('exact names precede longer prefixes, with deterministic order',()=>{
  const items=buildSearchIndex([] ,['AM Cars','AMC','AM']);
  assert.deepEqual(searchCatalogue(items,'am').map(r=>r.entry.title),['AM','AM Cars','AMC']);
  assert.deepEqual(searchCatalogue(index,'  '),[]);
});
