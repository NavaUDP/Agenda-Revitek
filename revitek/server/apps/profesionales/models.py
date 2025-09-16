from django.db import models

class Profesional(models.Model):
    nombre = models.CharField(max_length=120)
    email = models.EmailField(unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=32, null=True, blank=True)
    color_calendario = models.CharField(max_length=7, default="#3b82f6")
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre
