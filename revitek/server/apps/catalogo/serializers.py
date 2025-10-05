from rest_framework import serializers
from .models import Servicio, ProfesionalServicio

class ServicioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id","nombre","categoria","duracion_min","activo"]

class ServicioProfesionalSerializer(serializers.ModelSerializer):
    servicio = ServicioLiteSerializer()
    duracion_eff = serializers.SerializerMethodField()

    class Meta:
        model = ProfesionalServicio
        fields = ["servicio","duracion_eff","activo"]

    def get_duracion_eff(self, obj):
        return obj.duracion_override_min or obj.servicio.duracion_min

class ServicioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id","nombre","categoria","duracion_min","activo"]

class ProfesionalServicioUpsertSerializer(serializers.Serializer):
    profesional_id = serializers.IntegerField()
    servicio_id = serializers.IntegerField()
    duracion_override_min = serializers.IntegerField(required=False, allow_null=True)
    activo = serializers.BooleanField(required=False)

    def create(self, validated):
        obj, _ = ProfesionalServicio.objects.update_or_create(
            profesional_id=validated["profesional_id"],
            servicio_id=validated["servicio_id"],
            defaults={
                "duracion_override_min": validated.get("duracion_override_min"),
                "activo": validated.get("activo", True),
            }
        )
        return obj
