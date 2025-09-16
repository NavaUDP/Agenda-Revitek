from rest_framework.generics import ListAPIView
from rest_framework.exceptions import ValidationError
from .models import ProfesionalServicio
from .serializers import ServicioProfesionalSerializer

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
