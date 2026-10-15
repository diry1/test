# Staged BMW generation/body-category mapping

This is a research dataset for review, not an app import. Both production catalogue bundles are unchanged.

## Scope and results

48 documented public modelrange queries: BMW 320 at nine representative June registration dates (1993–2024) across four body categories; X5 at five representative June dates (2002–2024) across SUV/off-road and convertible controls; BMW 318 at June 1995 as a second E36 designation check.

- 48 successful responses; zero failed queries.
- 13 successful responses were empty. They are preserved as observations, not converted into claims that a body style never existed.
- 25 candidate source-model/range/category relationships, across 17 source range codes.
- One relationship has a single candidate generation record: X5 → F15 → the broad SUV/off-road/pickup category.
- 22 relationships match multiple existing base/facelift generation records. None were automatically assigned to a facelift.
- Two returned ranges do not match within the intended 3 Series/3 Series GT families: G80 and G81. They match existing M3 generation records and are flagged as cross-model conflicts, not imported as BMW 320 generations.

All relationships retain `review_required: true`, including the single-candidate match.

## Representative candidates

| Source designation | Returned code | Source body category | Candidate app location | Review issue |
|---|---|---|---|---|
| 318 / 320 | E36 | Sports Car/Coupe | 3 Series → E36 or E36 (FL) | Category is broader than coupe; facelift not identified |
| 320 | E36 | Saloon, Estate car, Convertible/Roadster | 3 Series → E36 or E36 (FL) | Each body category is a separate candidate with its own evidence |
| 320 | E46 | Four source body categories | 3 Series → E46 or E46 (FL) | Facelift not identified |
| 320 | E90 / E91 | Saloon / Estate car | Matching existing chassis families | Facelift not identified |
| 320 | E92 / E93 | Sports Car/Coupe / Convertible/Roadster | Matching existing chassis families | Broad categories; facelift not identified |
| 320 | F30 / F31 | Saloon / Estate car | Matching existing chassis families | Facelift not identified |
| 320 | F34 GT | Saloon | 3 Series GT → F34 or F34 (FL) | Explicit source alias; category is not an exclusive body-style taxonomy |
| 320 | G20 / G21 | Saloon / Estate car | Matching existing chassis families | Facelift not identified |
| 320 | G80 / G81 | Saloon / Estate car | No proposed 320 mapping | Cross-model conflict: these codes are under M3 in the existing catalogue |
| X5 | E53 / E70 / G05 | SUV/Off-road Vehicle/Pickup Truck | Matching X5 chassis families | Facelift not identified; source category broader than SUV |
| X5 | F15 | SUV/Off-road Vehicle/Pickup Truck | X5 → F15 | Single ID match, still staged for review |

The 2024 BMW 320 samples returned G80/G81 without G20/G21, making modern coverage particularly unsuitable for a blind import. This is an observed inconsistency between the source designation and our catalogue, not proof of why the source behaves that way.

## Evidence and interpretation

Every candidate stores query IDs, exact URLs, registration inputs, and all returned codes. `observations.json` records response status, timestamp, and SHA-256; `raw/` retains XML. Registration dates are input filters, not production boundaries. Overlapping source results are preserved. No engine/trim specification has been assigned to a body style by inference.

Mapping uses exact chassis-code identity within explicitly scoped catalogue families. Only two normalizations are allowed: strip our `(FL)` suffix for candidate-family matching, and map source `F34 GT` to catalogue `F34` under 3 Series GT. Both base and facelift IDs remain candidates regardless of the date input. Cross-model matches are diagnostic warnings only.

## Review recommendation

1. Review family-level body categories for E36, E46, E9x and F3x; validate precise Coupe/Convertible/SUV wording using a narrower authoritative body-style source.
2. Resolve whether body categories should be inherited by both base and facelift records; do not choose one solely from registration date.
3. Leave G80/G81 conflicts excluded until the source behaviour is understood.
4. After review, prepare a separate explicit import with approved mappings. Adding a body-style level changes the UI and sighting schema; it must preserve existing model/generation IDs and keep model/generation-only sightings valid. Body styles must not silently add extra score points.

## Reproduce

- `python3 scripts/stage_bmw_body_styles.py` rebuilds the staged JSON, CSV and summary offline.
- `python3 scripts/stage_bmw_body_styles.py --fetch` refreshes the 48-request sample, with two workers and a small delay between requests per worker. HTTP failures remain failures and are never treated as empty successful responses.
- `python3 -m unittest discover -s scripts -p 'test_*.py' -v` checks ambiguity handling, aliases, empty/error responses, and catalogue integrity.

The source contract is documented at https://services.mobile.de/docs/search-api.html#modelrange_refdata . Public reference access does not establish data-redistribution or image rights.
