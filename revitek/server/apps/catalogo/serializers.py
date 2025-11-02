from rest_framework import serializers
from .models import Servicio, ProfesionalServicio
from apps.profesionales.serializers import Profesional


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id", "nombre", "categoria", "duracion_min", "activo", "precio"]


class ProfesionalServicioSerializer(serializers.ModelSerializer):
    profesional = serializers.PrimaryKeyRelatedField(
        queryset=Profesional.objects.all()
    )
    servicio = serializers.PrimaryKeyRelatedField(
        queryset=Servicio.objects.all()
    )

    class Meta:
        model = ProfesionalServicio
        fields = ["id", "profesional", "servicio", "duracion_override_min", "activo"]

    def to_representation(self, instance):

        representation = super().to_representation(instance)

        if instance.servicio:
            representation["servicio"] = ServicioSerializer(instance.servicio).data

        return representation