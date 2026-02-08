import csv
import re
from pathlib import Path

RAW = Path("data/raw_world_mountains.csv")
OUT = Path("data/world_mountains.csv")

DATASET_SLUG = "world-mountains"
DATASET_NAME = "世界の山（Wikidata）"
METRIC_KEY = "height_m"
METRIC_NAME = "標高"
UNIT = "m"

qid_re = re.compile(r"(Q\d+)")

def qid_from_url(url: str) -> str:
    m = qid_re.search(url)
    if not m:
        raise ValueError(f"Cannot extract QID from: {url}")
    return m.group(1)

def main():
    if not RAW.exists():
        raise SystemExit(f"Missing {RAW}. Run the curl command first.")

    rows_out = []
    with RAW.open(newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        # 想定列名は item, itemLabel, elev（WDQSの出力に依存）
        for row in r:
            item = row.get("item") or row.get("Item") or ""
            label = row.get("itemLabel") or row.get("ItemLabel") or ""
            elev = row.get("elev") or row.get("elevation") or row.get("ELEV") or ""

            if not item or not label or not elev:
                continue

            # elev が "8848" だったり "8848.0" だったりするので float→丸め
            try:
                value = float(str(elev))
            except ValueError:
                continue

            qid = qid_from_url(item)

            rows_out.append({
                "dataset_slug": DATASET_SLUG,
                "dataset_name": DATASET_NAME,
                "metric_key": METRIC_KEY,
                "metric_name": METRIC_NAME,
                "unit": UNIT,
                "item_key": qid,
                "item_name": label,
                "value": int(round(value)),
            })

    # 念のため value で降順ソート
    rows_out.sort(key=lambda x: x["value"], reverse=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "dataset_slug","dataset_name","metric_key","metric_name","unit",
            "item_key","item_name","value"
        ])
        w.writeheader()
        w.writerows(rows_out)

    print(f"Wrote {OUT} rows={len(rows_out)}")

if __name__ == "__main__":
    main()
