from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageCreateView

router = DefaultRouter()
router.register(r'', ConversationViewSet, basename='conversations')

urlpatterns = [
    path('<uuid:conversation_id>/messages/', MessageCreateView.as_view(), name='conversation-messages'),
    path('', include(router.urls)),
]
