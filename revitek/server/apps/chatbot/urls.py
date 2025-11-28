# apps/chatbot/urls.py

from django.urls import path
from .views import whatsapp_webhook

urlpatterns = [
    # Webhook público para Meta (GET para verificación, POST para mensajes)
    path('webhook/', whatsapp_webhook, name='whatsapp_webhook'),
]
