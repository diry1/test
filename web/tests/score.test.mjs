import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateScore, nextScoreTarget} from '../score.mjs';
const cars = new Map([
  ['x5', {id:'x5',brand:'BMW',generations:[{id:'f15'},{id:'e70'}]}],
  ['three', {id:'three',brand:'BMW',generations:[]}],
  ['golf', {id:'golf',brand:'Volkswagen',generations:[{id:'mk1'}]}],
]);
const score = rows => calculateScore(rows,cars);
test('model discovery and first brand bonus; retroactive generation identification',()=>{
  assert.equal(score([]).total,0);
  assert.equal(score([{carID:'x5'}]).total,21);
  assert.equal(score([{carID:'x5'},{carID:'x5',generationID:'f15'}]).total,22);
  assert.equal(score([{carID:'x5',generationID:'f15'}]).total,22);
});
test('duplicate sightings, trims and photos cannot farm points',()=>{
  const rows = Array.from({length:30},(_,i)=>({carID:'x5',generationID:'f15',specificationID:`trim-${i}`,photo:'photo'}));
  assert.equal(score(rows).total,22);
  assert.equal(score([...rows,{carID:'x5',generationID:'e70'}]).total,23);
});
test('same brand has one bonus; new brand gets another bonus',()=>{
  const result=score([{carID:'x5',generationID:'f15'},{carID:'three'},{carID:'golf',generationID:'mk1'}]);
  assert.equal(result.total,45);
  assert.equal(result.brands,2);
  assert.equal(result.models,3);
  assert.equal(result.generations,2);
});
test('unknown and mismatched records cannot earn generation points',()=>{
  assert.equal(score([{carID:'missing',generationID:'f15'}]).total,0);
  assert.equal(score([{carID:'three',generationID:'f15'}]).total,21);
});
test('deletion and re-adding restore the same score, not accumulated rewards',()=>{
  const a={carID:'x5',generationID:'f15'};
  assert.equal(score([a,a]).total,22);
  assert.equal(score([a]).total,22);
  assert.equal(score([]).total,0);
  assert.equal(score([a]).total,22);
});
test('gauge always has a reachable target beyond current points',()=>{
  for(const total of [0,99,100,250,999,10000,25000])assert.ok(nextScoreTarget(total)>total);
  assert.equal(nextScoreTarget(100),250);
});
