from django.urls import path
from .views import SlotsPorDiaView, ReservaCreateView, ReservaDetailView

urlpatterns = [
    path("slots", SlotsPorDiaView.as_view(), name="slots-dia"),
    path("reservas", ReservaCreateView.as_view(), name="reserva-create"),
    path("reservas/<int:pk>", ReservaDetailView.as_view(), name="reserva-detail"),
]
