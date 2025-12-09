from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.agenda.models import Reservation
from django.contrib.auth import get_user_model
from .models import EmailLog
from .services import send_email, send_reserva_confirmada, send_marketing_email
from .serializers import EmailLogSerializer # We'll need to create this

User = get_user_model()

class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint para ver el historial de correos enviados.
    """
    queryset = EmailLog.objects.all()
    serializer_class = EmailLogSerializer
    permission_classes = [IsAdminUser]

class TestEmailView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        recipient = request.data.get('email')
        if not recipient:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        success = send_email(
            subject="Test de Configuración SMTP - Revitek",
            template_name="email_service/base_email.html", # Use base as test
            context={"content": "Si ves esto, el sistema de correos está funcionando correctamente."},
            recipient_list=[recipient],
            email_type="test"
        )

        if success:
            return Response({"detail": "Correo de prueba enviado correctamente."})
        else:
            return Response({"detail": "Fallo al enviar el correo. Revisa los logs."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResendConfirmationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        reserva = get_object_or_404(Reservation, pk=pk)
        
        if not reserva.client or not reserva.client.email:
            return Response({"detail": "La reserva no tiene un cliente con email válido."}, status=status.HTTP_400_BAD_REQUEST)

        success = send_reserva_confirmada(reserva)
        
        if success:
            return Response({"detail": "Confirmación reenviada correctamente."})
        else:
            return Response({"detail": "Fallo al enviar el correo."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmailCampaignView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        """
        Envía una campaña de marketing a una lista de usuarios.
        Body:
        {
            "subject": "Asunto",
            "template": "marketing.html", # nombre del template en templates/email_service/
            "user_ids": [1, 2, 3], # Opcional: si no se envía, se puede implementar lógica para 'todos'
            "variables": { "titulo": "...", "mensaje": "..." }
        }
        """
        subject = request.data.get('subject')
        template_name = request.data.get('template', 'email_service/marketing.html')
        user_ids = request.data.get('user_ids', [])
        variables = request.data.get('variables', {})

        if not subject:
            return Response({"detail": "Subject is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validar template path para seguridad básica (evitar path traversal)
        if '..' in template_name or not template_name.startswith('email_service/'):
             # Force prefix if missing or just use default if suspicious
             if not template_name.startswith('email_service/'):
                 template_name = f"email_service/{template_name}"
        
        # Obtener destinatarios
        if user_ids:
            users = User.objects.filter(id__in=user_ids)
            emails = [u.email for u in users if u.email]
        else:
            # Si no hay IDs, por seguridad no enviamos a todos a menos que se especifique explícitamente
            # Aquí podríamos implementar lógica de "todos los clientes"
            return Response({"detail": "Debe especificar user_ids"}, status=status.HTTP_400_BAD_REQUEST)

        if not emails:
            return Response({"detail": "No valid recipients found"}, status=status.HTTP_400_BAD_REQUEST)

        # Enviar (podría ser asíncrono con Celery en el futuro)
        count = 0
        for email in emails:
            # Personalizar contexto por usuario si fuera necesario
            context = variables.copy()
            # context['user'] = ... 
            
            if send_marketing_email(subject, template_name, context, [email]):
                count += 1

        return Response({
            "detail": f"Campaña procesada. Enviados: {count}/{len(emails)}",
            "sent_count": count
        })
