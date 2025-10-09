from django.db import models
from apps.profesionales.models import Profesional

class Servicio(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    categoria = models.CharField(max_length=120, blank=True, default="")
    duracion_min = models.PositiveIntegerField(default=60)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class ProfesionalServicio(models.Model):
    profesional = models.ForeignKey(Profesional, on_delete=models.CASCADE, related_name="servicios")
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name="profesionales")
    duracion_override_min = models.PositiveIntegerField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("profesional", "servicio")]
        ordering = ["profesional__nombre","servicio__nombre"]

    def __str__(self):
        return f"{self.profesional} ↔ {self.servicio}"