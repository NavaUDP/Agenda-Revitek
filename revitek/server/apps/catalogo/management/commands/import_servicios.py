import csv
from django.core.management.base import BaseCommand, CommandParser
from apps.catalogo.models import Servicio

class Command(BaseCommand):
    help = "Importa/actualiza servicios desde CSV. Cabeceras: nombre,categoria,duracion_min,activo"

    def add_arguments(self, p: CommandParser):
        p.add_argument("csv_path", type=str)

    def handle(self, *a, **o):
        path = o["csv_path"]
        created = updated = errors = 0
        with open(path, newline="", encoding="utf-8") as fh:
            rd = csv.DictReader(fh)
            for i, row in enumerate(rd, start=2):
                try:
                    nombre = (row.get("nombre") or "").strip()
                    if not nombre:
                        raise ValueError("nombre requerido")
                    obj, was_created = Servicio.objects.update_or_create(
                        nombre=nombre,
                        defaults={
                            "categoria": (row.get("categoria") or "").strip(),
                            "duracion_min": int(row.get("duracion_min") or 60),
                            "activo": str(row.get("activo","true")).lower() in ("1","true","si","sí","yes"),
                        },
                    )
                    created += int(was_created); updated += int(not was_created)
                except Exception as e:
                    errors += 1; self.stderr.write(f"[L{i}] {e}")
        self.stdout.write(self.style.SUCCESS(f"Servicios -> creados={created}, actualizados={updated}, errores={errors}"))
