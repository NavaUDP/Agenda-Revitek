from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Reservation
import threading
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Reservation)
def track_status_change(sender, instance, **kwargs):
    """
    Rastrear el estado anterior de la reserva antes de guardar.
    """
    if instance.pk:
        try:
            old_instance = Reservation.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Reservation.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Reservation)
def trigger_email_notifications(sender, instance, created, **kwargs):
    """
    Disparar notificaciones por email basadas en el estado de la reserva:
    
    1. NUEVA RESERVA (created=True): 
       - Enviar email al cliente con link de confirmación
       
    2. CLIENTE CONFIRMA (WAITING_CLIENT -> CONFIRMED):
       - Enviar email al profesional notificando la reserva confirmada
    """
    import uuid
    from datetime import timedelta
    from django.utils import timezone
    
    old_status = getattr(instance, '_old_status', None)
    
    print(f"\n{'='*60}")
    print(f"🔔 SIGNAL TRIGGERED - Reservation #{instance.id}")
    print(f"   Created: {created} | Old Status: {old_status} | New Status: {instance.status}")
    print(f"{'='*60}\n")
    
    logger.info(f"🔔 Signal triggered - Created: {created}, Old: {old_status}, New: {instance.status}, ID: {instance.id}")
    
    # Flag especial para confirmación vía link
    confirmed_via_link = getattr(instance, '_confirmed_via_link', False)
    
    # CASO 1: Nueva reserva - Enviar email al cliente SOLAMENTE
    if created and instance.status == 'PENDING' and not confirmed_via_link:
        print("📧 ✅ CONDICIÓN CUMPLIDA: Nueva reserva creada - enviando email al cliente...")
        logger.info(f"📧 Nueva reserva creada - enviando email de confirmación al cliente...")
        
        def send_client_email():
            try:
                from apps.email_service.services import send_confirmacion_cliente
                
                # 1. Generar token único
                token = uuid.uuid4()
                expiration = timezone.now() + timedelta(hours=48)  # 48 horas para confirmar
                
                logger.info(f"🔑 Token generado: {token}")
                
                # 2. Guardar token en reserva y cambiar estado a WAITING_CLIENT
                instance.confirmation_token = token
                instance.token_expires_at = expiration
                instance.status = 'WAITING_CLIENT'
                instance.save(update_fields=['confirmation_token', 'token_expires_at', 'status'])
                
                logger.info(f"💾 Token guardado - estado: {instance.status}")
                
                # 3. Enviar email al cliente con link de confirmación
                result_cliente = send_confirmacion_cliente(instance, token)
                logger.info(f"📧 Email al cliente enviado: {result_cliente}")
                
            except Exception as e:
                logger.error(f"❌ Error sending client email: {e}")
                import traceback
                traceback.print_exc()
        
        # Ejecutar en thread separado para no bloquear la respuesta HTTP
        threading.Thread(target=send_client_email).start()
    
    # CASO 2: Cliente confirmó - Enviar email al profesional
    # Esto incluye confirmaciones vía link (confirmed_via_link=True)
    elif old_status == 'WAITING_CLIENT' and instance.status == 'CONFIRMED':
        print("✅ ✅ CONDICIÓN CUMPLIDA: Cliente confirmó - enviando email al profesional...")
        logger.info(f"✅ Cliente confirmó reserva - enviando email al profesional...")
        
        if confirmed_via_link:
            print("   (Confirmación realizada vía link de email)")
            logger.info("   Confirmación vía link - enviando notificación al profesional")
        
        def send_professional_email():
            try:
                from apps.email_service.services import send_notificacion_profesional
                
                # Enviar email al profesional asignado
                result_profesional = send_notificacion_profesional(instance)
                logger.info(f"📧 Email al profesional enviado: {result_profesional}")
                
            except Exception as e:
                logger.error(f"❌ Error sending professional email: {e}")
                import traceback
                traceback.print_exc()
        
        # Ejecutar en thread separado
        threading.Thread(target=send_professional_email).start()
    else:
        print(f"⏭️  ❌ NO SE ENVÍAN EMAILS - Condición no cumplida")
        print(f"   Created: {created}, Old: {old_status}, New: {instance.status}")
        logger.info(f"⏭️  No se envían emails (condición no cumplida - Created: {created}, Old: {old_status}, New: {instance.status})")


