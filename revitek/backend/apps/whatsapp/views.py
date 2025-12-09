from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.conf import settings
import json
import logging

from .services import WebhookHandler

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    Endpoint para Webhooks de Meta Cloud API.
    """
    def get(self, request, *args, **kwargs):
        """
        Solicitud de Verificación de Meta.
        """
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode and token:
            if mode == 'subscribe' and token == settings.WHATSAPP_VERIFY_TOKEN:
                return HttpResponse(challenge, status=200)
            else:
                return HttpResponse('Forbidden', status=403)
        return HttpResponse('Bad Request', status=400)

    def post(self, request, *args, **kwargs):
        """
        Notificación de Evento de Meta.
        """
        try:
            payload = json.loads(request.body)
            handler = WebhookHandler()
            handler.handle_payload(payload)
            return HttpResponse('EVENT_RECEIVED', status=200)
        except json.JSONDecodeError:
            return HttpResponse('Invalid JSON', status=400)
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return HttpResponse('Internal Server Error', status=500)
