from django.core.management.base import BaseCommand
from datetime import date, timedelta
from apps.agenda.models import Professional
from apps.agenda.services import generate_slots_range


class Command(BaseCommand):
    help = 'Genera slots para profesionales activos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Número de días a futuro (default: 30)'
        )
        parser.add_argument(
            '--professional',
            type=int,
            help='ID de profesional específico (opcional)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Generar para todos los profesionales activos'
        )

    def handle(self, *args, **options):
        days = options['days']
        professional_id = options.get('professional')
        generate_all = options.get('all')

        today = date.today()

        # Determinar profesionales
        if professional_id:
            try:
                prof = Professional.objects.get(id=professional_id, active=True)
                professionals = [prof]
                self.stdout.write(f'Generando slots para {prof}...\n')
            except Professional.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'❌ Profesional {professional_id} no encontrado o inactivo')
                )
                return
        elif generate_all:
            professionals = Professional.objects.filter(active=True, accepts_reservations=True)
            if not professionals:
                self.stdout.write(self.style.WARNING('⚠️  No hay profesionales activos'))
                return
            self.stdout.write(f'Generando slots para {professionals.count()} profesionales...\n')
        else:
            self.stdout.write(
                self.style.ERROR('❌ Debes especificar --professional ID o --all')
            )
            return

        total_slots = 0

        for prof in professionals:
            self.stdout.write(f'  📅 {prof.first_name} {prof.last_name}:')

            try:
                slots = generate_slots_range(
                    professional_id=prof.id,
                    start_date=today,
                    days=days
                )

                count = len(slots)
                total_slots += count

                if count > 0:
                    self.stdout.write(
                        self.style.SUCCESS(f'     ✓ {count} slots generados')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'     ⚠️  0 slots (verificar WorkSchedule)')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'     ❌ Error: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n✅ Total: {total_slots} slots generados para los próximos {days} días')
        )