from django.urls import path
from .views import EstadoReservaView

urlpatterns = [
    path("<int:pk>", EstadoReservaView.as_view(), name="estado-reserva"),
]
