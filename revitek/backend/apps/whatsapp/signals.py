from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.agenda.models import Reservation
from .services import MetaClient

@receiver(post_save, sender=Reservation)
def send_confirmation_whatsapp(sender, instance, created, **kwargs):
    """
    Disparado cuando se crea una nueva Reserva.
    Envía una plantilla de WhatsApp con botones de Confirmar/Cancelar.
    """
    if created and instance.client and instance.client.phone:
        client = MetaClient()
        
        # Nombre de Plantilla: "reservation_confirmation" (Debe ser creada en Meta Dashboard)
        # Parámetros: {{1}} = Nombre Cliente, {{2}} = Fecha, {{3}} = Hora
        
        if not instance.reservation_slots.exists():
            # Si no hay slots vinculados aún (ej. durante creación), omitir envío de mensaje aquí.
            # El llamador (ej. ChatBot) debería manejar el envío de la confirmación una vez que los slots estén vinculados.
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
