# Catalogue expansion audit: mobile.de

This is a reference inventory and comparison, not a live catalogue import.

## Measured results

- 186 make options in the official passenger-car reference list, including one generic Other bucket; 185 named makes audited.
- 370 successful model/modelgroup collection requests (two per make); zero failures.
- 2,511 named model options after excluding 180 generic Other model buckets.
- 1,486 options have a normalized model-name/key match within a matched existing brand. These are candidate links, not independently verified identity equivalence.
- 1,025 unmatched model/variant labels require review. This is an upper-bound candidate inventory, not 1,025 confirmed new model families.
- 47 make labels do not match the current brand folders under the explicit normalization/alias rules. Only 20 of those have named model options; the other 27 expose no named model beyond Other.
- Those 20 brands contain 58 options. Corvette is treated as a separate make at mobile.de while our catalogue has Chevrolet Corvette; DFM/Forthing and other naming families also need reconciliation. Do not call all 58 options new vehicles.
- 69 model groups are available across the source. Only BMW's group membership was exhaustively acquired in the earlier pilot; other group memberships are not implied by this audit.

BMW accounts for 125 unmatched labels and Mercedes-Benz for 322: together 447 of the 1,025 candidates. Many represent engine/variant designations rather than absent model families.

Examples worth reviewing include Ariel Atom, Boldmen CR 4, Dallara Stradale, Donkervoort F22, Togg T10F/T10X, and modern BYD names. These examples have source reference entries, not verified production histories or a completed generation/specification tree.

## Files and reproduction

`raw/makes.xml` and the per-make model/modelgroup XML preserve official responses. `observations.json` records URLs, timestamps, SHA-256 checksums, parsed entries, and response statuses. `brand-comparison.csv` and `model-candidates.csv` are the review queues. `summary.json` contains totals.

Run `python3 scripts/audit_mobile_catalogue.py` for an offline rebuild. Add `--fetch` to refresh the 370 read-only list requests. Named makes are taken from the saved root snapshot; refresh that separately to change scope. Requests use `Accept: application/xml` and `Accept-Language: en`, with three workers and a delay per worker.

Matching normalizes case, diacritics, spacing and punctuation; explicit brand aliases are documented in the script. It does not merge similar model strings or infer engine/body/generation identity. Unknown and failed requests are not treated as empty successful results.

## Next import strategy

Start with a small reviewed group of new nameplates, resolve cross-brand aliases, and assign stable source-linked IDs. Next reconcile variant designations to existing generation/body/engine branches. Use sampled modelrange/trimline endpoints to enrich those records, preserving ambiguous results and provenance. No listing scraping is needed for this stage. Public endpoint access does not establish redistribution or image rights.

The app catalogue, initial featured brand list, user sightings, and points are unchanged by this audit.

Official reference documentation: https://services.mobile.de/manual/reference-data.html
