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

The supplied AUTO.RIA CSV was converted to 5,053 models across 388 brands, with 57 generation records. IDs are namespaced source identifiers, including the brand and model IDs. Multiple generation rows are grouped into a single model. Missing years remain unknown rather than being inferred. Variant fields were empty in the source, so variant selection is deferred.

Cards use a clearly labelled system car icon placeholder. Reference images, licensed usage, specifications, English generation labels, and richer generation coverage still need curation. Confirm catalogue reuse rights before distribution.

To rebuild from an original CSV:

```sh
python3 scripts/import_catalogue.py /path/to/catalogue.csv CarSpotter/Resources/catalogue.json
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
