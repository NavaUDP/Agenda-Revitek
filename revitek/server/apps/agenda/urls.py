from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import list_slots, ReservaViewSet

router = DefaultRouter()
router.register(r'reservas', ReservaViewSet, basename='reserva')

urlpatterns = [
    path('slots', list_slots, name='slots-list'),
    path('', include(router.urls)),
]
