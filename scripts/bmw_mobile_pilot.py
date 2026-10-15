"""Build an offline comparison from the captured official mobile.de reference XML.

This is a staging report, not a catalogue merger. No third-party packages needed.
"""
import csv
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / 'research/bmw-pilot'
RAW = PILOT / 'mobile-de'


def items(path):
    result = []
    for element in ET.parse(path).getroot():
        description = next((e.text for e in element if e.tag.endswith('local-description')), '')
        result.append({'key': element.attrib['key'], 'label': description})
    return result


def compare():
    catalogue = json.loads((ROOT / 'web/catalogue.json').read_text())
    bmw = [car for car in catalogue if car['brand'] == 'BMW']
    by_name = {car['name'].casefold(): car for car in bmw}
    groups = items(RAW / 'modelgroups.xml')
    membership = {}
    for group in groups:
        for model in items(RAW / f"group-{group['key']}.xml"):
            membership.setdefault(model['key'], []).append(group['label'])
    models = items(RAW / 'models.xml')
    counts = {'direct_label_match': 0, 'review_required': 0, 'other_bucket': 0}
    rows = []
    for model in models:
        matches = {by_name[name.casefold()]['id'] for name in [model['key'], model['label']] if name.casefold() in by_name}
        matched = next(iter(matches)) if len(matches) == 1 else ''
        state = 'other_bucket' if model['key'] == 'ANDERE' else 'direct_label_match' if matched else 'review_required'
        counts[state] += 1
        rows.append([model['key'], model['label'], ' | '.join(membership.get(model['key'], [])), matched, state])
    with (PILOT / 'mobile-de-comparison.csv').open('w', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['mobile_model_key', 'mobile_label', 'mobile_groups', 'candidate_existing_model_id', 'review_status'])
        writer.writerows(rows)
    summary = {'mobile_model_entries': len(models), 'mobile_model_groups': len(groups),
               'generic_vehicle_categories': len(items(RAW / 'categories.xml')), **counts,
               'live_catalogue_changes': 0}
    (PILOT / 'comparison-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary, indent=2))
    return summary


if __name__ == '__main__':
    compare()
