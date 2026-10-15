import unittest
from stage_bmw_body_styles import stage

CATALOGUE = [
    {'id': 'three', 'brand': 'BMW', 'name': '3 Series', 'generations': [
        {'id':'e36', 'name':'E36', 'yearFrom':1990, 'yearTo':1996},
        {'id':'e36fl', 'name':'E36 (FL)', 'yearFrom':1996, 'yearTo':2001},
        {'id':'f31', 'name':'F31', 'yearFrom':2011, 'yearTo':2015}]},
    {'id':'gt', 'brand':'BMW', 'name':'3 Series GT', 'generations':[
        {'id':'f34', 'name':'F34', 'yearFrom':2013, 'yearTo':2016}]},
]


def observation(ranges, category='SportsCar', status=200):
    return dict(source_model='320', ranges=ranges, category=category, status=status,
                query_id='probe', url='https://services.mobile.de/example', registration_input='199506')


class StagingTests(unittest.TestCase):
    def test_date_does_not_resolve_facelift(self):
        result = stage([observation(['E36'])], CATALOGUE)[0]
        self.assertEqual(result['status'], 'facelift_resolution_required')
        self.assertEqual({g['generation_id'] for g in result['candidate_generations']}, {'e36', 'e36fl'})
        self.assertTrue(result['review_required'])
        self.assertTrue(result['broad_category'])

    def test_explicit_gt_alias_and_ambiguous_response(self):
        results = stage([observation(['F31', 'F34 GT'], 'Limousine')], CATALOGUE)
        gt = next(r for r in results if r['source_range'] == 'F34 GT')
        self.assertEqual(gt['candidate_generations'][0]['model_id'], 'gt')
        self.assertEqual(gt['ambiguous_source_queries'], 1)
        self.assertTrue(gt['review_required'])

    def test_errors_and_empty_results_do_not_create_relationships(self):
        self.assertEqual(stage([observation([]), observation(['E36'], status=403)], CATALOGUE), [])

    def test_unknown_code_stays_unmatched(self):
        result = stage([observation(['UNKNOWN'])], CATALOGUE)[0]
        self.assertEqual(result['candidate_generations'], [])
        self.assertEqual(result['status'], 'unmatched_range')

    def test_repeated_evidence_is_one_relationship(self):
        results = stage([observation(['F31'], 'EstateCar'), observation(['F31'], 'EstateCar')], CATALOGUE)
        self.assertEqual(len(results), 1)
        self.assertEqual(len(results[0]['evidence']), 2)
