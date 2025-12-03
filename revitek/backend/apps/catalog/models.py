from django.db import models
from .validators import validate_time_list


class Category(models.Model):
    """
    Categoría de un servicio (ej: car wash, detailing, technical inspection).
    """
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Service(models.Model):
    """
    Servicio ofrecido por Revitek (lavado, pulido, RT, traslado, etc).
    """
    name = models.CharField(max_length=120, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    duration_min = models.PositiveIntegerField(default=60)
    active = models.BooleanField(default=True)
    price = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ServiceTimeRule(models.Model):
    """
    Reglas de disponibilidad por servicio.
    Define horas permitidas por día de la semana.
    Ej: L-V 9:00, 11:00, 13:00, 15:00
        Sáb 9:00, 11:00
    """

    WEEKDAY_CHOICES = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    service = models.ForeignKey(
        "catalog.Service",
        on_delete=models.CASCADE,
        related_name="time_rules"
    )

    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)

    # Lista de horas tipo: ["09:00", "11:00", "13:00"]
    allowed_times = models.JSONField(
        default=list,
        help_text="Lista de horas permitidas en formato HH:MM",
        validators=[validate_time_list]
    )

    class Meta:
        unique_together = [("service", "weekday")]
        ordering = ["service_id", "weekday"]

    def __str__(self):
        return f"{self.service.name} – {self.get_weekday_display()}"
