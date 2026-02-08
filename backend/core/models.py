from django.db import models


class Dataset(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Metric(models.Model):
    VALUE_TYPES = [
        ("int", "int"),
        ("float", "float"),
    ]

    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="metrics")
    key = models.SlugField()
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50, blank=True)
    value_type = models.CharField(max_length=10, choices=VALUE_TYPES, default="float")
    higher_is_better = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["dataset", "key"], name="uniq_metric_per_dataset")
        ]

    def __str__(self):
        return f"{self.dataset.slug}:{self.key}"


class Item(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="items")
    key = models.SlugField()
    name = models.CharField(max_length=200)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["dataset", "key"], name="uniq_item_per_dataset")
        ]

    def __str__(self):
        return f"{self.dataset.slug}:{self.name}"


class Value(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="values")
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name="values")
    value = models.DecimalField(max_digits=20, decimal_places=6)
    source = models.CharField(max_length=500, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["item", "metric"], name="uniq_value_item_metric")
        ]

    def __str__(self):
        return f"{self.item.name} {self.metric.key}={self.value}"


class UserMetric(models.Model):
    PRIVACY = [
        ("public", "public"),
        ("private", "private"),
    ]

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    privacy = models.CharField(max_length=10, choices=PRIVACY, default="public")

    def __str__(self):
        return self.slug


class UserValue(models.Model):
    user_metric = models.ForeignKey(
        UserMetric, on_delete=models.CASCADE, related_name="entries"
    )
    user_hash = models.CharField(max_length=64, db_index=True)  # ログインなし想定の匿名ID
    value = models.DecimalField(max_digits=20, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user_metric", "user_hash", "-created_at"], name="idx_userval_hist"),
        ]

    def __str__(self):
        return f"{self.user_metric.slug} {self.user_hash}={self.value}"

