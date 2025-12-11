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

def send_confirmacion_cliente(reserva, confirmation_token):
    """
    Envía email al cliente con el link de confirmación de reserva.
    """
    from django.conf import settings
    
    # Obtener el primer slot para la fecha/hora
    first_slot = reserva.reservation_slots.select_related('slot', 'professional').order_by('slot__start').first()
    
    if not first_slot:
        logger.error(f"Reservation {reserva.id} has no slots")
        return False
    
    # Formatear fecha y hora
    fecha = first_slot.slot.start.strftime('%d de %B de %Y')
    hora = first_slot.slot.start.strftime('%H:%M')
    
    # Construir link de confirmación
    frontend_url = settings.FRONTEND_URL
    confirmation_link = f"{frontend_url}/confirmar/{confirmation_token}"
    
    # Obtener información del vehículo
    vehiculo_info = "No especificado"
    if reserva.vehicle:
        vehiculo_info = f"{reserva.vehicle.brand} {reserva.vehicle.model} ({reserva.vehicle.year}) - Patente: {reserva.vehicle.license_plate}"
    
    # Calcular duración total
    duracion_total = sum(s.service.duration_min for s in reserva.services.all() if s.service.duration_min)
    
    context = {
        'cliente_nombre': reserva.client.first_name,
        'cliente_telefono': reserva.client.phone or 'No especificado',
        'fecha': fecha,
        'hora': hora,
        'profesional_nombre': f"{first_slot.professional.first_name} {first_slot.professional.last_name}".strip() if first_slot.professional else 'Por asignar',
        'vehiculo': vehiculo_info,
        'servicios': reserva.services.all(),
        'confirmation_link': confirmation_link,
        'frontend_url': frontend_url,
        'telefono_taller': '+56 9 XXXX XXXX',  # TODO: Configurar en settings
        'direccion_taller': 'Dirección del Taller',  # TODO: Configurar en settings
    }
    
    subject = f"✅ Confirma tu Reserva #{reserva.id} - Revitek"
    
    return send_email(
        subject=subject,
        template_name='email_service/confirmacion_cliente.html',
        context=context,
        recipient_list=[reserva.client.email],
        email_type='confirmacion_cliente'
    )


def send_notificacion_profesional(reserva):
    """
    Envía email al profesional asignado informando de la nueva reserva.
    """
    from django.conf import settings
    
    # Cargar relaciones necesarias
    if reserva.address:
        reserva.address = type(reserva.address).objects.select_related('commune__region').get(pk=reserva.address.pk)
    
    # Obtener el primer slot y profesional
    first_slot = reserva.reservation_slots.select_related('slot', 'professional').order_by('slot__start').first()
    
    if not first_slot or not first_slot.professional:
        logger.error(f"Reservation {reserva.id} has no professional assigned")
        return False
    
    profesional = first_slot.professional
    
    # Verificar que el profesional tenga email
    if not profesional.email:
        logger.warning(f"Professional {profesional.id} has no email address")
        return False
    
    # Formatear fecha y hora
    fecha = first_slot.slot.start.strftime('%d de %B de %Y')
    hora = first_slot.slot.start.strftime('%H:%M')
    
    # Obtener información del vehículo
    vehiculo_info = "No especificado"
    if reserva.vehicle:
        vehiculo_info = f"{reserva.vehicle.brand} {reserva.vehicle.model} ({reserva.vehicle.year}) - Patente: {reserva.vehicle.license_plate}"
    
    # Obtener dirección completa del cliente
    direccion_cliente = "No especificada"
    if reserva.address:
        direccion_cliente = f"{reserva.address.street} {reserva.address.number}, {reserva.address.commune.name}, {reserva.address.commune.region.name}"
    
    # Calcular duración total
    duracion_total = sum(s.service.duration_min for s in reserva.services.all() if s.service.duration_min)
    
    # URL del dashboard
    frontend_url = settings.FRONTEND_URL
    dashboard_url = f"{frontend_url}/profesional"
    
    context = {
        'profesional_nombre': f"{profesional.first_name} {profesional.last_name}".strip(),
        'cliente_nombre': f"{reserva.client.first_name} {reserva.client.last_name}".strip(),
        'cliente_email': reserva.client.email,
        'cliente_telefono': reserva.client.phone or 'No especificado',
        'vehiculo': vehiculo_info,
        'direccion_cliente': direccion_cliente,
        'fecha': fecha,
        'hora': hora,
        'duracion_total': duracion_total,
        'reserva_id': reserva.id,
        'servicios': reserva.services.all(),
        'notas': reserva.note or '',
        'dashboard_url': dashboard_url,
    }
    
    subject = f"📅 Nueva Reserva Asignada #{reserva.id} - Revitek"
    
    return send_email(
        subject=subject,
        template_name='email_service/notificacion_profesional.html',
        context=context,
        recipient_list=[profesional.email],
        email_type='notificacion_profesional'
    )


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
