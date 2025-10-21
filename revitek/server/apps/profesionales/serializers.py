# revitek/server/apps/profesionales/serializers.py
from rest_framework import serializers
from .models import Profesional

class ProfesionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profesional
        fields = ['id', 'nombre', 'email', 'telefono'] # Ajusta los campos según necesites exponer
