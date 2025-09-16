from django.urls import path
from .views import ServiciosPorProfesionalView

urlpatterns = [
    path("", ServiciosPorProfesionalView.as_view(), name="servicios-por-profesional"),
]
