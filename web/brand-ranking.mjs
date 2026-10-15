// Selection only: the catalogue continues to display both lists alphabetically.
export const MAIN_LIST_THRESHOLD = 50;
export function brandScore(modelCount, curated, modelDeciles = []) {
  const measured = modelDeciles.filter(d => Number.isInteger(d) && d >= 1 && d <= 10).sort((a,b) => a-b).slice(0,3);
  const popularity = measured.length ? measured.reduce((sum,d) => sum + (10-d)/9*100,0)/measured.length : 50;
  const breadth = Math.min(1, Math.log1p(Math.max(0,modelCount))/Math.log1p(20))*100;
  return {score: 0.60*popularity + 0.25*(curated ? 100 : 0) + 0.15*breadth,
    popularity, breadth, measuredModels: measured.length};
}
export function selectMainBrands(cars, curated, popularity = {}) {
  const counts = new Map([...curated].map(brand => [brand,0]));
  for (const car of cars) counts.set(car.brand,(counts.get(car.brand)||0)+1);
  return new Set([...counts].filter(([brand,count]) => brandScore(count,curated.has(brand),popularity[brand]?.modelDeciles).score >= MAIN_LIST_THRESHOLD).map(([brand]) => brand));
}
export function isMainBrand(brand, defaults, preferences, unfolded = false) {
  return preferences.has(brand) ? preferences.get(brand) : unfolded || defaults.has(brand);
}
