export const normalizeSearch = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function buildSearchIndex(cars, featured = []) {
  const entries = [];
  const add = (type, title, path, route, aliases = []) => {
    const label = path.join(' › ');
    entries.push({type,title,label,route, keys: [...new Set([title, ...aliases, path.join(' '), ...aliases.map(a => [...path.slice(0,-1),a].join(' '))].map(normalizeSearch))], text: normalizeSearch([label,...aliases].join(' '))});
  };
  for (const brand of new Set([...featured,...cars.map(c=>c.brand)])) add('brand',brand,[brand],{brand});
  for (const car of cars) {
    const base = [car.brand,car.name], route = {brand:car.brand,carID:car.id};
    add('model',car.name,base,route,(car.referenceVariants??[]).map(r=>r.name));
    for (const family of car.generationFamilies??[]) {
      add('generation',family.name,[...base,family.name],{...route,familyID:family.id});
    }
    for (const generation of car.generations) {
      const family = car.generationFamilies?.find(f=>f.phases.some(p=>p.id===generation.id));
      const phase = family?.phases.find(p=>p.id===generation.id);
      const path = family ? [...base,family.name,phase.name] : [...base,generation.name];
      const genRoute = {...route,generationID:generation.id,...(family ? {familyID:family.id} : {})};
      add('generation',family ? `${family.name} · ${phase.name}` : generation.name,path,genRoute);
      for (const body of phase?.bodyStyles??[]) add('body style',body.name,[...path,body.name],{...genRoute,bodyID:body.id});
      for (const spec of generation.specifications??[]) add('specification',spec.name,[...path,spec.name],{...genRoute,specificationID:spec.id});
    }
  }
  return entries;
}
export function searchCatalogue(index, query, submitted = false) {
  const q = normalizeSearch(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const priority = {'brand':0,'model':1,'generation':2,'body style':3,'specification':4};
  const ranked = [];
  for (let id=0; id<index.length; id++) {
    const entry=index[id];
    const exact=entry.keys.includes(q), prefix=exact || entry.keys.some(k=>k.startsWith(q));
    if (!(submitted ? tokens.every(t=>entry.text.includes(t)) : prefix)) continue;
    ranked.push({id,entry,rank:exact ? 0 : prefix ? 1 : 2});
  }
  return ranked.sort((a,b)=>a.rank-b.rank || priority[a.entry.type]-priority[b.entry.type] || a.entry.label.localeCompare(b.entry.label));
}
