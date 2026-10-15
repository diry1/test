"""Deterministic additive model/reference merge from audited source snapshots.

Original AUTO.RIA fields and IDs are preserved. No generation, facelift, body or
engine fitment is invented. Source variants attach to existing families where
reference membership or an explicit marque-specific rule identifies the family.
"""
import copy
import csv
import json
from pathlib import Path
import re
import urllib.parse
from audit_mobile_catalogue import normalize, ALIASES
from catalogue_english import english_text
from bmw_hierarchy import enrich_bmw

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'data/catalogue-sources'
BRAND_ALIASES = {**ALIASES, 'dfm':'Dongfeng', 'caterhamcarsltd':'Caterham', 'caterhamcars':'Caterham',
    'vauxhallmotors':'Vauxhall', 'astonmartinlagonda':'Aston Martin', 'rollsroycemotorcars':'Rolls-Royce'}
# Deliberate source classification reconciliation, not a new Corvette brand.
FORCED_PARENT = {'corvette': ('Chevrolet', 'Corvette')}
MODEL_ALIASES = {('Abarth','500'):'Fiat 500', ('Abarth','595'):'Fiat 595', ('Abarth','500e'):'Fiat 500e',
                 ('Audi','A7'):'A7 Sportback', ('Audi','S7'):'S7 Sportback', ('Audi','RS7'):'RS7 Sportback',
                 ('Volkswagen','Käfer'):'Beetle'}


def display_name(name):
    name = english_text(name)
    name = re.sub(r'\b([1-8])er\b', r'\1 Series', name)
    return name.replace('Klasse', 'Class')


def merge_expansion(base, mobile, vehicle_rows, memberships):
    # Remove only fields owned by this importer, making a second run idempotent.
    cars = copy.deepcopy(base)
    for car in cars:
        for field in ['sourceReferences','referenceVariants','referenceBodyStyles','marketCountries','catalogueStatus']:
            car.pop(field, None)
    brands = {normalize(c['brand']): c['brand'] for c in cars}
    exact = {}
    reference_ids = set()
    unresolved = []
    decisions = []
    def index(car, aliases=()):
        for name in [car['name'], *aliases]:
            exact.setdefault((normalize(car['brand']), normalize(name)), car)
    for car in cars:
        index(car)
    groups = {}
    for row in memberships:
        if row.get('status') != 200:
            raise ValueError('Group membership missing: ' + row['make'])
        for model in row['models']:
            groups.setdefault((row['make'], model['key']), []).append(display_name(row['name']))
    def brand_for(name):
        cleaned = display_name(name)
        match = brands.get(normalize(cleaned))
        alias = BRAND_ALIASES.get(normalize(cleaned))
        result = match or (brands.get(normalize(alias)) if alias else None) or cleaned
        brands[normalize(cleaned)] = result
        brands.setdefault(normalize(result), result)
        return result
    def find(brand, name):
        alias = MODEL_ALIASES.get((brand, name))
        return exact.get((normalize(brand), normalize(alias or name)))
    def owner_for(brand, name, source_key, model_key):
        direct = find(brand, name) or find(brand, model_key)
        if direct:
            return direct, 'model_name_match'
        family = [find(brand, group) for group in groups.get((source_key, model_key), [])]
        family = {c['id']: c for c in family if c}
        if len(family) == 1:
            return next(iter(family.values())), 'source_family_membership'
        if brand == 'BMW':
            match = re.match(r'^(?:M)?([1-8])\d\d(?:[a-zA-Z]*)?(?:\s|$)', name)
            if match:
                suffix = ' Gran Coupe' if 'gran coup' in name.casefold() else ' GT' if 'gran turismo' in name.casefold() else ' Active Tourer' if 'active tourer' in name.casefold() else ' Gran Tourer' if 'gran tourer' in name.casefold() else ''
                owner = find(brand, match[1]+' Series'+suffix) or find(brand, match[1]+' Series')
                if owner:
                    return owner, 'bmw_designation_family'
            match = re.match(r'^(X\d|Z\d)\s+M\d', name)
            if match and find(brand, match[1]):
                return find(brand, match[1]), 'bmw_performance_designation'
        return None, 'new_model_reference'
    def variant_owner(brand, name):
        # Only recognized trim/body/drive suffixes; do not merge arbitrary prefix matches.
        suffix = re.compile(r'^(?:a[ -]?spec|type[ -]?[rs]|[24][ -]?(?:wd|wheel)|awd|fwd|rwd|sw|estate|wagon|sedan|saloon|coupe|coupé|cabrio(?:let)?|touring|roadster|sportback|hatchback|hybrid|plug[ -]?in|[vVlL][ -]?\d|\d[.,]\d|tdi|tsi|tfsi|cdi|dci|tdci|sdi|fsi|gti|gt|rs|rc|st|sport|titanium|premium|exclusive|limited|executive|xdrive|sdrive)(?:\b|\d)', re.I)
        matches = []
        for car in cars:
            if car['brand'] != brand or len(car['name']) < 3:
                continue
            m = re.match(re.escape(car['name']) + r'[ /(-]+(.+)', name, re.I)
            if m and suffix.match(m[1]):
                matches.append(car)
        return max(matches, key=lambda c:len(c['name'])) if matches else None
    def attach(source, source_id, source_brand, name, model_key, source_make_key, aliases=(), body_types=(), countries=()):
        if source_id in reference_ids:
            return
        reference_ids.add(source_id)
        name = display_name(name)
        reference_name = name
        if normalize(source_brand) == 'bmw' and (name.casefold() in {'active','cs','mini','one','alpina','x-reihe','z series','m roadster'} or re.match(r'^(?:Mini\b|Cooper\b|Clubman\b|John Cooper Works\b)', name, re.I)):
            unresolved.append(dict(source=source, id=source_id, sourceBrand=source_brand, name=name, reason='ambiguous_or_cross_make_registration_label'))
            decisions.append(dict(source=source, source_id=source_id, source_brand=source_brand, source_name=name, target_id=None, action='unresolved_reference', reason='ambiguous_or_cross_make_registration_label'))
            return
        if normalize(source_brand) == 'bmw' and name.startswith('Alpina '):
            brand = brand_for('BMW-Alpina'); name = name.removeprefix('Alpina ')
        else:
            brand = None
        if normalize(source_brand) == 'bmw' and name.startswith('Serie '):
            name = name.removeprefix('Serie ')
        if normalize(source_brand) == 'bmw' and re.match(r'^Isetta (250|300)$', name, re.I):
            name = 'Isetta'
        if normalize(source_brand) == 'bmw' and re.match(r'^Z [34] Roadster$', name, re.I):
            name = name.replace(' ', '').removesuffix('Roadster')
        if normalize(source_brand) == 'bmw' and name.upper().startswith('XDRIVE'):
            unresolved.append(dict(source=source, id=source_id, sourceBrand=source_brand, name=name, reason='engine_without_model_identity'))
            decisions.append(dict(source=source, source_id=source_id, source_brand=source_brand, source_name=name, target_id=None, action='unresolved_reference', reason='engine_without_model_identity'))
            return
        forced = FORCED_PARENT.get(normalize(source_brand))
        brand = brand or brand_for(forced[0] if forced else source_brand)
        owner, reason = owner_for(brand, forced[1] if forced else name, source_make_key, model_key)
        if not owner:
            for alias in aliases:
                owner = find(brand, display_name(alias))
                if owner:
                    reason = 'source_alias_match'; break
        if not owner:
            owner = variant_owner(brand, name)
            if owner: reason = 'recognized_variant_suffix'
        created = owner is None
        if created:
            owner = dict(id=source_id, brand=brand, name=name, generations=[])
            cars.append(owner); index(owner)
        ref = dict(source=source, id=source_id, name=reference_name, sourceBrand=source_brand, sourceModelKey=model_key, linkType=reason)
        owner.setdefault('sourceReferences', []).append(ref)
        if normalize(reference_name) != normalize(owner['name']):
            owner.setdefault('referenceVariants', []).append(ref)
        index(owner, [name, *aliases])
        if body_types:
            owner['referenceBodyStyles'] = sorted(set(owner.get('referenceBodyStyles', [])) | set(body_types))
        if countries:
            owner['marketCountries'] = sorted(set(owner.get('marketCountries', [])) | set(countries))
        if not owner['id'].startswith('autoria:'):
            owner['catalogueStatus'] = 'model_reference_only'
        decisions.append(dict(source=source, source_id=source_id, source_brand=source_brand, source_name=name,
                              target_id=owner['id'], target_brand=owner['brand'], target_model=owner['name'],
                              action='added_model' if created else 'linked_reference', reason=reason))
    for row in mobile:
        if row['kind'] != 'models':
            continue
        if row.get('status') != 200:
            raise ValueError('Missing source models: '+row['make_key'])
        for model in row['entries']:
            if model['key'] == 'ANDERE':
                continue
            sid = 'mobilede:Car:' + urllib.parse.quote(row['make_key'], safe='') + ':' + urllib.parse.quote(model['key'], safe='')
            attach('mobile.de', sid, row['make_name'], model['name'], model['key'], row['make_key'])
    for row in vehicle_rows:
        if row['kind'] != 'car':
            continue
        sid = 'vehiclesdb:car:'+row['make_slug']+':'+row['model_slug']
        attach('VehiclesDB', sid, row['make_name'], row['model_name'], row['model_slug'], '',
               aliases=[x for x in row.get('aliases','').split('|') if x],
               body_types=[x for x in row.get('body_types','').split('|') if x],
               countries=[x for x in row.get('countries','').split('|') if x])
    # Evidence coverage is recorded, not assumed to mean complete generation/spec data.
    result = enrich_bmw(sorted(cars, key=lambda c:(c['brand'].casefold(),c['name'].casefold(),c['id'])))
    return result, decisions, unresolved


def expand(base):
    mobile = json.loads((ROOT/'research/mobile-de-expansion/observations.json').read_text())
    memberships = json.loads((ROOT/'research/mobile-de-expansion/group-memberships/memberships.json').read_text())
    with (SOURCES/'vehiclesdb/cars.csv').open(newline='') as stream:
        vehicles = list(csv.DictReader(stream))
    return merge_expansion(base, mobile, vehicles, memberships)


if __name__ == '__main__':
    # Always start from original identities, not our previously added source-only rows.
    base = [c for c in json.loads((ROOT/'web/catalogue.json').read_text()) if c['id'].startswith('autoria:')]
    result, decisions, unresolved = expand(base)
    assert len({c['id'] for c in result}) == len(result)
    data = json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n'
    for path in [ROOT/'web/catalogue.json',ROOT/'CarSpotter/Resources/catalogue.json']:
        path.write_text(data)
    report = ROOT/'research/catalogue-expansion'
    report.mkdir(exist_ok=True)
    (report/'unresolved-references.json').write_text(json.dumps(unresolved,indent=2)+'\n')
    (report/'merge-decisions.json').write_text(json.dumps(decisions,indent=2)+'\n')
    summary = dict(original_models=len(base), added_models=len(result)-len(base), total_models=len(result),
                   original_brand_folders=len({c['brand'] for c in base}), total_brand_folders=len({c['brand'] for c in result}),
                   references=len(decisions), unresolved_references=len(unresolved), new_models_by_source={s:sum(d['source']==s and d['action']=='added_model' for d in decisions) for s in ['mobile.de','VehiclesDB']},
                   linked_references=sum(d['action']=='linked_reference' for d in decisions),
                   generation_records=sum(len(c['generations']) for c in result),
                   specification_records=sum(len(g['specifications']) for c in result for g in c['generations']))
    (report/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))
