from django.urls import path
from .views import (
    ServiciosPorProfesionalView,
    ServiciosListCreateView,
    AsignarServicioProfesionalView,
    QuitarServicioProfesionalView,
)

urlpatterns = [
    path("", ServiciosPorProfesionalView.as_view(), name="servicios-por-profesional"),  # GET ?profesional_id=
    path("all", ServiciosListCreateView.as_view(), name="servicios-all-list-create"),   # GET/POST servicios
    path("asignar", AsignarServicioProfesionalView.as_view(), name="asignar-servicio"), # POST asignar/upsert
    path("asignar", QuitarServicioProfesionalView.as_view(), name="quitar-servicio"),   # DELETE con query params
]
