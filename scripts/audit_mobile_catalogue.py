"""Inventory mobile.de public make/model references; report candidates, never merge.

Offline by default. --fetch requests model and modelgroup lists for each named make.
"""
import argparse
import concurrent.futures
import csv
import datetime
import hashlib
import json
from pathlib import Path
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/mobile-de-expansion'
RAW = OUT / 'raw'
ALIASES = {'alpina': 'BMW-Alpina', 'asiamotors': 'Asia', 'dsautomobiles': 'DS',
           'kgm': 'KG Mobility', 'lada': 'VAZ / Lada', 'gacgonow': 'Gonow'}


def normalize(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().casefold()
    return re.sub(r'[^a-z0-9]', '', text)


def parse(data):
    return [dict(key=x.attrib['key'], name=next((e.text for e in x if e.tag.endswith('local-description')), x.attrib['key'])) for x in ET.fromstring(data)]


def fetch_all():
    makes = parse((RAW / 'makes.xml').read_bytes())
    targets = [(make, kind) for make in makes if make['key'] != 'ANDERE' for kind in ['models', 'modelgroups']]
    def fetch(target):
        make, kind = target
        url = 'https://services.mobile.de/refdata/classes/Car/makes/' + urllib.parse.quote(make['key'], safe='') + '/' + kind
        file = make['key'].encode().hex() + '-' + kind + '.xml'
        row = dict(make_key=make['key'], make_name=make['name'], kind=kind, url=url, file=file,
                   retrieved_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
        try:
            req = urllib.request.Request(url, headers={'Accept':'application/xml', 'Accept-Language':'en'})
            with urllib.request.urlopen(req, timeout=25) as response:
                data = response.read(5000000)
                entries = parse(data)
                (RAW / file).write_bytes(data)
                row.update(status=response.status, sha256=hashlib.sha256(data).hexdigest(), entries=entries)
        except urllib.error.HTTPError as error:
            row.update(status=error.code, error='HTTP error; not an empty list')
        except (urllib.error.URLError, ET.ParseError) as error:
            row['error'] = str(error)
        time.sleep(.2)
        return row
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(fetch, targets):
            results.append(row)
            if len(results) % 30 == 0:
                print(f'Collected {len(results)}/{len(targets)} lists', flush=True)
                (OUT / 'observations.partial.json').write_text(json.dumps(results, indent=2) + '\n')
    (OUT / 'observations.json').write_text(json.dumps(results, indent=2) + '\n')
    (OUT / 'observations.partial.json').unlink(missing_ok=True)
    return results


def compare(observations):
    cars = json.loads((ROOT / 'web/catalogue.json').read_text())
    by_brand = {}
    for car in cars:
        by_brand.setdefault(car['brand'], []).append(car)
    names = {normalize(name): name for name in by_brand}
    brand_rows, model_rows = [], []
    candidates, exact, other = 0, 0, 0
    for row in observations:
        if row['kind'] != 'models':
            continue
        brand = names.get(normalize(row['make_name'])) or names.get(normalize(row['make_key']))
        if not brand:
            alias = ALIASES.get(normalize(row['make_name'])) or ALIASES.get(normalize(row['make_key']))
            brand = alias if alias in by_brand else None
        baseline = by_brand.get(brand, [])
        model_names = {normalize(c['name']): c for c in baseline}
        matches = unmatched = 0
        for item in row.get('entries', []):
            if item['key'] == 'ANDERE':
                other += 1
                continue
            car = model_names.get(normalize(item['name'])) or model_names.get(normalize(item['key']))
            status = 'normalized_name_match' if car else 'new_brand_candidate' if not brand else 'model_or_variant_review'
            exact += bool(car)
            candidates += not bool(car)
            matches += bool(car)
            unmatched += not bool(car)
            model_rows.append([row['make_key'], row['make_name'], item['key'], item['name'], brand or '', car['id'] if car else '', status])
        brand_rows.append([row['make_key'], row['make_name'], brand or '', len(baseline), matches, unmatched, row.get('status','ERROR')])
    def write(name, header, rows):
        with (OUT / name).open('w', newline='') as stream:
            writer = csv.writer(stream); writer.writerow(header); writer.writerows(rows)
    write('brand-comparison.csv', ['source_make_key','source_make','existing_brand','existing_models','name_matches','unmatched_reference_options','http_status'], brand_rows)
    write('model-candidates.csv', ['source_make_key','source_make','source_model_key','source_model','existing_brand','candidate_existing_model_id','status'], model_rows)
    new_brands = [r[1] for r in brand_rows if not r[2] and r[6] == 200]
    summary = dict(source_named_makes=len(brand_rows), successful_reference_lists=sum(r.get('status') == 200 for r in observations),
        failed_reference_lists=sum(r.get('status') != 200 for r in observations),
        named_model_options=len(model_rows), name_matched_model_options=exact,
        unmatched_model_or_variant_options=candidates, excluded_other_model_buckets=other,
        source_model_groups=sum(len(r.get('entries', [])) for r in observations if r['kind'] == 'modelgroups'),
        unmatched_brand_names=new_brands, unmatched_brand_count=len(new_brands),
        options_under_unmatched_brands=sum(1 for r in model_rows if r[-1]=='new_brand_candidate'),
        unmatched_brands_with_named_options=sum(not r[2] and r[6] == 200 and r[5] > 0 for r in brand_rows),
        current_models=len(cars), current_brand_folders=len(by_brand), live_catalogue_changes=0)
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    args = parser.parse_args()
    compare(fetch_all() if args.fetch else json.loads((OUT / 'observations.json').read_text()))
