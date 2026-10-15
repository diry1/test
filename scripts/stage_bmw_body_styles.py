"""Collect a small BMW sample and stage evidence-linked body-category mappings.

Offline by default. --fetch performs 48 documented, read-only reference requests.
Nothing here edits either live catalogue.
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
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/bmw-pilot/body-style-staging'
CATEGORIES = {'Limousine': 'Saloon', 'EstateCar': 'Estate car',
              'SportsCar': 'Sports Car/Coupe', 'Cabrio': 'Convertible/Roadster',
              'OffRoad': 'SUV/Off-road Vehicle/Pickup Truck'}
FAMILIES = {'320': ['3 Series', '3 Series GT'], '318': ['3 Series', '3 Series GT'], 'X5': ['X5']}


def cases():
    rows = [(model, f'{year}06', category)
            for model, years, categories in [
                ('320', [1993, 1997, 2001, 2007, 2011, 2014, 2017, 2020, 2024], ['Limousine', 'EstateCar', 'SportsCar', 'Cabrio']),
                ('X5', [2002, 2009, 2015, 2020, 2024], ['OffRoad', 'Cabrio']),
                ('318', [1995], ['SportsCar', 'Limousine'])]
            for year in years for category in categories]
    return rows


def collect():
    (OUT / 'raw').mkdir(parents=True, exist_ok=True)
    def get(case):
        model, date, category = case
        query_id = f'{model}-{date}-{category}'
        params = urllib.parse.urlencode({'firstregistration': date, 'category': category})
        url = f'https://services.mobile.de/refdata/sites/GERMANY/classes/Car/makes/BMW/models/{model}/modelranges?{params}'
        row = dict(query_id=query_id, source_model=model, registration_input=date, category=category, url=url,
                   retrieved_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/xml', 'Accept-Language': 'en'})
            with urllib.request.urlopen(req, timeout=20) as response:
                data = response.read(1000000)
                row.update(status=response.status, ranges=[x.attrib['key'] for x in ET.fromstring(data)],
                           sha256=hashlib.sha256(data).hexdigest())
                (OUT / 'raw' / f'{query_id}.xml').write_bytes(data)
        except urllib.error.HTTPError as error:
            row.update(status=error.code, error='HTTP error; do not treat as an empty range response')
        except (urllib.error.URLError, ET.ParseError) as error:
            row['error'] = str(error)
        time.sleep(.2)
        return row
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for row in pool.map(get, cases()):
            results.append(row)
            if len(results) % 8 == 0:
                print(f'Retrieved {len(results)}/{len(cases())} reference queries', flush=True)
    (OUT / 'observations.json').write_text(json.dumps(results, indent=2) + '\n')
    return results


def chassis_code(name):
    # Explicit known source alias, not a general guess about unknown codes.
    if name == 'F34 GT':
        return 'F34'
    return re.sub(r' \(FL\)$', '', name)


def candidates(source_model, source_range, catalogue):
    return [(car, generation) for car in catalogue
            if car['brand'] == 'BMW' and car['name'] in FAMILIES[source_model]
            for generation in car['generations']
            if chassis_code(generation['name']) == chassis_code(source_range)]


def stage(observations, catalogue):
    combined = {}
    for row in observations:
        if row.get('status') != 200:
            continue
        for code in row['ranges']:
            key = (row['source_model'], code, row['category'])
            item = combined.setdefault(key, dict(source_model=key[0], source_range=code,
                category=key[2], category_label=CATEGORIES[key[2]], evidence=[]))
            item['evidence'].append(dict(query_id=row['query_id'], url=row['url'],
                registration_input=row['registration_input'], all_returned_ranges=row['ranges']))
    results = []
    for key, item in sorted(combined.items()):
        matches = candidates(item['source_model'], item['source_range'], catalogue)
        item['candidate_generations'] = [dict(model_id=car['id'], model=car['name'],
            generation_id=g['id'], generation=g['name'], year_from=g['yearFrom'], year_to=g['yearTo']) for car, g in matches]
        item['status'] = 'unmatched_range' if not matches else 'facelift_resolution_required' if len(matches) > 1 else 'single_catalogue_candidate'
        item['cross_model_conflicts'] = [dict(model_id=car['id'], model=car['name'], generation_id=g['id'], generation=g['name'])
            for car in catalogue if car['brand'] == 'BMW' and car['name'] not in FAMILIES[item['source_model']]
            for g in car['generations'] if not matches and chassis_code(g['name']) == chassis_code(item['source_range'])]
        item['review_required'] = True
        item['ambiguous_source_queries'] = sum(len(e['all_returned_ranges']) > 1 for e in item['evidence'])
        item['broad_category'] = item['category'] in ('SportsCar', 'Cabrio', 'OffRoad')
        results.append(item)
    return results


def write_reports(observations):
    catalogue = json.loads((ROOT / 'web/catalogue.json').read_text())
    mappings = stage(observations, catalogue)
    (OUT / 'candidate-mappings.json').write_text(json.dumps(mappings, indent=2) + '\n')
    with (OUT / 'candidate-mappings.csv').open('w', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['source_model', 'source_range', 'category', 'category_label', 'evidence_count',
                         'candidate_generation_ids', 'candidate_generation_names', 'status', 'ambiguous_source_queries', 'broad_category', 'review_required'])
        for m in mappings:
            writer.writerow([m['source_model'], m['source_range'], m['category'], m['category_label'], len(m['evidence']),
                ' | '.join(g['generation_id'] for g in m['candidate_generations']),
                ' | '.join(g['generation'] for g in m['candidate_generations']), m['status'], m['ambiguous_source_queries'], m['broad_category'], True])
    summary = dict(queries=len(observations), successful_queries=sum(r.get('status') == 200 for r in observations),
        empty_successful_queries=sum(r.get('status') == 200 and not r['ranges'] for r in observations),
        failed_queries=sum(r.get('status') != 200 for r in observations), candidate_relationships=len(mappings),
        unique_source_ranges=sorted({m['source_range'] for m in mappings}),
        single_catalogue_candidates=sum(m['status'] == 'single_catalogue_candidate' for m in mappings),
        facelift_resolution_required=sum(m['status'] == 'facelift_resolution_required' for m in mappings),
        unmatched_ranges=sum(m['status'] == 'unmatched_range' for m in mappings),
        cross_model_conflicts=sum(bool(m['cross_model_conflicts']) for m in mappings), live_catalogue_changes=0)
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    args = parser.parse_args()
    observations = collect() if args.fetch else json.loads((OUT / 'observations.json').read_text())
    write_reports(observations)
