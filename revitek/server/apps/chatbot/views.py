from rest_framework import viewsets
from .models import Arbol, Nodo, SesionChat
from .serializers import ArbolSerializer, NodoSerializer, SesionChatSerializer

class ArbolViewSet(viewsets.ModelViewSet):
    queryset = Arbol.objects.all()
    serializer_class = ArbolSerializer

class NodoViewSet(viewsets.ModelViewSet):
    queryset = Nodo.objects.all()
    serializer_class = NodoSerializer

class SesionChatViewSet(viewsets.ModelViewSet):
    queryset = SesionChat.objects.all()
    serializer_class = SesionChatSerializer
