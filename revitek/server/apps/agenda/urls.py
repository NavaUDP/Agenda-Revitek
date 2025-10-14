from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import list_slots, ReservaViewSet, generate_slots, cancel_reserva_view

router = DefaultRouter()
router.register(r'reservas', ReservaViewSet, basename='reserva')

urlpatterns = [
    path('slots', list_slots, name='slots-list'),
    path('slots/generate', generate_slots, name='slots-generate'),
    path('', include(router.urls)),
    path('reserva/<int:pk>/cancel', cancel_reserva_view, name='reserva-cancel'),
]
