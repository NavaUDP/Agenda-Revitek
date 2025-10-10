from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServicioViewSet, ProfesionalServicioViewSet

router = DefaultRouter()
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'servicio_asignaciones', ProfesionalServicioViewSet, basename='profesionalservicio')

urlpatterns = [
    path('', include(router.urls)),
]
