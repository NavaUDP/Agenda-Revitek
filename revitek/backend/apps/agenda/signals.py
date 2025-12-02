from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Reservation
from apps.whatsapp.services import MetaClient
import threading

@receiver(pre_save, sender=Reservation)
def track_status_change(sender, instance, **kwargs):
    """
    Track if status is changing to CONFIRMED.
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
    Trigger WhatsApp notifications based on status changes.
    """
    import uuid
    from datetime import timedelta
    from django.utils import timezone
    
    old_status = getattr(instance, '_old_status', None)
    
    print(f"🔔 Signal triggered - Old: {old_status}, New: {instance.status}, ID: {instance.id}")
    
    # Skip if this confirmation came from the link (to prevent loop)
    if getattr(instance, '_confirmed_via_link', False):
        print(f"⏭️  Confirmación vía link - no se envía mensaje duplicado")
        return
    
    # Admin approves: Generate token and send link while keeping status PENDING
    # Token is only generated once (when previously there was no token)
    if instance.status == 'PENDING' and not instance.confirmation_token and old_status == 'PENDING':
        # This means admin just approved (first time seeing PENDING after update)
        # We detect this by checking if the reservation was just updated by admin
        # For simplicity, we'll send link when updated_at changes significantly
        pass  # Skip for now - we need different approach
    
    # Better approach: Send link when explicitly requested via a custom field or action
    # For now, let's trigger on CONFIRMED status change
    if old_status == 'PENDING' and instance.status == 'CONFIRMED':
        print(f"✅ Admin aprobó - generando token y esperando confirmación del cliente...")
        
        # Change status to WAITING_CLIENT
        instance.status = 'WAITING_CLIENT'
        
        def send_confirmation_link():
            try:
                # Generate unique token
                token = uuid.uuid4()
                expiration = timezone.now() + timedelta(hours=2)
                
                print(f"🔑 Token generado: {token}")
                
                # Save token to reservation and update status
                instance.confirmation_token = token
                instance.token_expires_at = expiration
                instance.save(update_fields=['confirmation_token', 'token_expires_at', 'status'])
                
                print(f"💾 Token guardado - estado: {instance.status}")
                
                # Send WhatsApp with link
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


