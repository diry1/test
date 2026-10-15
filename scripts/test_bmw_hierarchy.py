import json
from pathlib import Path
import unittest
from bmw_hierarchy import enrich_bmw


class HierarchyTests(unittest.TestCase):
    def setUp(self):
        self.cars = json.loads((Path(__file__).resolve().parents[1] / 'web/catalogue.json').read_text())

    def test_all_bmw_versions_and_specs_remain_addressable(self):
        for car in self.cars:
            if car['brand'] != 'BMW':
                continue
            phases = [p for f in car['generationFamilies'] for p in f['phases']]
            self.assertEqual({p['id'] for p in phases}, {g['id'] for g in car['generations']})
            self.assertEqual(len(phases), len(car['generations']))
            for phase in phases:
                generation = next(g for g in car['generations'] if g['id'] == phase['id'])
                source_ids = {s['id'] for s in generation['specifications']}
                body_ids = {i for b in phase['bodyStyles'] for i in b['specificationIds']}
                self.assertEqual(source_ids, body_ids)
                for body in phase['bodyStyles']:
                    self.assertTrue(set(body['specificationIds']) <= source_ids)

    def test_e36_groups_versions_then_bodies_without_inventing_diesel(self):
        car = next(c for c in self.cars if c['brand'] == 'BMW' and c['name'] == '3 Series')
        family = next(f for f in car['generationFamilies'] if f['name'] == 'E36')
        self.assertEqual([p['name'] for p in family['phases']], ['Pre-facelift (non-LCI)', 'Facelift (LCI)'])
        for phase in family['phases']:
            self.assertTrue({'Coupé', 'Wagon', 'Sedan'} <= {b['name'] for b in phase['bodyStyles']})
            coupe = next(b for b in phase['bodyStyles'] if b['name'] == 'Coupé')
            gen = next(g for g in car['generations'] if g['id'] == phase['id'])
            names = {s['name'].split()[0] for s in gen['specifications'] if s['id'] in coupe['specificationIds']}
            self.assertIn('320i', names)
            self.assertNotIn('320d', names)
            self.assertTrue(coupe['evidenceQueryIds'])
            self.assertEqual(coupe['availabilityScope'], 'chassis-family')

    def test_single_body_codes_use_their_existing_specifications(self):
        for model, code, expected in [('3 Series', 'F31', 'Wagon'), ('X5', 'F15', 'SUV')]:
            car = next(c for c in self.cars if c['brand'] == 'BMW' and c['name'] == model)
            family = next(f for f in car['generationFamilies'] if f['name'] == code)
            for phase in family['phases']:
                self.assertEqual([b['name'] for b in phase['bodyStyles']], [expected])
                generation = next(g for g in car['generations'] if g['id'] == phase['id'])
                self.assertEqual(set(phase['bodyStyles'][0]['specificationIds']), {s['id'] for s in generation['specifications']})

    def test_enrichment_is_repeatable(self):
        expected = json.dumps(self.cars, sort_keys=True)
        self.assertEqual(json.dumps(enrich_bmw(self.cars), sort_keys=True), expected)
