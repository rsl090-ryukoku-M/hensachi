import csv
from pathlib import Path
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Dataset, Metric, Item, Value


class Command(BaseCommand):
    help = "Import japan mountains CSV into Dataset/Metric/Item/Value"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            type=str,
            default=str(Path.cwd().parent.parent / "data" / "japan_mountains.csv"),
            help="Path to japan_mountains.csv",
        )
        parser.add_argument(
            "--dataset-slug",
            type=str,
            default="japan-mountains",
        )
        parser.add_argument(
            "--dataset-name",
            type=str,
            default="日本の山",
        )
        parser.add_argument(
            "--metric-key",
            type=str,
            default="height_m",
        )
        parser.add_argument(
            "--metric-name",
            type=str,
            default="標高",
        )
        parser.add_argument(
            "--unit",
            type=str,
            default="m",
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        csv_path = Path(opts["csv"]).expanduser().resolve()
        if not csv_path.exists():
            raise CommandError(f"CSV not found: {csv_path}")

        ds, _ = Dataset.objects.get_or_create(
            slug=opts["dataset_slug"],
            defaults={"name": opts["dataset_name"], "description": "出典: CSV投入"},
        )

        metric, _ = Metric.objects.get_or_create(
            dataset=ds,
            key=opts["metric_key"],
            defaults={
                "name": opts["metric_name"],
                "unit": opts["unit"],
                "value_type": "float",
                "higher_is_better": True,
            },
        )

        created_items = 0
        upsert_values = 0

        with csv_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            required = {"key", "name", "height_m"}
            if not required.issubset(set(reader.fieldnames or [])):
                raise CommandError(f"CSV must contain columns: {sorted(required)}")

            for row in reader:
                key = row["key"].strip()
                name = row["name"].strip()
                height_m = row["height_m"].strip()
                pref = (row.get("pref") or "").strip()

                item, created = Item.objects.get_or_create(
                    dataset=ds,
                    key=key,
                    defaults={"name": name, "meta": {"pref": pref} if pref else {}},
                )
                if not created:
                    # 名前/メタ更新（CSV側が最新とみなす）
                    item.name = name
                    if pref:
                        meta = item.meta or {}
                        meta["pref"] = pref
                        item.meta = meta
                    item.save(update_fields=["name", "meta"])
                else:
                    created_items += 1

                v, created_v = Value.objects.update_or_create(
                    item=item,
                    metric=metric,
                    defaults={"value": Decimal(height_m), "source": "japan_mountains.csv"},
                )
                upsert_values += 1

        self.stdout.write(self.style.SUCCESS(
            f"OK: dataset={ds.slug}, metric={metric.key}, items_created={created_items}, values_upserted={upsert_values}, csv={csv_path}"
        ))
