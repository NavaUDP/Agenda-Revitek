from django.db import models
from django.utils import timezone
from apps.profesionales.models import Profesional
from apps.catalogo.models import Servicio
from apps.usuarios.models import Cliente

class Slot(models.Model):
    ESTADOS = [("DISPONIBLE","DISPONIBLE"),("BLOQUEADO","BLOQUEADO"),("RESERVADO","RESERVADO")]
    profesional = models.ForeignKey(Profesional, on_delete=models.CASCADE, related_name="slots")
    fecha = models.DateField(db_index=True)
    inicio = models.DateTimeField(db_index=True)
    fin = models.DateTimeField()
    estado = models.CharField(max_length=12, choices=ESTADOS, default="DISPONIBLE")

    class Meta:
        unique_together = [("profesional","inicio")]
        ordering = ["inicio"]

    def __str__(self):
        return f"{self.profesional} {self.inicio:%Y-%m-%d %H:%M}"

class Reserva(models.Model):
    ESTADOS = [
        ("RESERVADO","Reservado"),("CONFIRMADO","Confirmado"),("ASISTE","Asiste"),
        ("NO_ASISTIO","No Asistió"),("PENDIENTE","Pendiente"),("EN_ESPERA","En Espera"),
        ("EN_PROGRESO","En Progreso"),("COMPLETADO","Completado"),("CANCELADO","Cancelado"),
    ]
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)
    titular_nombre = models.CharField(max_length=120, blank=True, default="")
    titular_email = models.EmailField(null=True, blank=True)
    titular_tel = models.CharField(max_length=32, blank=True, default="")
    estado = models.CharField(max_length=16, choices=ESTADOS, default="RESERVADO", db_index=True)
    cancelled_by = models.CharField(max_length=32, choices=[('admin','Admin'),('client','Client')], null=True, blank=True)
    total_min = models.PositiveIntegerField(default=0)
    nota = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
class AdminAudit(models.Model):
    ACTIONS = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("CANCEL", "Cancel"),
    ]
    admin_email = models.EmailField()
    action = models.CharField(max_length=16, choices=ACTIONS)
    model_name = models.CharField(max_length=64)
    object_id = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

class ReservaSlot(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name="reservaslot")
    slot = models.OneToOneField(Slot, on_delete=models.PROTECT, related_name="ocupacion")
    profesional = models.ForeignKey(Profesional, on_delete=models.PROTECT)

class ReservaServicio(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name="servicios")
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT)
    profesional = models.ForeignKey(Profesional, on_delete=models.PROTECT)
    duracion_min_eff = models.PositiveIntegerField()

class HistorialEstado(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name="historial")
    estado = models.CharField(max_length=16)
    timestamp = models.DateTimeField(default=timezone.now)
    nota = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["timestamp"]