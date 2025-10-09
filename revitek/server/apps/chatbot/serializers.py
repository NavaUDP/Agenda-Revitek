from rest_framework import serializers
from .models import Arbol, Nodo, SesionChat

class ArbolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Arbol
        fields = '__all__'

class NodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nodo
        fields = '__all__'

class SesionChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = SesionChat
        fields = '__all__'
