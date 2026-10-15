# Brand visibility

Brand visibility uses a deterministic 0–100 heuristic, not market share:

- 60% popularity: average of the best three model-family mass-popularity deciles from the VehiclesDB 2026.10.4 snapshot. Decile 1 maps to 100 and 10 to 0. Fewer than three observations are averaged without padding; missing data uses a neutral 50.
- 25% curation: membership in `featured-brands.json` supplies 100, otherwise 0.
- 15% breadth: `min(1, log(1 + model families) / log(21)) * 100`. Catalogue records count once; linked source aliases, trims and generations do not add breadth. Breadth reaches its cap at 20 families.

Scores of 50 or more select the default main list. Display order remains alphabetical. Saved show/hide choices always win. When at most three uncustomized brands would remain below Show All, those brands join the main list. Explicitly hidden brands remain below Show All.

This is a coverage-limited popularity proxy. VehiclesDB aggregates measured registration/fleet observations across available markets; it is not worldwide market share or mobile.de listing inventory. Curation supplies a baseline for market gaps. The score is independent of account points and sightings.

`python3 scripts/build_brand_popularity.py` rebuilds `web/brand-popularity.json` from the checked-in licensed extract and catalogue reference links. It groups variant references by their owning model family. Rebuild after catalogue expansion or source refresh, review the resulting selection, and commit the snapshot; browsing makes no third-party calls. Source licence and attribution are on `credits.html`.

If the optional popularity file cannot load, selection uses neutral popularity plus curation and breadth. Existing stored preferences remain effective. The snapshot is deliberately stable between releases.
