# Additive model/reference expansion

The pre-expansion tag and branch were pushed before data changes. See ROLLBACK.md.

Sources: every non-Other make/model option in the audited mobile.de snapshot, plus every passenger-car row in the VehiclesDB snapshot. Code and data from the separate ODbL technical dataset are not part of this merge.

## What changed

- 3,532 model-reference records added: 579 initially created from mobile.de and 2,953 initially created from VehiclesDB.
- Total: 8,585 catalogue model-reference records in 538 source-normalized brand folders.
- Every one of the 8,052 source references is accounted for: 3,532 create a record, 4,505 link to an existing/new model, and 15 remain in unresolved-references.json rather than becoming false car models.
- Existing generation/specification records remain at 10,456 and 98,333. No chassis, facelift, engine, or per-generation body fitment is manufactured for the added reference-only entries.
- Original AUTO.RIA identities, names, dates, generations, specifications, BMW hierarchy, and stored sighting compatibility are preserved.

Counts describe records, not a claim that every external register label is a historically independent nameplate. Added records are labelled model_reference_only in the app. Some finer aliases/registration variants will still benefit from future curation.

## Reconciliation

Case/diacritic/punctuation normalization and explicit aliases are applied within a brand. Official model-group memberships, explicit BMW designation rules, and recognizable trim/body/drive suffixes attach variants to model families. Corvette source-make records attach to Chevrolet Corvette. Recognized BMW/Alpina references are reconciled with the existing BMW-Alpina folder. Ambiguous BMW labels such as XDRIVE30D, Active, or cross-make MINI registration names are kept for review, not counted as new vehicles.

Full source labels, source keys, record IDs, and match decisions are retained. referenceVariants appear in a collapsed Also listed as list on model pages and are searchable within the model list. They do not create separate collecting/points targets. Existing models may acquire referenceBodyStyles and marketCountries metadata; these are model-level source observations, not exact generation fitments or brand-origin claims.

## Data and licence

VehiclesDB passenger-car CSV, manifest, provenance, CC BY 4.0 licence and complete supplied source-attribution notices are in data/catalogue-sources/vehiclesdb. Attribution is visibly linked in the web app and reproduced on credits.html. The subset contains only kind=car, with original fields retained. User-authored sightings/photos remain separate local data. No third-party images were imported.

mobile.de models and model groups come from the documented reference service. The expansion uses 69 additional public group-membership responses, recorded in research/mobile-de-expansion/group-memberships/memberships.json.

## Reproduce

`python3 scripts/expand_catalogue.py` rebuilds both bundles and the merge report from the current original AUTO.RIA records and pinned local source snapshots. It removes only importer-owned metadata before re-linking, so running twice is repeatable. The normal CSV import CLI also invokes the expansion and retains the BMW hierarchy.

`merge-decisions.json` records every source reference and its target or unresolved decision. `summary.json` records counts. `unresolved-references.json` retains the 15 ambiguous labels.
