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
test('numeric suggestions include numbers within names across brands',()=>{
 const data=buildSearchIndex([
  {id:'merc',brand:'Mercedes-Benz',name:'E320',generations:[]},
  {id:'bmw',brand:'BMW',name:'320i',generations:[]},
  {id:'mazda',brand:'Mazda',name:'323',generations:[]},
 ]);
 for (const submitted of [false,true]) assert.deepEqual(searchCatalogue(data,'320',submitted).map(r=>r.entry.title).sort(),['320i','E320']);
});
test('submitted searches return matching paths in hierarchy order, excluding unrelated cars',()=>{
 const data=buildSearchIndex([
  {id:'p',brand:'Porsche',name:'911',generations:[{id:'g',name:'992',specifications:[{id:'s',name:'Carrera'}]}]},
  {id:'b',brand:'BMW',name:'Porsche Edition',generations:[]},
  {id:'a',brand:'AMC',name:'Eagle',generations:[]},
 ]);
 const results=searchCatalogue(data,'porsche',true);
 assert.deepEqual(results.map(r=>r.entry.type),['brand','model','model','generation','specification']);
 assert(results.every(r=>r.entry.text.includes('porsche')));
 assert(!results.some(r=>r.entry.route.carID==='a'));
});
test('live multi-word searches cross hierarchy levels in any order',()=>{
 const data=buildSearchIndex([
  {id:'bmw',brand:'BMW',name:'3 Series',referenceVariants:[{name:'320i'}],generations:[{id:'e30',name:'E30',specifications:[{id:'320',name:'320i (129 hp)'}]}]},
  {id:'merc',brand:'Mercedes-Benz',name:'E320',generations:[]},
 ]);
 for (const submitted of [false,true]) {
  for (const query of ['bmw e30','e30 bmw','BMW 320i','bmw e30 320','bmw   3 ser e30']) {
   const results=searchCatalogue(data,query,submitted);
   assert(results.some(r=>r.entry.route.specificationID==='320'),query);
   assert(results.every(r=>r.entry.route.brand==='BMW'),query);
  }
  assert(!searchCatalogue(data,'bmw e320',submitted).length);
 }
 assert(searchCatalogue(data,'bmw 320i').some(r=>r.entry.type==='model'));
 assert(!searchCatalogue(data,'bmw mw').length); // Prefixes still apply to individual words.
});
