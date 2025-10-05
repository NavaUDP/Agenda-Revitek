import csv
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from apps.profesionales.models import Profesional
from apps.catalogo.models import Servicio, ProfesionalServicio

TRUE_SET = {"1","true","si","sí","yes"}

class Command(BaseCommand):
    help = ("Asigna servicios a profesionales. Cabeceras: "
            "profesional_email,profesional_nombre,servicio_nombre,duracion_override_min,activo")

    def add_arguments(self, p: CommandParser):
        p.add_argument("csv_path", type=str)

    @transaction.atomic
    def handle(self, *a, **o):
        path = o["csv_path"]
        created = updated = errors = 0
        with open(path, newline="", encoding="utf-8") as fh:
            rd = csv.DictReader(fh)
            for i, row in enumerate(rd, start=2):
                try:
                    p_email = (row.get("profesional_email") or "").strip().lower() or None
                    p_nombre = (row.get("profesional_nombre") or "").strip()
                    s_nombre = (row.get("servicio_nombre") or "").strip()
                    if not s_nombre:
                        raise ValueError("servicio_nombre requerido")

                    prof = None
                    if p_email:
                        prof = Profesional.objects.filter(email=p_email).first()
                    if not prof and p_nombre:
                        prof = Profesional.objects.filter(nombre=p_nombre).first()
                    if not prof:
                        raise ValueError("profesional no encontrado (email/nombre)")

                    srv = Servicio.objects.filter(nombre=s_nombre).first()
                    if not srv:
                        raise ValueError(f"servicio '{s_nombre}' no existe (cárguelo primero)")

                    obj, was_created = ProfesionalServicio.objects.update_or_create(
                        profesional=prof, servicio=srv,
                        defaults={
                            "duracion_override_min": int(row["duracion_override_min"]) if row.get("duracion_override_min") else None,
                            "activo": str(row.get("activo","true")).lower() in TRUE_SET if row.get("activo") else True,
                        }
                    )
                    created += int(was_created); updated += int(not was_created)
                except Exception as e:
                    errors += 1; self.stderr.write(f"[L{i}] {e}")
        self.stdout.write(self.style.SUCCESS(
            f"ProfesionalServicio -> creados={created}, actualizados={updated}, errores={errors}"
        ))
