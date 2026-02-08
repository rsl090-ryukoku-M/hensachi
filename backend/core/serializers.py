from rest_framework import serializers
from .models import Dataset, Metric, Item, Value, UserMetric, UserValue


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ["id", "slug", "name", "description"]


class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = ["id", "dataset", "key", "name", "unit", "value_type", "higher_is_better"]


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "dataset", "key", "name", "meta"]


class UserValueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserValue
        fields = ["user_metric", "user_hash", "value"]
