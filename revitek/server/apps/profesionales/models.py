from django.db import models

class Profesional(models.Model):
    nombre = models.CharField(max_length=120)
    email = models.EmailField(unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=32, null=True, blank=True)
    acepta_reservas = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    color_calendario = models.CharField(max_length=7, default="#3b82f6")
    biografia = models.TextField(blank=True, default="", max_length=600)
    foto = models.ImageField(upload_to="profesionales/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class CalendarioLaboral(models.Model):
    profesional = models.ForeignKey(Profesional, on_delete=models.CASCADE, related_name="calendarios")
    dia_semana = models.PositiveSmallIntegerField()  # 0=domingo … 6=sábado
    activo = models.BooleanField(default=True)
    inicio = models.TimeField()
    fin = models.TimeField()

    class Meta:
        unique_together = [("profesional","dia_semana")]

class Descanso(models.Model):
    calendario = models.ForeignKey(CalendarioLaboral, on_delete=models.CASCADE, related_name="descansos")
    inicio = models.TimeField()
    fin = models.TimeField()