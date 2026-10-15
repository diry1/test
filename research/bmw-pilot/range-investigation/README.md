# BMW generation/body-category endpoint investigation

## Correction to the first pilot conclusion

The first pilot checked the older reference-data overview and make/model/group collection endpoints. Further inspection of the current [Search API documentation](https://services.mobile.de/docs/search-api.html#modelrange_refdata) found a documented **modelrange** reference endpoint. It is accessible without credentials in all 13 sampled requests, as is the trimline reference endpoint. This supersedes the initial recommendation that a separate source is necessarily needed to obtain any generation/body-category relationships.

```
/refdata/sites/GERMANY/classes/Car/makes/BMW/models/{model}/modelranges
  ?firstregistration=YYYYMM
  &category={category}
```

The documentation requires `firstregistration` and optionally accepts `category`, `fuel`, `doorcount`, and `trimline`. The related `trimlines` endpoint accepts `firstregistration`, optional category/fuel/doorcount, and `modelrange`.

Requests used `Accept: application/xml` and `Accept-Language: en`. No login or credentials were supplied. Listing Search API authentication is a separate requirement and was not tested with credentials.

## Observed results

| BMW model | Registration input | Category input | Returned range keys |
|---|---|---|---|
| 320 | 1995-06 | SportsCar | E36 |
| 320 | 1995-06 | Limousine | E36 |
| 320 | 1995-06 | EstateCar | E36 |
| 320 | 1995-06 | Cabrio | E36 |
| 318 | 1995-06 | SportsCar | E36 |
| 320 | 2014-06 | EstateCar | F31 |
| 320 | 2013-06 | EstateCar | F31 |
| 320 | 2014-06 | Limousine | F30, F34 GT |
| 320 | 2014-06 | none | E92, E93, F30, F31, F34 GT |
| X5 | 2015-06 | none | F15 |
| X5 | 2015-06 | Cabrio | empty |
| X5 | 1980-06 | none | empty |

The trimline lookup for BMW 320 / 2014-06 returned `-`, Edition Exclusive, Luxury Line, M Sport Edition, Modern Line, and Sport Line. The dash is a placeholder, not a trim to import.

The no-date BMW 320 modelrange request was separately checked and returned HTTP 400, consistent with the documented required date parameter. The documented Golf/2012-06 control returned `1KP`, `5G/MK7`, `5K/MK6`.

## Interpretation and limits

- This can supply evidence for generation/body-category candidate relationships; it is more useful than the generic body-category vocabulary alone.
- `SportsCar` is labelled **Sports Car/Coupe**, not exclusively Coupe. `Cabrio` means Convertible/Roadster; `EstateCar` means Estate car; `Limousine` means Saloon. Preserve source keys and broad meanings rather than claiming more specific classifications than returned.
- A single date may return several ranges. Registration date is a query input, not a certified production boundary. Do not derive exact production years or one-to-one generation mapping from these samples.
- The Saloon request returned both F30 and F34 GT; avoid treating category-to-generation mapping as exclusive.
- Empty responses show that category and date inputs affect the results; they do not prove that an absent combination never existed.
- Queries identify an engine designation such as `320`, not necessarily a complete `320i` engine specification. No engine/specification completeness claim is made.
- These samples cover selected BMW 318/320/X5 dates only, not all BMW generations or body styles.
- Public access does not establish redistribution/photo rights.

## Website-request inspection limitation

The mobile.de homepage is reachable. Its BMW results link uses `suchen.mobile.de`, and its application JavaScript is served from `static.classistatic.de`. Requests to those two domains were blocked at the cloud proxy (tunnel 403), so the interactive website's actual requests could not be observed. These are environment access restrictions, not proof of mobile.de authentication requirements. No undocumented website endpoint was guessed or authentication bypass attempted.

The documented reference endpoints above provide useful results independently of that browser inspection.

## Next useful step

Build a small staged matrix of model designation × representative registration dates × body category, beginning with 3 Series E36/F3x and X5 F15. Preserve each query and raw response, map the returned codes onto existing generation IDs, and flag broad/ambiguous categories. Review the mappings before changing the live catalogue. Do not infer empty combinations or exact production dates.

## Reproduce

`python3 scripts/probe_mobile_bmw_ranges.py` summarizes the saved results offline.
`python3 scripts/probe_mobile_bmw_ranges.py --fetch` refreshes the 13 documented reference requests.

`results.json` records full request URLs, retrieval timestamps, status codes, and returned keys. XML files retain source responses. No app catalogue, sightings, points, or UI was changed by this investigation.
