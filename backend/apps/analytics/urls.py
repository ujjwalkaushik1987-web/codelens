from django.urls import path
from .views import SystemAnalyticsView, ProjectAnalyticsView

urlpatterns = [
    path('system/', SystemAnalyticsView.as_view(), name='analytics-system'),
    path('projects/<uuid:project_id>/', ProjectAnalyticsView.as_view(), name='analytics-project'),
]
