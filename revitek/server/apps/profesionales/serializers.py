from rest_framework import serializers
from .models import Profesional, CalendarioLaboral, Descanso
from apps.catalogo.models import ProfesionalServicio
from apps.catalogo.serializers import ServicioLiteSerializer

class DescansoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Descanso
        fields = ["id","inicio","fin"]

class CalendarioLaboralSerializer(serializers.ModelSerializer):
    descansos = DescansoSerializer(many=True, required=False)
    class Meta:
        model = CalendarioLaboral
        fields = ["id","dia_semana","activo","inicio","fin","descansos"]

class ProfesionalSerializer(serializers.ModelSerializer):
    servicios = serializers.SerializerMethodField()
    calendarios = CalendarioLaboralSerializer(many=True, required=False)

    class Meta:
        model = Profesional
        fields = [
            "id","nombre","email","telefono","acepta_reservas","activo",
            "color_calendario","biografia","foto","servicios","calendarios"
        ]

    def get_servicios(self, obj):
        asignaciones = ProfesionalServicio.objects.filter(profesional=obj, activo=True).select_related("servicio")
        return [ServicioLiteSerializer(a.servicio).data for a in asignaciones]
