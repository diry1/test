import copy
import unittest
from expand_catalogue import merge_expansion


def car(id, brand, name):
    return dict(id=id,brand=brand,name=name,generations=[])


def mobile(make, brand, models):
    return dict(kind='models',status=200,make_key=make,make_name=brand,entries=[dict(key=k,name=n) for k,n in models])


def vehicle(brand, name, make_slug, model_slug, aliases=''):
    return dict(kind='car',make_name=brand,model_name=name,make_slug=make_slug,model_slug=model_slug,aliases=aliases,body_types='coupe',countries='de|nl')


class ExpansionTests(unittest.TestCase):
    def test_preserves_originals_and_deduplicates_cross_source_names(self):
        base=[car('autoria:1:1','Abarth','Fiat 500')]
        original=copy.deepcopy(base)
        result, decisions, unresolved=merge_expansion(base,
            [mobile('ABARTH','Abarth',[('500','500')]),mobile('ARIEL','Ariel',[('Atom','Atom')])],
            [vehicle('Ariel','Atom','ariel','atom')],[])
        self.assertEqual(base,original)
        self.assertEqual(len(result),2)
        self.assertEqual(next(c for c in result if c['brand']=='Abarth')['id'],'autoria:1:1')
        atom=next(c for c in result if c['brand']=='Ariel')
        self.assertEqual(atom['id'],'mobilede:Car:ARIEL:Atom')
        self.assertEqual(len(atom['sourceReferences']),2)
        self.assertEqual(atom['generations'],[])
        self.assertEqual(atom['marketCountries'],['de','nl'])
        self.assertEqual(unresolved,[])

    def test_source_engine_option_links_to_existing_model_family(self):
        base=[car('autoria:9:3219','BMW','3 Series')]
        groups=[dict(status=200,make='BMW',name='3 Series',models=[dict(key='320',name='320')])]
        result, decisions, unresolved=merge_expansion(base,[mobile('BMW','BMW',[('320','320')])],[],groups)
        self.assertEqual(len(result),1)
        self.assertEqual(decisions[0]['reason'],'source_family_membership')
        self.assertEqual(result[0]['referenceVariants'][0]['name'],'320')

    def test_ambiguous_engine_without_model_is_retained_for_review(self):
        result, decisions, unresolved=merge_expansion([car('autoria:9:3219','BMW','3 Series')],[],
            [vehicle('BMW','XDRIVE30D','bmw','xdrive30d')],[])
        self.assertEqual(len(result),1)
        self.assertEqual(len(unresolved),1)
        self.assertEqual(decisions[0]['action'],'unresolved_reference')

    def test_corvette_source_brand_does_not_duplicate_chevrolet_model(self):
        result, decisions, unresolved=merge_expansion([car('autoria:13:1','Chevrolet','Corvette')],
            [mobile('CORVETTE','Corvette',[('C8','C8')])],[],[])
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['referenceVariants'][0]['name'],'C8')

    def test_source_failure_is_not_silently_ignored(self):
        with self.assertRaises(ValueError):
            merge_expansion([], [dict(kind='models',status=403,make_key='BMW')],[],[])
