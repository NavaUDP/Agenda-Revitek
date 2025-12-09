import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from .models import EmailLog

logger = logging.getLogger(__name__)

def send_email(subject, template_name, context, recipient_list, email_type="generic"):
    """
    Envía un correo electrónico utilizando una plantilla HTML.
    Registra el resultado en EmailLog.
    """
    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    # Renderizar contenido
    try:
        html_content = render_to_string(template_name, context)
        text_content = f"Hola,\n\nEste es un mensaje automático de Revitek.\n\n{subject}" # Fallback simple
    except Exception as e:
        logger.error(f"Error rendering template {template_name}: {e}")
        # Log error for the first recipient just to record the failure
        if recipient_list:
            EmailLog.objects.create(
                type=email_type,
                recipient=recipient_list[0],
                subject=subject,
                status='ERROR',
                error_details=f"Template render error: {str(e)}"
            )
        return False

    # Enviar correo
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        # Log success
        for recipient in recipient_list:
            EmailLog.objects.create(
                type=email_type,
                recipient=recipient,
                subject=subject,
                status='SUCCESS'
            )
        return True

    except Exception as e:
        logger.error(f"Error sending email to {recipient_list}: {e}")
        # Log error
        for recipient in recipient_list:
            EmailLog.objects.create(
                type=email_type,
                recipient=recipient,
                subject=subject,
                status='ERROR',
                error_details=str(e)
            )
        return False

# --- Funciones Específicas ---

def send_reserva_confirmada(reserva):
    subject = f"Confirmación de Reserva #{reserva.id} - Revitek"
    context = {
        'reserva': reserva,
        'cliente': reserva.client,
        'servicios': reserva.services.all(),
        'fecha': reserva.reservation_slots.first().slot.start if reserva.reservation_slots.exists() else None,
    }
    return send_email(
        subject=subject,
        template_name='email_service/confirmacion_reserva.html',
        context=context,
        recipient_list=[reserva.client.email],
        email_type='confirmacion_reserva'
    )

def send_reserva_cancelada(reserva):
    subject = f"Cancelación de Reserva #{reserva.id} - Revitek"
    context = {
        'reserva': reserva,
        'cliente': reserva.client,
    }
    return send_email(
        subject=subject,
        template_name='email_service/cancelacion.html',
        context=context,
        recipient_list=[reserva.client.email],
        email_type='cancelacion_reserva'
    )

def send_marketing_email(subject, template_name, context, recipient_list):
    return send_email(
        subject=subject,
        template_name=template_name,
        context=context,
        recipient_list=recipient_list,
        email_type='marketing'
    )
