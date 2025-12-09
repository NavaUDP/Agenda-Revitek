from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Reservation
from apps.whatsapp.services import MetaClient
import threading

@receiver(pre_save, sender=Reservation)
def track_status_change(sender, instance, **kwargs):
    """
    Rastrear si el estado cambia a CONFIRMED.
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
def trigger_whatsapp_notifications(sender, instance, created, **kwargs):
    """
    Disparar notificaciones de WhatsApp basadas en cambios de estado.
    """
    import uuid
    from datetime import timedelta
    from django.utils import timezone
    
    old_status = getattr(instance, '_old_status', None)
    
    print(f"🔔 Signal triggered - Old: {old_status}, New: {instance.status}, ID: {instance.id}")
    
    # Omitir si esta confirmación vino del enlace (para prevenir bucle)
    if getattr(instance, '_confirmed_via_link', False):
        print(f"⏭️  Confirmación vía link - no se envía mensaje duplicado")
        return
    
    # Admin aprueba: Generar token y enviar enlace manteniendo estado PENDING
    # El token se genera solo una vez (cuando previamente no había token)
    if instance.status == 'PENDING' and not instance.confirmation_token and old_status == 'PENDING':
        # Esto significa que el admin acaba de aprobar (primera vez viendo PENDING después de actualización)
        # Detectamos esto verificando si la reserva fue actualizada por el admin
        # Por simplicidad, enviaremos enlace cuando updated_at cambie significativamente
        pass  # Omitir por ahora - necesitamos un enfoque diferente
    
    # Mejor enfoque: Enviar enlace cuando se solicite explícitamente vía campo personalizado o acción
    # Por ahora, disparemos en cambio de estado a CONFIRMED
    if old_status == 'PENDING' and instance.status == 'CONFIRMED':
        print(f"✅ Admin aprobó - generando token y esperando confirmación del cliente...")
        
        # Cambiar estado a WAITING_CLIENT
        instance.status = 'WAITING_CLIENT'
        
        def send_confirmation_link():
            try:
                # Generar token único
                token = uuid.uuid4()
                expiration = timezone.now() + timedelta(hours=2)
                
                print(f"🔑 Token generado: {token}")
                
                # Guardar token en reserva y actualizar estado
                instance.confirmation_token = token
                instance.token_expires_at = expiration
                instance.save(update_fields=['confirmation_token', 'token_expires_at', 'status'])
                
                print(f"💾 Token guardado - estado: {instance.status}")
                
                # Enviar WhatsApp con enlace
                client = MetaClient()
                result = client.send_confirmation_link(instance, token)
                print(f"📱 WhatsApp enviado: {result}")
            except Exception as e:
                print(f"❌ Error sending WhatsApp confirmation link: {e}")
                import traceback
                traceback.print_exc()
        
        threading.Thread(target=send_confirmation_link).start()
    else:
        print(f"⏭️  No se envía link (condición no cumplida)")


