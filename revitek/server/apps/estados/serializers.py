from rest_framework import serializers
from apps.agenda.models import Reserva

class EstadoDetalleSerializer(serializers.ModelSerializer):
    historial = serializers.SerializerMethodField()
    class Meta:
        model = Reserva
        fields = ["id","estado","created_at","historial"]

    def get_historial(self, obj):
        return [{"estado":h.estado,"timestamp":h.timestamp,"nota":h.nota} for h in obj.historial.all().order_by("timestamp")]
