from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from .models import Profesional
from .serializers import ProfesionalSerializer

class ProfesionalListView(ListAPIView):
    queryset = Profesional.objects.filter(activo=True).order_by("nombre")
    serializer_class = ProfesionalSerializer

class ProfesionalDetailView(RetrieveUpdateAPIView):
    queryset = Profesional.objects.all()
    serializer_class = ProfesionalSerializer
