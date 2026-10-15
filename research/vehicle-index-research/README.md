# Reusable vehicle indexes: researched options

Repository web searches and actual data/licence samples were inspected. General Google/Bing search and direct NHTSA access were blocked by this environment's network policy; no claim is made that those searches or the live NHTSA API succeeded.

## Best breadth candidate: VehiclesDB

https://github.com/vehiclesdb/vehiclesdb

The sampled CSV contains **5,541 passenger-car model records**, within a larger multi-vehicle dataset. With the same simple name normalization used for our mobile.de audit, 2,241 match an existing model/brand and **3,300 remain unmatched candidates**. These are not 3,300 verified additions: examples include Abarth 500 versus our Fiat 500, body-name variants, trims, registration-specific names and unmatched brand aliases. The sampled manifest identifies version 2026.10.4; the repository README still describes 2026.10.3. Use pinned releases and checksums rather than relying on the README count alone.

The actual LICENSE states **CC BY 4.0**, requires VehiclesDB attribution, and retains upstream source notices in ATTRIBUTION.md. Its sources include official registration and type-approval data, with provenance in the project. It is primarily a nameplate/index source, not a complete chassis/facelift/body/engine hierarchy. Country availability means market/register presence, not the brand's country of origin; do not directly use it to award German/Japanese-brand milestones.

Recommendation: evaluate for additional nameplates and aliases. Reconcile names first and preserve all required source credits before importing.

## Best sampled technical-depth candidate: vehicle-makes-models

https://github.com/gor3a/vehicle-makes-models

The README advertises 164 makes, 2,621 models, 7,169 generations and 30,390 engine variants. Those full totals are publisher claims, not a full-dataset count performed here. The actual BMW JSON sample contains **65 models, 286 generation records and 2,372 engine records**. It includes technical values, raw specifications, production spans, and generation labels such as `3 Series Coupe (1992)` and `3 Series Sedan (1991)`.

Important quality detail: **all 286 BMW bodyType fields are null**, although many generation names encode a body type. Chassis codes/facelift boundaries still need mapping; this is not a ready-made E36 → phase → Coupe → engine tree. Generation naming differs from our source and some coverage is absent.

The data licence is **ODbL 1.0** with attribution/share-alike conditions; the MIT badge applies to code, not the data. The licence names autoevolution.com as its upstream source. Confirm downstream reuse/provenance and the project's database-licensing approach before merging. No dataset content was imported into the app or bulk-vendored here.

Recommendation: small BMW body/engine comparison sample first, subject to the licensing decision.

## Secondary generation index: car-api / auto-parts-db

https://github.com/lifeofcapo/car-api

Actual JSON count: **142 brands, 2,379 model entries, 4,642 generation records**. The inspected licence is MIT. Data includes chassis/year labels but needs careful validation: the BMW sample places E21 under M3, groups multiple chassis codes into one generation, and repeats some electric-car codes under alternate labels. Smaller size is not itself a defect, but this is unsuitable as an unquestioned master catalogue.

Recommendation: secondary candidate lookup only; do not overwrite current history from it automatically.

## US-market historical index

https://github.com/abhionlyone/us-car-models-data

README advertises 15,000+ year/model entries for 1992–2026. These are not necessarily distinct nameplates or generations. The inspected licence is CC BY 4.0. The maintainer states free updates have stopped and richer, current specifications require a paid subscription. The full CSV was not audited in this investigation.

Recommendation: potential US-market supplement; not the best primary source for European chassis/body hierarchies.

## Not recommended yet

https://github.com/florianbaillien/dataset-automobile-worldwide advertises 2,147 models. The inspected overview did not identify a licence or enough detail to establish a reusable source. Do not treat a publicly visible repository as permission to redistribute its data.

## Recommended combination

Retain the current AUTO.RIA-derived IDs and catalogue as the backbone. Use VehiclesDB to investigate missing nameplates and aliases, mobile.de's official references to reconcile designations and sample chassis/body relationships, and a carefully vetted technical dataset for deeper specifications. Stage all candidates with source identity and confidence, then import reviewed additions. Raw record totals from these sources cannot be summed because their entity levels overlap.

`source-checks.json` records measured versus advertised counts and licence findings. `examined-files.json` records direct source URLs and SHA-256 checksums of downloaded samples. Third-party datasets were inspected in temporary storage; they were not merged into production.
