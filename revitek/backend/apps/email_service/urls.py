from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailLogViewSet, TestEmailView, ResendConfirmationView, EmailCampaignView

router = DefaultRouter()
router.register(r'logs', EmailLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('test/', TestEmailView.as_view(), name='email-test'),
    path('reserva/<int:pk>/reenviar/', ResendConfirmationView.as_view(), name='email-resend-confirmation'),
    path('campania/', EmailCampaignView.as_view(), name='email-campaign'),
]
