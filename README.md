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

Catalogue browsing now starts with brand folders. Open a brand to see its models, open a model to see its available generations, and open a generation to see the specifications level. Breadcrumbs navigate back through the hierarchy; search filters the current folder. Models without generation data and generations without specifications show explicit missing-data messages. You can log either a model-only sighting or a generation sighting, with the selected generation prefilled. Existing saved sightings remain compatible.

All catalogue labels are converted to English on import. Proper names use curated English spellings or transliteration; engine/chassis codes retain Latin technical notation. Horsepower is labelled hp (the supplied numeric values are not converted). Source brand labels Zuk and Жук share the Zuk folder; model identities remain unchanged. Existing sightings resolve their catalogue titles by ID, leaving personal notes unchanged.

### Letter pages

The browser opens on A and switches between individual letters using the highlighted alphabet panel. There is no combined all-letter view. `web/featured-brands.json` contains the 226 English brand entries extracted from the supplied AUTO.RIA recording. Only those brands appear initially on each letter page. A card-sized Show All control reveals the remaining catalogue brands for that letter in a separate alphabetical section below the initial list. Search stays within the active letter; changing letters clears search and collapses additional brands. Returning from a brand folder preserves the active letter. Featured brands without model records (currently Peterbilt) show a missing-data message rather than invented models.

Brand cards have a settings gear. **Move to main list** promotes a brand from Show All into its alphabetical position in the main list. **Hide under Show All** moves a main-list brand into the additional list, where it can be restored later. Browser-local preferences override the supplied featured list and survive reloads; clearing site data resets them. Hiding a brand does not delete its sightings. Preference writes report storage errors without changing the visible lists.

To verify preferences with the local server running, run `node web/tests/brand-preferences.cjs` with the same Playwright/browser environment variables as the smoke test.

When a letter has three or fewer additional brands, all its brands appear in one alphabetical main list and Show All is omitted. The threshold is calculated before search and includes saved brand preferences. Letters with four or more additional brands retain the two-list layout.

Brand and model cards display completion circles. Brand completion is distinct spotted models divided by available models in the brand. Model completion is distinct spotted generations divided by known generations; model-only sightings do not imply a particular generation. Models with no generation records use a binary model-spotted percentage. Repeated sightings do not increase completion. Brands without any model data show an unavailable dash. The percentage stays below 100 until every relevant entry is spotted.

### Discovery points

A score gauge at the top of the browser app is recalculated from all saved sightings: one point per distinct model, twenty points per distinct brand, and one point per distinct identified generation. A first model with an identified generation earns 22 points; another generation of that same model adds one. Engine/trim specifications, photographs, notes, and repeat sightings do not award additional points. Catalogue membership is checked, including whether a generation belongs to the logged model. Existing sightings count automatically, and deleting the last sighting of a discovery removes its points. No separate incremental points balance exists, so delete/re-add cannot accumulate extra credit. The gauge targets are visual progress markers, not extra point rewards. Points stay in the current browser via saved sightings; no account or cloud sync exists yet.

Run the scoring tests with `node --test web/tests/score.test.mjs`. They also run before Pages deployment.

Each catalogue brand, model, generation, and specification card includes a Google it link. Queries include the selected brand and each available deeper level; specification searches include the supplied specification name. Links open Google Search in a separate tab without changing the current folder. Sighting cards and model/generation/specification detail views also have contextual links. Notes and photos are never included in the search query.
