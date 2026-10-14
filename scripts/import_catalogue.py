"""Convert the supplied catalogue to stable, grouped model records."""
import argparse
import csv
import json
import re
from pathlib import Path


def english_generation(label):
    label = re.sub(r"покол[іi]ння", "Generation", label.strip(), flags=re.IGNORECASE)
    label = re.sub(r"рестайл[іi]нг", "Facelift", label, flags=re.IGNORECASE)
    if "Generation" in label:
        label = re.sub(r"^[IVXІ]+", lambda m: m[0].replace("І", "I"), label)
    return label


def convert(source):
    models = {}
    generations = {}
    specifications = set()
    with open(source, encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            key = f"autoria:{row['make_id']}:{row['model_id']}"
            model = models.setdefault(key, {
                "id": key, "brand": row["make"].strip(),
                "name": row["model"].strip(), "generations": [],
            })
            if row["generation_id"]:
                generation_key = f"{key}:generation:{row['generation_id']}"
                if generation_key not in generations:
                    generation = {
                        "id": generation_key,
                        "name": english_generation(row["generation"]),
                        "yearFrom": int(row["year_from"]) if row["year_from"] else None,
                        "yearTo": int(row["year_to"]) if row["year_to"] else None,
                        "specifications": [],
                    }
                    generations[generation_key] = generation
                    model["generations"].append(generation)
                generation = generations[generation_key]
                if row["modification_id"]:
                    spec_id = f"{generation_key}:spec:{row['modification_id']}"
                    if spec_id not in specifications:
                        generation["specifications"].append({
                            "id": spec_id, "name": row["modification"].strip(),
                            "sourceID": row["modification_id"],
                        })
                        specifications.add(spec_id)
    return sorted(models.values(), key=lambda m: (m["brand"].casefold(), m["name"].casefold(), m["id"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    models = convert(args.source)
    Path(args.destination).write_text(json.dumps(models, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Imported {len(models)} models, {len({m['brand'] for m in models})} brands, "
          f"{sum(len(m['generations']) for m in models)} generations")
