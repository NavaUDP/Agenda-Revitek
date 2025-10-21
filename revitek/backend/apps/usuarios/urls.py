from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, VehiculoViewSet, DireccionViewSet, perfil_usuario_actual

# El Router crea automáticamente las URLs para los ViewSets (list, create, detail, update, delete)
router = DefaultRouter()

# Endpoint (Admin): /api/usuarios/admin/users/
router.register(r'admin/users', UserViewSet, basename='admin-user')

# Endpoints (Cliente): /api/usuarios/vehiculos/
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')

# Endpoints (Cliente): /api/usuarios/direcciones/
router.register(r'direcciones', DireccionViewSet, basename='direccion')

urlpatterns = [
    # Incluye todas las URLs generadas por el router
    path('', include(router.urls)),

    # Añade la URL para el perfil del usuario actual
    # Endpoint (Cliente): /api/usuarios/me/
    path('me/', perfil_usuario_actual, name='perfil-actual'),
]