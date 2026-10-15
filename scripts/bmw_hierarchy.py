"""Add BMW browsing hierarchy without replacing legacy generations or specifications."""
import json
from pathlib import Path
import re

EVIDENCE = Path(__file__).resolve().parents[1] / 'research/bmw-pilot/e36-engine-evidence/observations.json'
STAGING = EVIDENCE.parents[1] / 'body-style-staging/observations.json'
SINGLE_BODY = {
    ('3 Series', 'E90'): ('Limousine', 'Sedan'), ('3 Series', 'E91'): ('EstateCar', 'Wagon'),
    ('3 Series', 'E92'): ('SportsCar', 'Coupé'), ('3 Series', 'E93'): ('Cabrio', 'Convertible'),
    ('3 Series', 'F30'): ('Limousine', 'Sedan'), ('3 Series', 'F31'): ('EstateCar', 'Wagon'),
    ('3 Series', 'G20'): ('Limousine', 'Sedan'), ('3 Series', 'G21'): ('EstateCar', 'Wagon'),
    **{('X5', code): ('OffRoad', 'SUV') for code in ['E53', 'E70', 'F15', 'G05']},
}
BODY_NAMES = {'Limousine': 'Sedan', 'EstateCar': 'Wagon', 'SportsCar': 'Coupé', 'Cabrio': 'Convertible'}


def enrich_bmw(cars):
    evidence = json.loads(EVIDENCE.read_text()) if EVIDENCE.exists() else []
    staged = json.loads(STAGING.read_text()) if STAGING.exists() else []
    for car in cars:
        if car['brand'] != 'BMW':
            continue
        families = {}
        for generation in car['generations']:
            code = re.sub(r' \(FL\)$', '', generation['name'])
            family = families.setdefault(code, dict(id=f"{car['id']}:family:{code}", name=code, phases=[]))
            phase = dict(id=generation['id'], name='Facelift (LCI)' if generation['name'].endswith(' (FL)') else 'Pre-facelift (non-LCI)',
                         yearFrom=generation['yearFrom'], yearTo=generation['yearTo'], bodyStyles=[])
            known_spec_ids = set()
            if car['name'] == '3 Series' and code == 'E36':
                for category, name in BODY_NAMES.items():
                    supported = [r for r in evidence if r.get('status') == 200 and r['category'] == category and 'E36' in r.get('ranges', [])]
                    designations = {r['model'] + 'i' for r in supported}
                    specs = [s for s in generation['specifications'] if s['name'].split()[0] in designations]
                    if not specs:
                        continue
                    ids = [s['id'] for s in specs]
                    known_spec_ids.update(ids)
                    phase['bodyStyles'].append(dict(id=f"{generation['id']}:body:{category}", name=name,
                        sourceCategory=category, specificationIds=ids,
                        evidenceQueryIds=[r['query_id'] for r in supported], evidenceSource='e36-engine-evidence', availabilityScope='chassis-family',
                        technicalVariantAvailability='generation-scoped'))
            single = SINGLE_BODY.get((car['name'], code))
            if single:
                category, name = single
                source_model = 'X5' if car['name'] == 'X5' else '320'
                support = [r for r in staged if r.get('status') == 200 and r['source_model'] == source_model and r['category'] == category and code in r.get('ranges', [])]
                if support:
                    ids = [s['id'] for s in generation['specifications']]
                    known_spec_ids.update(ids)
                    phase['bodyStyles'].append(dict(id=f"{generation['id']}:body:{category}", name=name,
                        sourceCategory=category, specificationIds=ids,
                        evidenceQueryIds=[r['query_id'] for r in support], evidenceSource='body-style-staging',
                        availabilityScope='chassis-family', technicalVariantAvailability='generation-scoped'))
            unknown = [s['id'] for s in generation['specifications'] if s['id'] not in known_spec_ids]
            # Unknown remains an honest branch; missing body data never removes source records.
            if unknown or not phase['bodyStyles']:
                phase['bodyStyles'].append(dict(id=f"{generation['id']}:body:unknown", name='Body style not specified',
                    specificationIds=unknown, availabilityScope='unknown'))
            family['phases'].append(phase)
        car['generationFamilies'] = list(families.values())
    return cars


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    catalogue = enrich_bmw(json.loads((root / 'web/catalogue.json').read_text()))
    data = json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')) + '\n'
    for path in [root / 'web/catalogue.json', root / 'CarSpotter/Resources/catalogue.json']:
        path.write_text(data)
