from django.urls import path
from . import views

urlpatterns = [
    # datasets
    path("datasets/", views.list_datasets),
    path("datasets/<slug:dataset_slug>/metrics/", views.list_dataset_metrics),
    path(
        "datasets/<slug:dataset_slug>/metrics/<slug:metric_key>/hensachi/",
        views.metric_hensachi,
    ),

    # user metrics
    path("u/<slug:user_metric_slug>/submit/", views.submit_user_value),
    path("u/<slug:user_metric_slug>/hensachi/<str:x>/", views.user_metric_hensachi),
    path("u/<slug:user_metric_slug>/history/", views.user_metric_history),

    # apex rank (rank-only hensachi)
    path("apex/rank/hensachi/<slug:rank_code>/", views.apex_rank_hensachi),
]

