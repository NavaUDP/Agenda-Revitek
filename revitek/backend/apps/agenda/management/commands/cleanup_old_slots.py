from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.agenda.models import Slot

class Command(BaseCommand):
    help = 'Cleans up old slots from the database (older than 90 days)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to keep slots (default: 90)'
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff_date = timezone.now().date() - timedelta(days=days)
        
        self.stdout.write(f"Cleaning up slots older than {cutoff_date}...")
        
        # Delete old slots
        # We filter by date < cutoff_date
        count, _ = Slot.objects.filter(date__lt=cutoff_date).delete()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully deleted {count} old slots."))
