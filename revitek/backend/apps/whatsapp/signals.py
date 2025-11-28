from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.agenda.models import Reservation
from .services import MetaClient

@receiver(post_save, sender=Reservation)
def send_confirmation_whatsapp(sender, instance, created, **kwargs):
    """
    Triggered when a new Reservation is created.
    Sends a WhatsApp template with Confirm/Cancel buttons.
    """
    if created and instance.client and instance.client.phone:
        client = MetaClient()
        
        # Template Name: "reservation_confirmation" (Must be created in Meta Dashboard)
        # Parameters: {{1}} = Client Name, {{2}} = Date, {{3}} = Time
        
        if not instance.reservation_slots.exists():
            # If no slots are linked yet (e.g. during creation), skip sending message here.
            # The caller (e.g. ChatBot) should handle sending the confirmation once slots are linked.
            return

        date_str = instance.reservation_slots.first().slot.start.strftime("%d/%m/%Y")
        time_str = instance.reservation_slots.first().slot.start.strftime("%H:%M")
        
        components = [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": instance.client.first_name},
                    {"type": "text", "text": date_str},
                    {"type": "text", "text": time_str},
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "0",
                "parameters": [
                    {"type": "payload", "payload": f"CONFIRM_RESERVATION_{instance.id}"}
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "1",
                "parameters": [
                    {"type": "payload", "payload": f"CANCEL_RESERVATION_{instance.id}"}
                ]
            }
        ]
        
        client.send_template(
            to_phone=instance.client.phone,
            template_name="reservation_confirmation",
            language_code="es",
            components=components,
            reservation=instance
        )
