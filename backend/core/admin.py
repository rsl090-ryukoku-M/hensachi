from django.contrib import admin
from .models import Dataset, Metric, Item, Value, UserMetric, UserValue

admin.site.register(Dataset)
admin.site.register(Metric)
admin.site.register(Item)
admin.site.register(Value)
admin.site.register(UserMetric)
admin.site.register(UserValue)
