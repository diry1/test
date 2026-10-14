import json
import tempfile
import unittest
from pathlib import Path
from import_catalogue import convert

class CatalogueTests(unittest.TestCase):
    def test_bundled_catalogue_integrity(self):
        cars = json.loads((Path(__file__).resolve().parents[1] / 'CarSpotter/Resources/catalogue.json').read_text())
        self.assertEqual(len(cars), 5053)
        self.assertEqual(len({car['id'] for car in cars}), len(cars))
        self.assertEqual(len({car['brand'] for car in cars}), 388)
        generations = [g for car in cars for g in car['generations']]
        self.assertEqual(len(generations), 10456)
        self.assertEqual(len({g['id'] for g in generations}), 10456)
        specs = [s for g in generations for s in g['specifications']]
        self.assertEqual(len(specs), 98333)
        self.assertEqual(len({s['id'] for s in specs}), 98333)
        bmw = next(c for c in cars if c['brand'] == 'BMW' and c['name'] == '3 Series')
        self.assertTrue({'E36', 'F30'} <= {g['name'] for g in bmw['generations']})
        for car in cars:
            self.assertTrue(car['brand'] and car['name'])
        for g in generations:
            if g['yearTo'] is not None:
                self.assertLessEqual(g['yearFrom'], g['yearTo'])

    def test_groups_generations_and_preserves_unknown_year(self):
        sample = ('make,make_id,model,model_id,generation,generation_id,year_from,year_to,modification,modification_id\n'
                  'Brand,1,Model,2,First,3,2000,2005,Engine,10\n'
                  'Brand,1,Model,2,Second,4,2006,,,\n'
                  'Brand,1,Model,2,First,3,2000,2005,Engine,10\n'
                  'Other,5,Model,2,,,,,,\n')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sample.csv'
            path.write_text(sample)
            cars = convert(path)
        self.assertEqual(len(cars), 2)
        self.assertEqual(len(cars[0]['generations']), 2)
        self.assertEqual(len(cars[0]['generations'][0]['specifications']), 1)
        self.assertEqual(cars[0]['generations'][0]['specifications'][0]['sourceID'], '10')
        self.assertIsNone(cars[0]['generations'][1]['yearTo'])
        self.assertNotEqual(cars[0]['id'], cars[1]['id'])

if __name__ == '__main__':
    unittest.main()
