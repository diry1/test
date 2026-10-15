# E36 body/engine evidence and application mapping

This folder contains 44 read-only official mobile.de modelrange queries with PETROL specified. Designations 316, 320, 323, 325 and 328 were sampled in June 1995 and June 1998 across Limousine, EstateCar, SportsCar and Cabrio; four additional 325 queries sampled June 1993. Every response returned HTTP 200, including successful empty results.

The importer only assigns the corresponding existing petrol `...i` engine labels to an E36 body when an E36 result exists for that designation/category. It does not treat empty results as evidence that a car never existed. In this sample, 325 queries return no E36 support, so 325i remains available under Body style not specified. The same applies to unqueried/ambiguous variants such as 318iS and diesel designations. No 320d is invented for E36.

The user requested generation → pre-facelift/facelift → body → engine nesting. Body availability returned at E36 chassis-family level is inherited by both existing E36 version branches as browsing metadata, explicitly labelled chassis-family scoped. This is not confirmation that every power/gearbox/year combination applies to both versions. Existing technical variants remain generation-scoped reference options, and the UI communicates that limitation.

The E36 body labels are curated for this model: Limousine → Sedan, EstateCar → Wagon, SportsCar → Coupé, Cabrio → Convertible. The broad source-category keys are retained; these labels must not be generalized to unrelated manufacturers or chassis codes.

For unambiguous existing BMW body-specific codes (E90/E91/E92/E93, F30/F31, G20/G21) and the sampled X5 codes (E53/E70/F15/G05), the importer uses an explicit body dictionary gated by supporting staged responses. It does not apply returned G80/G81 codes to 3 Series. Other BMW chassis families retain Body style not specified until enriched.

`observations.json` preserves each complete URL, model, date, category, fuel, response status, returned codes and retrieval timestamp. Individual XML files preserve responses. No authentication, listing data, or images were used.

## Catalogue compatibility

`scripts/bmw_hierarchy.py` adds `generationFamilies` to BMW models without changing `generations` or `specifications`. Phases reference the original generation IDs, body branches reference original specification IDs, and every original specification remains reachable. The normal CSV importer invokes the same enrichment, so refreshing from the source does not discard the hierarchy.

The web app supports this hierarchy and stores optional bodyStyleID, bodyStyleLabel and engineName on sightings. Older sightings remain valid; body/engine fields are not inferred onto them. Existing points rules remain unchanged and body/engine selection earns no extra points. Model completion circles count distinct chassis families for grouped BMW models. The native prototype retains its existing flat-generation UI and can decode the enriched bundle, ignoring extra hierarchy fields.
