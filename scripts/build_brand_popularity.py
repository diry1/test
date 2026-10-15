"""Build a reproducible popularity snapshot from the licensed VehiclesDB extract."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    with (ROOT / 'data/catalogue-sources/vehiclesdb/cars.csv').open(newline='') as stream:
        rows = {'vehiclesdb:car:' + r['make_slug'] + ':' + r['model_slug']: r for r in csv.DictReader(stream)}
    brands = {}
    for car in json.loads((ROOT / 'web/catalogue.json').read_text()):
        deciles = []
        for ref in car.get('sourceReferences', []):
            row = rows.get(ref['id'])
            if row and row.get('mass_popularity_decile'):
                deciles.append(int(row['mass_popularity_decile']))
        # Variants linked to one family contribute only once.
        if deciles:
            brands.setdefault(car['brand'], []).append(min(deciles))
    return {'version': 1, 'source': 'VehiclesDB', 'sourceSnapshot': '2026.10.4',
            'metric': 'mass_popularity_decile',
            'brands': {brand: {'modelDeciles': sorted(values)} for brand, values in sorted(brands.items())}}


if __name__ == '__main__':
    (ROOT / 'web/brand-popularity.json').write_text(json.dumps(build(), indent=2) + '\n')
