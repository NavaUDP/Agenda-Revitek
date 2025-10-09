from django.db import models
from apps.agenda.models import Reserva

class MensajeTemplate(models.Model):
	nombre = models.CharField(max_length=120, unique=True)
	contenido = models.TextField()
	canal = models.CharField(max_length=32, default="whatsapp")
	activo = models.BooleanField(default=True)

class ProgramacionRecordatorio(models.Model):
	reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name="recordatorios")
	fecha_envio = models.DateTimeField()
	enviado = models.BooleanField(default=False)
	canal = models.CharField(max_length=32, default="whatsapp")  # whatsapp, email, sms
	mensaje = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-fecha_envio"]

class LogEnvio(models.Model):
	recordatorio = models.ForeignKey(ProgramacionRecordatorio, on_delete=models.CASCADE, related_name="logs")
	fecha_intento = models.DateTimeField(auto_now_add=True)
	exito = models.BooleanField(default=False)
	respuesta = models.TextField(blank=True, default="")

	class Meta:
		ordering = ["-fecha_intento"]
