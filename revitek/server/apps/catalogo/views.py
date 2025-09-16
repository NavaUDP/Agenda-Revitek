from rest_framework.generics import ListAPIView, ListCreateAPIView, CreateAPIView, DestroyAPIView
from rest_framework.exceptions import ValidationError
from .models import Servicio, ProfesionalServicio
from .serializers import (
    ServicioProfesionalSerializer, ServicioCreateSerializer, ProfesionalServicioUpsertSerializer
)

class ServiciosPorProfesionalView(ListAPIView):
    serializer_class = ServicioProfesionalSerializer
    def get_queryset(self):
        profesional_id = self.request.query_params.get("profesional_id")
        if not profesional_id:
            raise ValidationError({"profesional_id": "Este parámetro es requerido"})
        return (ProfesionalServicio.objects
                .select_related("servicio","profesional")
                .filter(profesional_id=profesional_id, activo=True, servicio__activo=True)
                .order_by("servicio__nombre"))

class ServiciosListCreateView(ListCreateAPIView):
    queryset = Servicio.objects.all().order_by("nombre")
    serializer_class = ServicioCreateSerializer

class AsignarServicioProfesionalView(CreateAPIView):
    serializer_class = ProfesionalServicioUpsertSerializer

class QuitarServicioProfesionalView(DestroyAPIView):
    def get_object(self):
        pid = self.request.query_params.get("profesional_id")
        sid = self.request.query_params.get("servicio_id")
        if not pid or not sid:
            raise ValidationError({"params": "profesional_id y servicio_id son requeridos"})
        return ProfesionalServicio.objects.get(profesional_id=pid, servicio_id=sid)
