from rest_framework.generics import ListAPIView
from .models import Profesional
from .serializers import ProfesionalSerializer

class ProfesionalListView(ListAPIView):
    queryset = Profesional.objects.filter(activo=True).order_by("nombre")
    serializer_class = ProfesionalSerializer
