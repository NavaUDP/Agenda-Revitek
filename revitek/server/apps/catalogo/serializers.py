from rest_framework import serializers
from .models import Servicio, ProfesionalServicio

class ServicioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id","nombre","categoria","duracion_min","precio_base"]

class ServicioProfesionalSerializer(serializers.ModelSerializer):
    servicio = ServicioLiteSerializer()
    duracion_eff = serializers.SerializerMethodField()
    precio_eff = serializers.SerializerMethodField()

    class Meta:
        model = ProfesionalServicio
        fields = ["servicio","duracion_eff","precio_eff","activo"]

    def get_duracion_eff(self, obj):
        return obj.duracion_override_min or obj.servicio.duracion_min

    def get_precio_eff(self, obj):
        return str(obj.precio_override if obj.precio_override is not None else obj.servicio.precio_base)
