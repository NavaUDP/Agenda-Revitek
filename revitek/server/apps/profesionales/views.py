# revitek/server/apps/profesionales/views.py
from rest_framework import viewsets
from .models import Profesional
from .serializers import ProfesionalSerializer
# Podrías añadir permisos si es necesario, ej: from rest_framework.permissions import IsAdminUser

class ProfesionalViewSet(viewsets.ModelViewSet):
    queryset = Profesional.objects.filter(activo=True) # Mostrar solo activos por defecto
    serializer_class = ProfesionalSerializer
    # permission_classes = [IsAdminUser] # Descomenta para restringir a admins