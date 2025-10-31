from rest_framework import serializers
from .models import Servicio, ProfesionalServicio


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id", "nombre", "categoria", "duracion_min", "activo", "precio"]


class ProfesionalServicioSerializer(serializers.ModelSerializer):
    servicio = ServicioSerializer(read_only=True)

    class Meta:
        model = ProfesionalServicio
        fields = ["id", "profesional", "servicio", "duracion_override_min", "activo"]
