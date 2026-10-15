# BMW catalogue expansion pilot

Status: baseline prepared; mobile.de acquisition blocked by cloud network policy. No mobile.de data has been acquired or merged.

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

## Network prerequisite

Draft additions saved: mobile.de, www.mobile.de, services.mobile.de. Existing network presets were preserved. Saving a draft does not apply runtime access or publish it. Read-only requests still receive a proxy tunnel 403, so API availability and contents remain unverified.

## Deliverables

- baseline-models.csv: one row per BMW model.
- baseline-generations.csv: one row per BMW generation; blank body_style means unknown.
- This report contains only the existing catalogue baseline.
