from __future__ import annotations

from decimal import Decimal, InvalidOperation
from math import log, sqrt
from typing import Dict, Tuple

from django.db.models import Avg, StdDev
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Dataset, Metric, Item, Value, UserMetric, UserValue
from .serializers import DatasetSerializer


# ----------------------------
# Common stats
# ----------------------------

def hensachi(x: Decimal, mean: Decimal, std: Decimal) -> Decimal:
    if std == 0:
        return Decimal("50")
    return Decimal("50") + Decimal("10") * (x - mean) / std


# ----------------------------
# Apex rank -> hensachi (rank-only)
# Source: EsportsTales "Top percentage of players" table (Dec 2025 Season 27),
# based on Apex Legends Status data.
# https://www.esportstales.com/apex-legends/rank-distribution-and-percentage-of-players-by-tier
# ----------------------------

# rank_code format we accept:
#   rookie-4 ... rookie-1
#   bronze-4 ... bronze-1
#   silver-4 ... silver-1
#   gold-4   ... gold-1
#   platinum-4 ... platinum-1
#   diamond-4 ... diamond-1
#   master
#   predator
#
# Value is "Top %": e.g. Bronze IV => 98.55 means "top 98.55% (i.e. only bottom 1.45% below you)"
APEX_RANK_TOP_PERCENT: Dict[str, Decimal] = {
    "rookie-4": Decimal("99.98"),
    "rookie-3": Decimal("99.67"),
    "rookie-2": Decimal("99.66"),
    "rookie-1": Decimal("99.65"),

    "bronze-4": Decimal("98.55"),
    "bronze-3": Decimal("94.92"),
    "bronze-2": Decimal("93.57"),
    "bronze-1": Decimal("91.96"),

    "silver-4": Decimal("90.53"),
    "silver-3": Decimal("83.55"),
    "silver-2": Decimal("79.75"),
    "silver-1": Decimal("77.18"),

    "gold-4": Decimal("74.78"),
    "gold-3": Decimal("63.76"),
    "gold-2": Decimal("57.55"),
    "gold-1": Decimal("53.65"),

    "platinum-4": Decimal("50.66"),
    "platinum-3": Decimal("38.47"),
    "platinum-2": Decimal("23.48"),
    "platinum-1": Decimal("15.57"),

    "diamond-4": Decimal("10.37"),
    "diamond-3": Decimal("5.68"),
    "diamond-2": Decimal("1.89"),
    "diamond-1": Decimal("0.73"),

    "master": Decimal("0.25"),
    "predator": Decimal("0.24"),
}

APEX_RANK_META = {
    "season": "27",
    "asof": "Dec 2025",
    "source_name": "EsportsTales (compiled from Apex Legends Status)",
}


def _inv_norm_cdf(p: float) -> float:
    """
    Inverse CDF for standard normal distribution.
    Peter J. Acklam's approximation (commonly used, good accuracy for UI/stats).
    p must be in (0,1).
    """
    # Coefficients in rational approximations.
    a = [-3.969683028665376e+01,
         2.209460984245205e+02,
         -2.759285104469687e+02,
         1.383577518672690e+02,
         -3.066479806614716e+01,
         2.506628277459239e+00]

    b = [-5.447609879822406e+01,
         1.615858368580409e+02,
         -1.556989798598866e+02,
         6.680131188771972e+01,
         -1.328068155288572e+01]

    c = [-7.784894002430293e-03,
         -3.223964580411365e-01,
         -2.400758277161838e+00,
         -2.549732539343734e+00,
         4.374664141464968e+00,
         2.938163982698783e+00]

    d = [7.784695709041462e-03,
         3.224671290700398e-01,
         2.445134137142996e+00,
         3.754408661907416e+00]

    # Define break-points.
    plow = 0.02425
    phigh = 1 - plow

    if p <= 0.0 or p >= 1.0:
        raise ValueError("p must be in (0,1)")

    if p < plow:
        q = sqrt(-2 * log(p))
        return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) / \
               ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1)
    if p > phigh:
        q = sqrt(-2 * log(1 - p))
        return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) / \
                ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1)

    q = p - 0.5
    r = q*q
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) * q / \
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1)


def _hensachi_from_top_percent(top_percent: Decimal) -> Tuple[Decimal, Decimal]:
    """
    top_percent: e.g. 23.48 means top 23.48%
    returns (hensachi, cdf_percent)
    """
    # cdf = bottom% = 100 - top%
    cdf_percent = Decimal("100") - top_percent

    # clamp to avoid p=0 or p=1
    p = float(cdf_percent / Decimal("100"))
    eps = 1e-9
    if p <= 0:
        p = eps
    if p >= 1:
        p = 1 - eps

    z = _inv_norm_cdf(p)
    h = Decimal("50") + Decimal("10") * Decimal(str(z))
    return h, cdf_percent


@api_view(["GET"])
def apex_rank_hensachi(request, rank_code: str):
    rank_code = (rank_code or "").strip().lower()
    top = APEX_RANK_TOP_PERCENT.get(rank_code)
    if top is None:
        return Response(
            {
                "detail": "unknown rank_code",
                "hint": "examples: gold-2, platinum-4, diamond-1, master, predator",
                "rank_code": rank_code,
                "allowed": sorted(APEX_RANK_TOP_PERCENT.keys()),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    h, cdf_percent = _hensachi_from_top_percent(top)

    return Response(
        {
            "game": "apex-legends",
            "metric": "rank",
            "rank_code": rank_code,
            "top_percent": str(top),         # e.g. "23.48"
            "bottom_percent": str(cdf_percent),  # e.g. "76.52"
            "hensachi": str(h),
            "meta": APEX_RANK_META,
        }
    )


# ----------------------------
# Existing APIs
# ----------------------------

@api_view(["GET"])
def list_datasets(request):
    qs = Dataset.objects.all().order_by("id")
    return Response(DatasetSerializer(qs, many=True).data)


@api_view(["GET"])
def list_dataset_metrics(request, dataset_slug: str):
    ds = get_object_or_404(Dataset, slug=dataset_slug)
    qs = Metric.objects.filter(dataset=ds).order_by("key").values("key", "name", "unit")
    return Response(list(qs))


@api_view(["GET"])
def metric_hensachi(request, dataset_slug: str, metric_key: str):
    try:
        ds = Dataset.objects.get(slug=dataset_slug)
        metric = Metric.objects.get(dataset=ds, key=metric_key)
    except (Dataset.DoesNotExist, Metric.DoesNotExist):
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    vals = Value.objects.filter(metric=metric).select_related("item")
    agg = vals.aggregate(mean=Avg("value"), std=StdDev("value"))
    mean = agg["mean"]
    std = agg["std"]

    if mean is None or std is None:
        return Response({"detail": "no data"}, status=status.HTTP_400_BAD_REQUEST)

    out = []
    for v in vals:
        out.append(
            {
                "item": {"key": v.item.key, "name": v.item.name, "meta": v.item.meta},
                "value": str(v.value),
                "hensachi": str(hensachi(v.value, mean, std)),
            }
        )

    out.sort(key=lambda d: Decimal(d["hensachi"]), reverse=True)
    return Response(
        {
            "dataset": ds.slug,
            "metric": metric.key,
            "unit": metric.unit,
            "count": len(out),
            "mean": str(mean),
            "std": str(std),
            "results": out,
        }
    )


@api_view(["POST"])
def submit_user_value(request, user_metric_slug: str):
    try:
        um = UserMetric.objects.get(slug=user_metric_slug)
    except UserMetric.DoesNotExist:
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    user_hash = request.data.get("user_hash")
    value = request.data.get("value")
    if not user_hash or value is None:
        return Response({"detail": "user_hash and value required"}, status=status.HTTP_400_BAD_REQUEST)

    UserValue.objects.create(user_metric=um, user_hash=user_hash, value=value)
    return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def user_metric_hensachi(request, user_metric_slug: str, x: str):
    try:
        um = UserMetric.objects.get(slug=user_metric_slug)
    except UserMetric.DoesNotExist:
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    qs = UserValue.objects.filter(user_metric=um)
    agg = qs.aggregate(mean=Avg("value"), std=StdDev("value"))
    mean = agg["mean"]
    std = agg["std"]
    if mean is None or std is None:
        return Response({"detail": "no data yet"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dx = Decimal(x)
    except InvalidOperation:
        return Response({"detail": "x must be number"}, status=status.HTTP_400_BAD_REQUEST)

    hx = hensachi(dx, mean, std)
    return Response(
        {
            "user_metric": um.slug,
            "x": str(dx),
            "hensachi": str(hx),
            "mean": str(mean),
            "std": str(std),
            "count": qs.count(),
            "unit": um.unit,
        }
    )


@api_view(["GET"])
def user_metric_history(request, user_metric_slug: str):
    """
    GET /api/u/<slug>/history/?user_hash=...&limit=10
    """
    try:
        um = UserMetric.objects.get(slug=user_metric_slug)
    except UserMetric.DoesNotExist:
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    user_hash = request.query_params.get("user_hash")
    if not user_hash:
        return Response({"detail": "user_hash required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        limit = int(request.query_params.get("limit") or "10")
    except ValueError:
        limit = 10
    limit = max(1, min(limit, 100))

    qs = (
        UserValue.objects.filter(user_metric=um, user_hash=user_hash)
        .order_by("-created_at")
        .values("id", "value", "created_at")
    )[:limit]

    items = []
    for row in qs:
        items.append(
            {
                "id": row["id"],
                "value": str(row["value"]),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
        )

    return Response({"user_metric": um.slug, "user_hash": user_hash, "limit": limit, "items": items})

