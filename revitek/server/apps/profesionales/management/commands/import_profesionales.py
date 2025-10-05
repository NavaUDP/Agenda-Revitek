import csv
from django.core.management.base import BaseCommand, CommandParser
from apps.profesionales.models import Profesional

class Command(BaseCommand):
    help = "Importa profesionales desde CSV. Cabeceras: nombre,email,telefono,activo"

    def add_arguments(self, parser: CommandParser):
        parser.add_argument("csv_path", type=str, help="Ruta al CSV")

    def handle(self, *args, **opts):
        path = opts["csv_path"]
        created, updated, errors = 0, 0, 0
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for i, row in enumerate(reader, start=2):
                try:
                    email = (row.get("email") or "").strip().lower() or None
                    obj, was_created = Profesional.objects.update_or_create(
                        email=email,
                        defaults={
                            "nombre": (row.get("nombre") or "").strip(),
                            "telefono": (row.get("telefono") or "").strip(),
                            "activo": str(row.get("activo","true")).lower() in ("1","true","si","sí","yes"),
                        },
                    )
                    created += int(was_created)
                    updated += int(not was_created)
                except Exception as e:
                    errors += 1
                    self.stderr.write(f"[L{i}] Error: {e}")
        self.stdout.write(self.style.SUCCESS(f"OK - creados={created} actualizados={updated} errores={errors}"))
