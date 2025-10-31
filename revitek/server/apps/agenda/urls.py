from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .availability import aggregated_availability

router = DefaultRouter()
router.register(r'reservas', views.ReservaViewSet, basename='reserva')

urlpatterns = [
    path('slots', views.list_slots, name='slots-list'),
    path('slots/generate', views.generate_slots, name='slots-generate'),
    path('availability', aggregated_availability, name='aggregated-availability'),
    path('', include(router.urls)),
    path('reserva/<int:pk>/cancel', views.cancel_reserva_view, name='reserva-cancel'),
]
