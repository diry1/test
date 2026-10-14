// Score is derived from unique catalogue discoveries, never accumulated per save.
export function calculateScore(sightings, carsByID) {
  const models = new Set(), brands = new Set(), generations = new Set();
  for (const sighting of sightings) {
    const car = carsByID.get(sighting.carID);
    if (!car) continue;
    models.add(car.id);
    brands.add(car.brand);
    if (sighting.generationID && car.generations.some(g => g.id === sighting.generationID)) {
      generations.add(sighting.generationID);
    }
  }
  const modelPoints = models.size, brandPoints = brands.size * 20, generationPoints = generations.size;
  return {total: modelPoints + brandPoints + generationPoints, modelPoints, brandPoints, generationPoints,
    models: models.size, brands: brands.size, generations: generations.size};
}

export function nextScoreTarget(total) {
  return [100, 250, 500, 1000, 2500, 5000, 10000].find(target => target > total)
    ?? (Math.floor(total / 5000) + 1) * 5000;
}
