import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.clients.models import Region, Commune


class Command(BaseCommand):
    help = "Carga regiones y comunas desde comunas-regiones.json"

    def handle(self, *args, **kwargs):
        # Ruta al archivo JSON en la app clients
        json_path = os.path.join(
            settings.BASE_DIR,
            "apps",
            "clients",
            "comunas-regiones.json"
        )

        if not os.path.exists(json_path):
            self.stdout.write(self.style.ERROR(f"No se encontró el archivo: {json_path}"))
            return

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for region_data in data["regions"]:
            region, created = Region.objects.get_or_create(
                name=region_data["name"],
                roman_number=region_data["romanNumber"],
                number=region_data["number"]
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Región creada: {region.name}"))

            for commune_data in region_data["communes"]:
                commune, c_created = Commune.objects.get_or_create(
                    name=commune_data["name"],
                    region=region
                )

                if c_created:
                    self.stdout.write(self.style.SUCCESS(f"  Comuna creada: {commune.name}"))

        self.stdout.write(self.style.SUCCESS("Carga completada correctamente."))
