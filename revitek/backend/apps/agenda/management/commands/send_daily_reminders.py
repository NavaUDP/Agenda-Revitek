from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.agenda.models import Reservation
from apps.whatsapp.services import MetaClient
from datetime import timedelta

class Command(BaseCommand):
    help = 'Sends WhatsApp confirmation requests for reservations scheduled for tomorrow.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        self.stdout.write(f"Checking reservations for tomorrow: {tomorrow}")

        # Find confirmed reservations for tomorrow
        # We need to filter by the start time of the associated slots
        # Since Reservation <-> Slot is M2M via ReservationSlot, we can query:
        reservations = Reservation.objects.filter(
            status='CONFIRMED',
            reservation_slots__slot__start__date=tomorrow
        ).distinct()

        if not reservations.exists():
            self.stdout.write("No confirmed reservations found for tomorrow.")
            return

        client = MetaClient()
        count = 0

        for reservation in reservations:
            try:
                self.stdout.write(f"Sending reminder to Reservation #{reservation.id} ({reservation.client.first_name})")
                client.send_reservation_confirmation_request(reservation)
                count += 1
            except Exception as e:
                self.stderr.write(f"Error sending reminder to #{reservation.id}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Successfully sent {count} reminders."))
