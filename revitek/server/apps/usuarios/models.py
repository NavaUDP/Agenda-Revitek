from django.db import models

class Cliente(models.Model):
    nombre = models.CharField(max_length=120)
    email = models.EmailField(unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=32, null=True, blank=True)
    nota = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.nombre or self.email or f"Cliente {self.pk}"
