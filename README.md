# Car Spotter

An iOS 17+ SwiftUI prototype for collecting car sightings. Search a bundled catalogue, open a model card, optionally choose a known generation, and save a sighting with a photo and a note (up to 500 characters). My garage shows distinct model progress and repeat sightings; swipe to delete a sighting.

## Run on a Mac

Install Xcode and XcodeGen (`brew install xcodegen`), then run from this repository:

```sh
xcodegen generate
open CarSpotter.xcodeproj
```

Choose an iPhone simulator and Run. For a physical device, choose your signing team and change the example bundle identifier in `project.yml` before generating. The system photo picker provides library selection without requesting full library access. No camera capture is implemented.

Sightings and photos are stored locally using SwiftData. No account, server upload, sync, or independent photo verification is implemented. Removing the app removes its local collection.

## Catalogue

The supplied AUTO.RIA CSV was converted to 5,053 models across 387 English brand folders (388 source brand identities), with 10,456 generation records and 98,333 specification records from the full 99,401-row export. IDs are namespaced source identifiers, including the brand and model IDs. Multiple generation rows are grouped into a single model. Missing years remain unknown rather than being inferred. The browser supports specification cards and specification-level sightings. The native prototype uses the enriched generations but does not yet expose specifications. Identical specification labels with different source IDs are retained as distinct records; the CSV does not explain their differences. Body styles are not supplied as a separate field and are not inferred.

Cards use a clearly labelled system car icon placeholder. Reference images, licensed usage, body styles, and further technical details still need curation. Confirm catalogue reuse rights before distribution.

To rebuild from an original CSV:

```sh
python3 scripts/import_catalogue.py /path/to/catalogue.csv CarSpotter/Resources/catalogue.json
cp CarSpotter/Resources/catalogue.json web/catalogue.json
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

The CSV itself is not committed. The JSON catalogue is bundled for offline search. Import tests validate grouping, identity, unknown years, record counts, and year ranges.

## Validation status

Import tests and exact re-import comparison pass in the Linux cloud environment. This environment has no Swift compiler or Xcode; the app has not been compiled or run in a simulator.

Before treating the app as ready, build in Xcode and verify: search for a known model, save a model-only sighting, save a generation sighting with a photo and note, cancel a draft, relaunch and check persistence, then delete sightings and check model progress. Check photo loading failures and empty search results as well.

## Browser version

The `web/` directory contains a responsive, dependency-free browser app with the same catalogue, brand filtering, car cards, optional generation selection, photo and note logging, collection progress, deletion, and JSON backup export.

From the repository root:

```sh
python3 -m http.server 8000 --directory web
```

Open the server in a browser on your PC. Serve through localhost for local development or HTTPS for deployment; do not open `index.html` directly. For public hosting, upload the contents of `web/` to a static HTTPS host. No backend is required. This repository has not been publicly deployed.

Sightings are saved in IndexedDB, scoped to the browser and site address. They do not sync with the native iOS prototype or other browsers. Clearing site data removes them. Export a backup before clearing data; backup import is not implemented yet. Photos are resized to a maximum 1,600 pixels and stored locally, not uploaded to a server. Reference pictures remain labelled placeholders.

The browser smoke test uses Playwright:

```sh
npm install --prefix /tmp/car-spotter-tests playwright
NODE_PATH=/tmp/car-spotter-tests/node_modules node web/tests/smoke.cjs
```

Install Playwright Chromium first, or set `CHROMIUM_PATH` to an existing Chromium executable. Start the server before running the test. `CAR_SPOTTER_URL` can override its address.

## GitHub Pages

The `.github/workflows/pages.yml` workflow deploys `web/` after a push to `main` or a manual workflow run. In the GitHub repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. Then run **Actions → Deploy Car Spotter to GitHub Pages → Run workflow** if the initial push happened before Pages was enabled.

After a successful deployment, GitHub reports the live address on the Pages settings screen and workflow deployment. For `diry1/test`, the expected address is `https://diry1.github.io/test/`. That address only works after Pages is enabled and deployment succeeds. Catalogue data is public; personal sightings and photos remain in the visitor's browser. No credentials are included in the site.

Catalogue browsing now starts with brand folders. Open a brand to see its models, open a model to see its available generations, and open a generation to see the specifications level. Breadcrumbs navigate back through the hierarchy; search covers the entire catalogue from every folder. Models without generation data and generations without specifications show explicit missing-data messages. You can log either a model-only sighting or a generation sighting, with the selected generation prefilled. Existing saved sightings remain compatible.

All catalogue labels are converted to English on import. Proper names use curated English spellings or transliteration; engine/chassis codes retain Latin technical notation. Horsepower is labelled hp (the supplied numeric values are not converted). Source brand labels Zuk and Жук share the Zuk folder; model identities remain unchanged. Existing sightings resolve their catalogue titles by ID, leaving personal notes unchanged.

### Letter pages

The browser opens on A and switches between individual letters using the highlighted alphabet panel. There is no combined all-letter view. `web/featured-brands.json` contains the 226 English brand entries extracted from the supplied AUTO.RIA recording. Those entries supply the curated component of the popularity-based main-list selection; see `web/BRAND-RANKING.md`. A card-sized Show All control reveals the remaining catalogue brands for that letter in a separate alphabetical section below the initial list. Search covers all letters and hierarchy levels; changing letters clears search and collapses additional brands. Returning from a brand folder preserves the active letter. Featured brands without model records (currently Peterbilt) show a missing-data message rather than invented models.

Brand cards have a settings gear. **Move to main list** promotes a brand from Show All into its alphabetical position in the main list. **Hide under Show All** moves a main-list brand into the additional list, where it can be restored later. Browser-local preferences override the supplied featured list and survive reloads; clearing site data resets them. Hiding a brand does not delete its sightings. Preference writes report storage errors without changing the visible lists.

To verify preferences with the local server running, run `node web/tests/brand-preferences.cjs` with the same Playwright/browser environment variables as the smoke test.

When a letter has three or fewer additional brands, all its brands appear in one alphabetical main list and Show All is omitted. The threshold is calculated before search and includes saved brand preferences. Letters with four or more additional brands retain the two-list layout.

Brand and model cards display completion circles. Brand completion is distinct spotted models divided by available models in the brand. Model completion is distinct spotted generations divided by known generations; model-only sightings do not imply a particular generation. Models with no generation records use a binary model-spotted percentage. Repeated sightings do not increase completion. Brands without any model data show an unavailable dash. The percentage stays below 100 until every relevant entry is spotted.

### Discovery points

A score gauge at the top of the browser app is recalculated from all saved sightings: one point per distinct model, twenty points per distinct brand, and one point per distinct identified generation. A first model with an identified generation earns 22 points; another generation of that same model adds one. Engine/trim specifications, photographs, notes, and repeat sightings do not award additional points. Catalogue membership is checked, including whether a generation belongs to the logged model. Existing sightings count automatically, and deleting the last sighting of a discovery removes its points. No separate incremental points balance exists, so delete/re-add cannot accumulate extra credit. The gauge targets are visual progress markers, not extra point rewards. Points stay in the current browser via saved sightings; no account or cloud sync exists yet.

Run the scoring tests with `node --test web/tests/score.test.mjs`. They also run before Pages deployment.

Each catalogue brand, model, generation, and specification card includes a Google it link. Queries include the selected brand and each available deeper level; specification searches include the supplied specification name. Links open Google Search in a separate tab without changing the current folder. Sighting cards and model/generation/specification detail views also have contextual links. Notes and photos are never included in the search query.

### BMW generation hierarchy

BMW browser navigation now groups the chassis code above its existing facelift versions:

`BMW → 3 Series → E36 → Pre-facelift (non-LCI) / Facelift (LCI) → Sedan / Wagon / Coupé / Convertible → engine designation`

Engine cards group repeated gearbox/power records into labels such as 320i. Optional technical-reference selection remains available when logging. The body and engine are saved with the sighting and included in contextual Google searches. Changing a generation or body clears dependent selections. Unsupported combinations remain under **Body style not specified**, including existing specifications whose exact body assignment is unknown. For known body-specific codes, F31 leads to Wagon and F15 to SUV. The native prototype's browsing UI remains flat.

The hierarchy is additive: all existing model, generation and specification IDs and source fields remain unchanged. BMW model completion counts chassis families, while the existing discovery-points formula remains unchanged; selecting bodies or engines never adds points. See `research/bmw-pilot/e36-engine-evidence/README.md` for source scope and limitations. Run `python3 scripts/bmw_hierarchy.py` to regenerate the hierarchy from the existing bundle, or run the normal CSV importer to rebuild it from source. Test the full browser path with `node web/tests/bmw-hierarchy.cjs` using the same Playwright environment options as other browser tests.

### Expanded model index and rollback

The catalogue now contains **8,585 model-reference records across 538 brand folders**. The expansion adds 3,532 records from the audited mobile.de and VehiclesDB indexes. Existing families also gain searchable model/variant aliases; those references do not create separate model points. Original generation/specification counts remain unchanged, and reference-only additions are clearly labelled where deeper details are pending. Fifteen ambiguous registration labels remain in the review report.

Additional vehicle data by **[VehiclesDB](https://vehiclesdb.com)**, **CC BY 4.0**, built from official public registers. Full licence and required source notices are in `data/catalogue-sources/vehiclesdb/` and visibly linked in the app's Data sources & attribution page. See [expansion details](research/catalogue-expansion/README.md).

A complete pre-expansion copy is saved on GitHub under tag **catalogue-before-expansion-2026-10-15** and branch **backup/catalogue-before-expansion-2026-10-15**. See [rollback steps](research/catalogue-expansion/ROLLBACK.md). Run `python3 scripts/expand_catalogue.py` to reproduce the expansion from the pinned sources; source refreshes are separate explicit operations.


### Global catalogue search

The search field is available in catalogue folders and My garage. Multi-word searches match each word across the full catalogue path in any order: `bmw e30`, `e30 bmw`, and `bmw 320i` work while typing and after submission, even with intervening levels such as `3 Series`. Typing shows name-prefix suggestions (and contained-number matches for numeric searches such as `320`) across brands (including those under Show All), models and aliases, generations, BMW body styles, and specifications. Suggestions rank exact names first, followed by prefixes. Submitted results sort by hierarchy level (brands, models, generations, body styles, specifications), then alphabetically by full path. Every result must contain the query in its path or aliases. Press Enter or Search for broader partial matches, including combinations such as `BMW F30 320i`. Results show their complete catalogue path and open the matching folder or specification card. For example, `F30` opens BMW → 3 Series → F30. Clearing the input restores the current folder. Search runs locally without third-party requests.

Validate search with `node --test web/tests/*.test.mjs` and the Playwright browser flow `node web/tests/search.cjs` (using `CAR_SPOTTER_URL` and `CHROMIUM_PATH` as needed).

Browser entry scripts and the search module use versioned URLs so cached JavaScript from an older deployment does not leave the updated search form running the old letter filter. Bump those URLs when changing search behavior.

### Expanded search filters

Expand search opens brand and dependent model selectors, generation-production year-from/year-to fields, and reported horsepower bounds. Filters combine with text search, work without text, and apply across all letters. Year ranges use inclusive overlap, with unspecified generation end years treated as open-ended. Horsepower is parsed only from explicit `hp` labels, without converting kW or inferring missing power. Missing required metadata excludes an entry; horsepower filters therefore return specifications, while year filters return dated generations and their descendants. Invalid reversed ranges show an error. Clear filters retains text; navigating to a result or another letter clears filters. A summary remains visible when the panel is collapsed.

In the current snapshot all 10,456 generation records have a start year; 97,361 of 98,333 specification labels contain an extractable horsepower value. These are source labels, not independently verified measurements. Model-reference-only additions cannot satisfy year or power filters until deeper metadata is added. Run `node web/tests/search-filters.cjs` with the same Playwright options as the other browser checks.
