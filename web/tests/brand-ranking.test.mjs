import test from 'node:test';
import assert from 'node:assert/strict';
import {brandScore, selectMainBrands, isMainBrand} from '../brand-ranking.mjs';

test('small popular lineups beat large obscure catalogues', () => {
  assert(brandScore(4,true,[1,1,1]).score > brandScore(100,false,[9,10,10]).score);
  assert.equal(brandScore(20,false).breadth,brandScore(200,false).breadth);
});
test('missing observations use a neutral baseline and curation can retain a brand', () => {
  assert.equal(brandScore(2,true,[]).popularity,50);
  assert(selectMainBrands([{brand:'Rivian'}],new Set(['Rivian'])).has('Rivian'));
});
test('explicit hide and promotion override scores and small-letter unfolding', () => {
  assert.equal(isMainBrand('Tesla',new Set(['Tesla']),new Map([['Tesla',false]]),true),false);
  assert.equal(isMainBrand('Rare',new Set(),new Map([['Rare',true]])),true);
  assert.equal(isMainBrand('Rare',new Set(),new Map(),true),true);
});
test('popularity can promote brands absent from the curated list', () => {
  assert(selectMainBrands([{brand:'Popular'}],new Set(),{Popular:{modelDeciles:[1]}}).has('Popular'));
  assert(!selectMainBrands([{brand:'Obscure'}],new Set(),{Obscure:{modelDeciles:[10]}}).has('Obscure'));
});
