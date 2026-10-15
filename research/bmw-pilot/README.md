# BMW catalogue expansion pilot

Status: official mobile.de reference data acquired and compared. Pilot complete for public reference endpoints; no live catalogue changes made.

## Baseline

- 75 models, 298 generation records, 3236 specification records.
- 2810 distinct specification labels when scoped to their generation; 426 additional records share a label. These may represent differences omitted by the source, so they have not been deleted.
- 1 models have no generation data: Neue Klasse.
- Body style is missing as a structured field throughout the source.
- Dates and labels are source observations, not independently verified vehicle-history facts.

## Initial comparison targets

| Model | Existing generations | Existing specifications |
|---|---:|---:|
| 3 Series | 23 | 913 |
| 3 Series Compact | 2 | 18 |
| 3 Series GT | 2 | 51 |
| X5 | 8 | 64 |
| 5 Series | 21 | 444 |
| M3 | 13 | 47 |

## Next acquisition and review steps

1. Verify official mobile.de API documentation, reference-data availability, access requirements, and reuse terms after network access is available. No API credentials have been requested or assumed.
2. If necessary, examine ordinary public BMW search filter requests using the supported browser session; do not bypass access restrictions.
3. Capture reference records with source identity and retrieval date. Keep raw listing-derived observations separate from verified catalogue entities.
4. Compare BMW model options, E36 body styles, F30/F31 relationships, and X5 generation/variant coverage. An engine or seller listing title alone does not establish a generation/body-style relationship.
5. Produce a candidate mapping with existing app IDs, external IDs, evidence, confidence, and unresolved conflicts. Do not merge by display name alone.
6. Review verified additions before applying them to both catalogue bundles; preserve existing IDs, sightings, completion calculations, and points.

## Initial network prerequisite (resolved)

Draft additions saved: mobile.de, www.mobile.de, services.mobile.de. Existing network presets were preserved. Saving a draft does not apply runtime access or publish it. Initial read-only requests received a proxy tunnel 403. After the user applied the configuration, the homepage, official documentation, and reference endpoints returned HTTP 200.

## Deliverables

- baseline-models.csv: one row per BMW model.
- baseline-generations.csv: one row per BMW generation; blank body_style means unknown.
- This report contains only the existing catalogue baseline.


## Verified mobile.de findings

The official [API overview](https://services.mobile.de/manual/index.html) distinguishes reference data from the account-based Search API. The [reference documentation](https://services.mobile.de/manual/reference-data.html) explicitly states that authentication is not required for reference data, requires `Accept: application/xml`, and supports English via `Accept-Language: en`. JSON is no longer supported for reference data. The [Search API documentation](https://services.mobile.de/manual/search-api.html) requires an account and Basic authentication for listings; no listing credentials were requested or used.

Retrieved official reference endpoints:

- [BMW models](https://services.mobile.de/refdata/classes/Car/makes/BMW/models): 162 entries.
- [BMW model groups](https://services.mobile.de/refdata/classes/Car/makes/BMW/modelgroups): 10 groups; all ten group membership endpoints were also retrieved.
- [Generic car categories](https://services.mobile.de/refdata/classes/Car/categories): eight categories. These are a vocabulary, not evidence that a particular BMW generation has a particular body style.

The CSV comparison contains 36 direct key/label matches, 125 entries requiring review, and one Other bucket. Direct name matches are candidate cross-source links, not verified generation/specification equivalence. Case-insensitive matching handles source casing such as i3 versus I3. Raw source keys and labels are retained, including occasional German spellings in the English response.

Examples of incompatible levels:

- mobile.de groups 320 and 330 under 3 Series; our catalogue already stores engine/variant-level entries beneath 3 Series generations. They are not automatically new top-level model families.
- mobile.de lists X5 M50 as a model entry; our existing X5 specifications already include M50d and M50i. Treating that entry as a new family would duplicate existing coverage.
- The BMW model, model-group, and category snapshots contain no chassis-generation mapping or generation-specific body styles. They cannot resolve E36 Coupe or F30/F31 relationships by themselves.
- The documented item URLs returned for individual model/X5 and model/320 were checked and returned HTTP 404; the collection endpoints above were successful. No alternate routes or undocumented generation endpoints were assumed.

## Recommendation

Retain the current application catalogue. Use mobile.de reference data as external model/variant aliases for discovery and reconciliation, with manual review of the 125 unmatched entries. For generation/body-style enrichment, obtain a source that explicitly maps those fields or an authorized listing-data sample that can be evaluated separately. Public reference endpoint access does not establish broader data-redistribution or photo rights.

No generation, body style, specification, point total, or sighting identity was changed by this pilot. The comparison is staged for review.

## Reproduce the comparison

Run `python3 scripts/bmw_mobile_pilot.py` from the repository. It processes the captured XML offline and rewrites `mobile-de-comparison.csv` and `comparison-summary.json`. Raw responses are in `mobile-de/`, with retrieval metadata and checksums in `mobile-de/provenance.json`. No credentials or seller data are included.
