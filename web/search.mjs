export const normalizeSearch = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function buildSearchIndex(cars, featured = []) {
  const entries = [];
  const add = (type, title, path, route, aliases = [], attributes = {}) => {
    const label = path.join(' › ');
    entries.push({type,title,label,route,...attributes, keys: [...new Set([title, ...aliases, path.join(' '), ...aliases.map(a => [...path.slice(0,-1),a].join(' '))].map(normalizeSearch))], text: normalizeSearch([label,...aliases].join(' ')), words: normalizeSearch([label,...aliases].join(' ')).split(' ')});
  };
  for (const brand of new Set([...featured,...cars.map(c=>c.brand)])) add('brand',brand,[brand],{brand});
  for (const car of cars) {
    const base = [car.brand,car.name], route = {brand:car.brand,carID:car.id};
    add('model',car.name,base,route,(car.referenceVariants??[]).map(r=>r.name));
    for (const family of car.generationFamilies??[]) {
      add('generation',family.name,[...base,family.name],{...route,familyID:family.id},[],{yearFrom: Math.min(...family.phases.map(p=>p.yearFrom).filter(Number.isFinite)), yearTo: family.phases.every(p=>Number.isFinite(p.yearTo)) ? Math.max(...family.phases.map(p=>p.yearTo)) : null});
    }
    for (const generation of car.generations) {
      const family = car.generationFamilies?.find(f=>f.phases.some(p=>p.id===generation.id));
      const phase = family?.phases.find(p=>p.id===generation.id);
      const path = family ? [...base,family.name,phase.name] : [...base,generation.name];
      const genRoute = {...route,generationID:generation.id,...(family ? {familyID:family.id} : {})};
      const dates = {yearFrom:generation.yearFrom,yearTo:generation.yearTo};
      add('generation',family ? `${family.name} · ${phase.name}` : generation.name,path,genRoute,[],dates);
      for (const body of phase?.bodyStyles??[]) add('body style',body.name,[...path,body.name],{...genRoute,bodyID:body.id},[],dates);
      for (const spec of generation.specifications??[]) add('specification',spec.name,[...path,spec.name],{...genRoute,specificationID:spec.id},[],{...dates,hp:parseHorsepower(spec.name)});
    }
  }
  return entries;
}
export function parseHorsepower(name) {
  const match = String(name).match(/\b(\d+(?:[.,]\d+)?)\s*hp\b/i);
  return match ? Number(match[1].replace(',','.')) : null;
}
export function matchesFilters(entry, filters = {}) {
  if (filters.brand && entry.route.brand !== filters.brand) return false;
  if (filters.model && entry.route.carID !== filters.model) return false;
  const value = key => filters[key] === '' || filters[key] == null ? null : Number(filters[key]);
  const from=value('yearFrom'),to=value('yearTo'),min=value('hpMin'),max=value('hpMax');
  if ([from,to,min,max].some(v=>v!==null && !Number.isFinite(v))) return false;
  if (from!==null && to!==null && from>to || min!==null && max!==null && min>max) return false;
  if (from!==null || to!==null) {
    if (!Number.isFinite(entry.yearFrom)) return false;
    if (to!==null && entry.yearFrom>to || from!==null && Number.isFinite(entry.yearTo) && entry.yearTo<from) return false;
  }
  if (min!==null || max!==null) {
    if (!Number.isFinite(entry.hp)) return false;
    if (min!==null && entry.hp<min || max!==null && entry.hp>max) return false;
  }
  return true;
}
export function searchCatalogue(index, query, submitted = false, filters = {}) {
  const q = normalizeSearch(query);
  if (!q && !Object.values(filters).some(v=>v!=='' && v!=null)) return [];
  const tokens = q.split(' ');
  const numericQuery = /^\d+$/.test(q);
  const priority = {'brand':0,'model':1,'generation':2,'body style':3,'specification':4};
  const ranked = [];
  for (let id=0; id<index.length; id++) {
    const entry=index[id];
    if (!matchesFilters(entry,filters)) continue;
    const exact=entry.keys.includes(q), prefix=exact || entry.keys.some(k=>k.startsWith(q));
    const numberMatch = numericQuery && entry.keys.some(k => k.includes(q));
    // Each term can match a different level; intervening model names are optional.
    const pathMatch = tokens.length > 1 && tokens.every(token =>
      entry.words.some(word => /^\d+$/.test(token) ? word.includes(token) : word.startsWith(token)));

    if (q && !(submitted ? tokens.every(t=>entry.text.includes(t)) : prefix || numberMatch || pathMatch)) continue;
    ranked.push({id,entry,rank:exact ? 0 : prefix ? 1 : 2});
  }
  return ranked.sort((a,b)=> submitted
    ? priority[a.entry.type]-priority[b.entry.type] || a.entry.label.localeCompare(b.entry.label)
    : a.rank-b.rank || priority[a.entry.type]-priority[b.entry.type] || a.entry.label.localeCompare(b.entry.label));
}
