"""Probe a small, documented BMW reference-data sample; never updates the catalogue.

Run with --fetch to refresh snapshots, or without arguments to summarize saved results.
"""
import argparse
import datetime
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parents[1] / 'research/bmw-pilot/range-investigation'
CASES = [
    ('e36-coupe', '320', '199506', 'SportsCar', 'modelranges'),
    ('e36-saloon', '320', '199506', 'Limousine', 'modelranges'),
    ('e36-estate', '320', '199506', 'EstateCar', 'modelranges'),
    ('e36-convertible', '320', '199506', 'Cabrio', 'modelranges'),
    ('e36-318-coupe', '318', '199506', 'SportsCar', 'modelranges'),
    ('f31-estate', '320', '201406', 'EstateCar', 'modelranges'),
    ('f31-2013-estate', '320', '201306', 'EstateCar', 'modelranges'),
    ('f30-saloon', '320', '201406', 'Limousine', 'modelranges'),
    ('f3x-unfiltered', '320', '201406', None, 'modelranges'),
    ('x5-2015', 'X5', '201506', None, 'modelranges'),
    ('bmw-trim', '320', '201406', None, 'trimlines'),
    ('x5-wrong-category', 'X5', '201506', 'Cabrio', 'modelranges'),
    ('x5-before-production', 'X5', '198006', None, 'modelranges'),
]


def fetch():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for name, model, date, category, endpoint in CASES:
        params = {'firstregistration': date}
        if category:
            params['category'] = category
        url = f'https://services.mobile.de/refdata/sites/GERMANY/classes/Car/makes/BMW/models/{model}/{endpoint}?' + urllib.parse.urlencode(params)
        result = {'case': name, 'url': url, 'retrieved_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat()}
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/xml', 'Accept-Language': 'en'})
            with urllib.request.urlopen(req, timeout=20) as response:
                data = response.read(1000000)
                result.update(status=response.status, keys=[x.get('key') for x in ET.fromstring(data)])
                (OUT / f'{name}.xml').write_bytes(data)
        except urllib.error.HTTPError as error:
            result.update(status=error.code, error='HTTP error; no data imported')
        except (urllib.error.URLError, ET.ParseError) as error:
            result.update(error=str(error))
        results.append(result)
    (OUT / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true', help='Make 13 read-only requests to the documented API')
    args = parser.parse_args()
    results = fetch() if args.fetch else json.loads((OUT / 'results.json').read_text())
    for result in results:
        print(result['case'], result.get('status', 'ERROR'), result.get('keys', result.get('error')))
