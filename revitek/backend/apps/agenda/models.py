from django.conf import settings
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
import uuid


class Professional(models.Model):
    """
    Profesional que presta servicios (ej: retiro, lavado, RT, detailing).
    """
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True, null=True)

    active = models.BooleanField(default=True)
    accepts_reservations = models.BooleanField(default=True)

    calendar_color = models.CharField(
        max_length=7,
        default="#3b82f6",  # color para mostrar en el calendario del admin/front
    )
    bio = models.TextField(blank=True, default="", max_length=2000)
    photo = models.ImageField(upload_to="professionals/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class ProfessionalService(models.Model):
    """
    Relación muchos-a-muchos entre Professional y Service,
    con duración específica por profesional.
    """
    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name="services",
    )
    service = models.ForeignKey(
        "catalog.Service",
        on_delete=models.CASCADE,
        related_name="professionals",
    )
    duration_override_min = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional: overrides default service duration.",
    )
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("professional", "service")]
        ordering = ["professional__first_name", "professional__last_name", "service__name"]

    def __str__(self):
        return f"{self.professional} ↔ {self.service}"



class WorkSchedule(models.Model):
    WEEKDAY_CHOICES = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name="work_schedules",
    )
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("professional", "weekday")]
        ordering = ["professional__first_name", "professional__last_name", "weekday"]

    def __str__(self):
        return f"{self.professional} {self.get_weekday_display()} {self.start_time}-{self.end_time}"



class Break(models.Model):
    """
    Descanso fijo dentro de un WorkSchedule (por ejemplo colación).
    """
    work_schedule = models.ForeignKey(
        WorkSchedule,
        on_delete=models.CASCADE,
        related_name="breaks",
    )
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"Break {self.work_schedule} {self.start_time}-{self.end_time}"


class ScheduleException(models.Model):
    """
    Bloqueos extraordinarios para un profesional:
    - Vacaciones
    - Clases en la U un día específico
    - Eventos especiales
    """
    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name="exceptions",
    )
    date = models.DateField(db_index=True)
    start = models.DateTimeField()
    end = models.DateTimeField()
    reason = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"is_staff": True},
        related_name="created_schedule_exceptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start"]

    def __str__(self):
        return f"Exception {self.professional} {self.start:%Y-%m-%d %H:%M}"


class Slot(models.Model):
    """
    Bloque de tiempo concreto generado para un profesional.
    Se usa para disponibilidad / reserva / bloqueo.
    """
    STATUS_CHOICES = [
        ("AVAILABLE", "Available"),
        ("BLOCKED", "Blocked"),
        ("RESERVED", "Reserved"),
    ]

    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name="slots",
    )
    date = models.DateField(db_index=True)
    start = models.DateTimeField(db_index=True)
    end = models.DateTimeField()
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default="AVAILABLE",
    )

    class Meta:
        unique_together = [("professional", "start")]
        ordering = ["start"]

    def __str__(self):
        return f"{self.professional} {self.start:%Y-%m-%d %H:%M} [{self.status}]"


class SlotBlock(models.Model):
    """
    Bloqueo manual de horario sobre los slots (ej: trámites, urgencias, etc).
    """
    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name="slot_blocks",
    )
    date = models.DateField(db_index=True)
    start = models.DateTimeField(db_index=True)
    end = models.DateTimeField()
    reason = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_slot_blocks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start"]

    def __str__(self):
        return f"Block {self.professional} {self.start:%Y-%m-%d %H:%M}"


class Reservation(models.Model):
    """
    Reserva principal de un cliente.
    No se amarra directamente a vehículo/dirección aquí:
    eso se gestiona en serializers y en clients.*
    """
    STATUS_CHOICES = [
        ("RESERVED", "Reserved"),
        ("CONFIRMED", "Confirmed"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("NO_SHOW", "No Show"),
        ("PENDING", "Pending"),
        ("RECONFIRMED", "Re-Confirmed by Client"),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )

    vehicle = models.ForeignKey(
        "clients.Vehicle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )

    address = models.ForeignKey(
        "clients.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )

    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default="RESERVED",
        db_index=True,
    )
    cancelled_by = models.CharField(
        max_length=32,
        choices=[("admin", "Admin"), ("client", "Client")],
        null=True,
        blank=True,
    )

    total_min = models.PositiveIntegerField(default=0)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # WhatsApp Confirmation Token (for link-based confirmation)
    confirmation_token = models.UUIDField(
        default=None,
        null=True,
        blank=True,
        unique=True,
        help_text="Unique token for WhatsApp confirmation link"
    )
    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Expiration time for confirmation token (2 hours from generation)"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reservation #{self.pk} ({self.status})"


class ReservationService(models.Model):
    """
    Servicios incluidos en una reserva.
    """
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="services",
    )
    service = models.ForeignKey(
        "catalog.Service",
        on_delete=models.PROTECT,
    )
    professional = models.ForeignKey(
        Professional,
        on_delete=models.PROTECT,
    )
    effective_duration_min = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.reservation_id} → {self.service} ({self.effective_duration_min} min)"


class ReservationSlot(models.Model):
    """
    Slots asociados a una reserva (para reservas que ocupan varios bloques consecutivos).
    """
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="reservation_slots",
    )
    slot = models.ForeignKey(
        Slot,
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    professional = models.ForeignKey(
        Professional,
        on_delete=models.PROTECT,
    )

    def __str__(self):
        return f"ReservationSlot #{self.pk} (Res {self.reservation_id}, Slot {self.slot_id})"


class StatusHistory(models.Model):
    """
    Historial de cambios de estado de una reserva.
    """
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    status = models.CharField(max_length=16)
    timestamp = models.DateTimeField(default=timezone.now)
    note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.reservation_id} → {self.status} @ {self.timestamp}"


class AdminAudit(models.Model):
    """
    Auditoría de acciones admin sobre el sistema de agenda.
    """
    ACTIONS = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("CANCEL", "Cancel"),
    ]

    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"is_staff": True},
        related_name="agenda_admin_actions",
    )
    action = models.CharField(max_length=16, choices=ACTIONS)
    model_name = models.CharField(max_length=64)
    object_id = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.action} {self.model_name}({self.object_id})"