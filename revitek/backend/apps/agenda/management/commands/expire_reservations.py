from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.agenda.models import Reservation, StatusHistory

class Command(BaseCommand):
    help = 'Expires reservations that have been waiting for client confirmation for too long.'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Find reservations in WAITING_CLIENT status where token_expires_at < now
        expired_reservations = Reservation.objects.filter(
            status='WAITING_CLIENT',
            token_expires_at__lt=now
        )
        
        count = expired_reservations.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No expired reservations found.'))
            return

        self.stdout.write(f"Found {count} expired reservations. Cancelling...")
        
        for res in expired_reservations:
            old_status = res.status
            res.status = 'CANCELLED'
            # We mark it as cancelled by admin/system
            res.cancelled_by = 'admin' 
            res.note = (res.note or "") + f"\n[System] Cancelled due to expiration (token expired at {res.token_expires_at})."
            res.save(update_fields=['status', 'cancelled_by', 'note'])
            
            StatusHistory.objects.create(
                reservation=res,
                status='CANCELLED',
                note=f"Automatically cancelled by system (expired waiting for client). Previous: {old_status}"
            )
            
            self.stdout.write(f"Cancelled Reservation #{res.id}")

        self.stdout.write(self.style.SUCCESS(f'Successfully cancelled {count} reservations.'))
