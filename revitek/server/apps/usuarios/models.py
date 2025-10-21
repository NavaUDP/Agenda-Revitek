from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.conf import settings  # Necesario para las ForeignKeys
from django.contrib.auth.models import Group, Permission



# --- Manager para que el Email sea el login ---
class CustomUserManager(BaseUserManager):
    """
    Manager de usuario personalizado donde el email es el identificador único
    para la autenticación en lugar de los nombres de usuario.
    """

    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError(_('El Email debe ser proporcionado'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser debe tener is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser debe tener is_superuser=True.'))

        # ACTUALIZACIÓN: Añadimos defaults para los nuevos campos requeridos
        extra_fields.setdefault('nombre', 'Admin')
        extra_fields.setdefault('telefono', '000000000')

        return self.create_user(email, password, **extra_fields)


# --- 1. Modelo User (Admin y Cliente) ---
class User(AbstractUser):
    """
    Modelo de Usuario principal. Almacena la identidad y datos de contacto.
    - Rol Admin/Staff: is_staff=True
    - Rol Cliente: is_staff=False (y con contraseña "inusable")
    """

    # Quitamos 'username' para usar 'email' en su lugar
    username = None
    email = models.EmailField(_('email address'), unique=True)

    # DATOS VITALES (Movidos desde tu antiguo 'Perfil')
    # Ahora son obligatorios para TODOS (admins y clientes)
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150, blank=True)
    telefono = models.CharField(max_length=20)  # Vital para recordatorios WA

    # Definimos el campo de login
    USERNAME_FIELD = 'email'
    # Pedirá esto al crear superuser
    REQUIRED_FIELDS = ['nombre', 'telefono']

    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        # Este es el cambio clave: un nombre único
        related_name="usuario_grupos",
        related_query_name="user",
    )

    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        # Este es el cambio clave: un nombre único
        related_name="usuario_permisos",
        related_query_name="user",
    )

    objects = CustomUserManager()

    def __str__(self):
        return self.email


# --- 2. Modelo Vehiculo (NUEVO) ---
class Vehiculo(models.Model):
    """
    Almacena los vehículos de un cliente.
    Un cliente (User) puede tener múltiples vehículos.
    """
    # Conexión al dueño (el cliente)
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  # Si se borra el cliente, se borran sus autos
        related_name="vehiculos"
    )

    patente = models.CharField(max_length=10, unique=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    year = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.patente}) - {self.propietario.email}"


# --- 3. Modelo Direccion (NUEVO) ---
# (Reemplaza tu antiguo campo 'direccion' en 'Perfil')
class Direccion(models.Model):
    """
    Almacena las direcciones de un cliente para retiro/despacho.
    Un cliente (User) puede tener múltiples direcciones (casa, oficina).
    """
    # Conexión al dueño (el cliente)
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  # Si se borra el cliente, se borran sus direcciones
        related_name="direcciones"
    )

    alias = models.CharField(max_length=50, help_text="Ej: 'Casa', 'Oficina'")
    calle = models.CharField(max_length=255)
    numero = models.CharField(max_length=50)
    comuna = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100, default="Santiago")
    notas_adicionales = models.TextField(blank=True, null=True, help_text="Ej: 'Depto 101, reja blanca'")

    def __str__(self):
        return f"{self.alias}: {self.calle} {self.numero}, {self.comuna} ({self.propietario.email})"

