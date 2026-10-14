"""Convert the supplied catalogue to stable, grouped model records."""
import argparse
import csv
import json
from pathlib import Path


def convert(source):
    models = {}
    with open(source, encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            key = f"autoria:{row['make_id']}:{row['model_id']}"
            model = models.setdefault(key, {
                "id": key, "brand": row["make"].strip(),
                "name": row["model"].strip(), "generations": [],
            })
            if row["generation_id"]:
                generation = {
                    "id": f"{key}:generation:{row['generation_id']}",
                    "name": row["generation"].strip(),
                    "yearFrom": int(row["year_from"]) if row["year_from"] else None,
                    "yearTo": int(row["year_to"]) if row["year_to"] else None,
                }
                if not any(g["id"] == generation["id"] for g in model["generations"]):
                    model["generations"].append(generation)
    return sorted(models.values(), key=lambda m: (m["brand"].casefold(), m["name"].casefold(), m["id"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    models = convert(args.source)
    Path(args.destination).write_text(json.dumps(models, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(models)} models, {len({m['brand'] for m in models})} brands, "
          f"{sum(len(m['generations']) for m in models)} generations")
