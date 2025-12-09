from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, Group, Permission
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import datetime

from .utils import normalize_phone


# --- User Manager personalizado (login con email) ---
class CustomUserManager(BaseUserManager):
    """Manager de usuario donde el email es el identificador único."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("Email is required"))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        return self.create_user(email, password, **extra_fields)

    def find_by_phone(self, phone):
        """
        Intenta encontrar un usuario por teléfono usando lógica difusa.
        """
        if not phone:
            return None
            
        # 1. Limpiar input
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 2. Intento exacto
        user = self.filter(phone=clean_phone).first()
        if user:
            return user
            
        # 3. Si tiene 9 dígitos, probar agregando 56
        if len(clean_phone) == 9:
            user = self.filter(phone='56' + clean_phone).first()
            if user:
                return user
                
        # 4. Si tiene prefijo 56, probar quitándolo (caso raro pero posible)
        if clean_phone.startswith('56') and len(clean_phone) > 9:
             user = self.filter(phone=clean_phone[2:]).first()
             if user:
                 return user
                 
        return None


# --- User principal del sistema ---
class User(AbstractUser):
    """Usuario del sistema: clientes y administradores."""

    username = None
    email = models.EmailField(unique=True)

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "phone"]

    # Evitar conflictos con Django
    groups = models.ManyToManyField(
        Group,
        blank=True,
        related_name="users_custom_groups",
        related_query_name="user",
    )

    user_permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name="users_custom_permissions",
        related_query_name="user",
    )

    objects = CustomUserManager()

    def save(self, *args, **kwargs):
        # Normalizar teléfono
        if self.phone:
            self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


# ==============================
#    REGIONES Y COMUNAS
# ==============================

class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    roman_number = models.CharField(max_length=10, unique=True)
    number = models.IntegerField(unique=True)

    def __str__(self):
        return self.name


class Commune(models.Model):
    name = models.CharField(max_length=100)
    region = models.ForeignKey(Region, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("name", "region")

    def __str__(self):
        return f"{self.name} ({self.region.name})"


# ==============================
#         VEHÍCULOS
# ==============================

class Vehicle(models.Model):
    """Vehículos registrados por un usuario."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vehicles",
    )

    license_plate = models.CharField(max_length=10, unique=True)
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField(
        null=True, 
        blank=True,
        validators=[
            MinValueValidator(1900),
            MaxValueValidator(datetime.date.today().year + 1)
        ]
    )

    def __str__(self):
        return f"{self.brand} {self.model} ({self.license_plate})"


# ==============================
#         DIRECCIONES
# ==============================

class Address(models.Model):
    """Direcciones de retiro/devolución del cliente."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    alias = models.CharField(max_length=50, null=True, blank=True)

    street = models.CharField(max_length=255)
    number = models.CharField(max_length=50)
    complement = models.CharField(max_length=255, null=True, blank=True)

    commune = models.ForeignKey(Commune, on_delete=models.PROTECT)

    notes = models.TextField(null=True, blank=True)

    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)

    def __str__(self):
        base = f"{self.street} {self.number}, {self.commune.name}"
        return f"{self.alias}: {base}" if self.alias else base
