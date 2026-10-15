# Pre-expansion rollback copy

Before any catalogue expansion, both of these refs were saved and pushed to GitHub:

- Tag: `catalogue-before-expansion-2026-10-15`
- Branch: `backup/catalogue-before-expansion-2026-10-15`
- Commit: `ac094f2` (the tag resolves to the complete commit)
- Original catalogue: 5,053 model records, 387 English brand folders, 10,456 generation records, 98,333 specifications.
- SHA-256 of `web/catalogue.json`: `dfc49fc7503c99e1c0ca5c09bc411864713be78518a421c322023d06a9f8013e`

View or download the full copy from:
https://github.com/diry1/test/tree/catalogue-before-expansion-2026-10-15

## Restore the catalogue without rewriting history

From a clean checkout, restore both bundles together:

```sh
git restore --source=catalogue-before-expansion-2026-10-15 -- web/catalogue.json CarSpotter/Resources/catalogue.json
python3 -m unittest discover -s scripts -p 'test_*.py' -v
git add web/catalogue.json CarSpotter/Resources/catalogue.json
git commit -m "Restore pre-expansion catalogue"
git push origin HEAD:main
```

The next Pages deployment serves the restored data. The current UI is compatible with the saved bundle; the Python catalogue checks accept the baseline snapshot. Browser-local photos, notes and sightings are never deleted by this rollback. Sightings of newly added source-only models retain their stored titles, but those models are absent from the restored catalogue and no longer contribute to its score until restored.

To inspect the entire old app separately, check out the backup tag or branch in a separate local clone. Do not force-push or reset main to recover the snapshot.

The source refresh/import scripts intentionally rebuild the expanded dataset. Avoid running them after rollback unless expansion is desired again.
