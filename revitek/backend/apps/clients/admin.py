from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Region, Commune, Vehicle, Address


# ==============================
#   CONFIGURACIÓN DEL USER
# ==============================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Configuración del panel admin para el usuario personalizado."""

    # Campos que se muestran en la lista
    list_display = ("email", "first_name", "last_name", "phone", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)

    # Campos que aparecen al editar un usuario
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    # Campos del formulario al crear un nuevo usuario
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "phone",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )


# ==============================
#   REGION Y COMMUNE
# ==============================

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "roman_number", "number")
    ordering = ("number",)
    search_fields = ("name", "roman_number")


@admin.register(Commune)
class CommuneAdmin(admin.ModelAdmin):
    list_display = ("name", "region")
    list_filter = ("region",)
    search_fields = ("name",)


# ==============================
#   VEHICLES
# ==============================

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("license_plate", "brand", "model", "year", "owner")
    search_fields = ("license_plate", "brand", "model", "owner__email")
    list_filter = ("brand",)


# ==============================
#   ADDRESSES
# ==============================

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("__str__", "owner", "commune")
    search_fields = ("street", "number", "owner__email", "alias")
    list_filter = ("commune__region", "commune")
