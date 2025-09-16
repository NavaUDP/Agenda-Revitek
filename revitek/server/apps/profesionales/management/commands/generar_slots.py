from datetime import datetime, timedelta, time, date
from django.core.management.base import BaseCommand, CommandParser
from django.utils.timezone import make_aware
from apps.profesionales.models import Profesional
from apps.agenda.models import Slot

class Command(BaseCommand):
    help = "Genera slots cada N minutos para profesionales en un rango de fechas."

    def add_arguments(self, p: CommandParser):
        p.add_argument("--profesional-id", type=int, help="ID de un profesional (omitir para todos)")
        p.add_argument("--desde", required=True, help="YYYY-MM-DD")
        p.add_argument("--hasta", required=True, help="YYYY-MM-DD (incluida)")
        p.add_argument("--inicio", default="09:00", help="HH:MM (ej: 09:00)")
        p.add_argument("--fin", default="19:00", help="HH:MM (ej: 19:00)")
        p.add_argument("--step", type=int, default=15, help="minutos por slot (default 15)")

    def handle(self, *args, **o):
        prof_qs = Profesional.objects.filter(activo=True)
        if o.get("profesional_id"):
            prof_qs = prof_qs.filter(pk=o["profesional_id"])

        d0 = datetime.strptime(o["desde"], "%Y-%m-%d").date()
        d1 = datetime.strptime(o["hasta"], "%Y-%m-%d").date()
        t0 = datetime.strptime(o["inicio"], "%H:%M").time()
        t1 = datetime.strptime(o["fin"], "%H:%M").time()
        step = timedelta(minutes=int(o["step"]))

        created = 0
        for prof in prof_qs:
            cur = d0
            while cur <= d1:
                start_dt = datetime.combine(cur, t0)
                end_of_day = datetime.combine(cur, t1)
                while start_dt < end_of_day:
                    fin_dt = start_dt + step
                    aware_start = make_aware(start_dt)
                    aware_fin = make_aware(fin_dt)
                    _, was_created = Slot.objects.get_or_create(
                        profesional=prof, inicio=aware_start,
                        defaults={"fin": aware_fin, "fecha": cur, "estado": "DISPONIBLE"}
                    )
                    created += int(was_created)
                    start_dt = fin_dt
                cur = cur + timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f"Slots creados: {created}"))
