from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import User, Vehiculo, Direccion
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer, VehiculoSerializer, DireccionSerializer, MyTokenObtainPairSerializer # 👈 Añade el nuevo serializer

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint (solo lectura) para los admin vean a los usuarios.
    Los clientes no deben poer listar a los usuarios
    """
    queryset = User.objects.all().prefetch_related('vehiculos', 'direcciones')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser] # solo admin

class VehiculoViewSet(viewsets.ModelViewSet):
    """
    API endpoint para que un cliente gestione sus propios vehiculos.
    """
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Esta vista solo devuelve los vehiculos del usuario actual.
        return Vehiculo.objects.filter(propietario=self.request.user)

    def perfotm_create(self, serializer):
        # asigna automaticamente al usuario logeado como propietario
        serializer.save(propietario=self.request.user)

class DireccionViewSet(viewsets.ModelViewSet):
    """
    API endpoint para que un cliente gestione sus direcciones.
    """
    serializer_class = DireccionSerializer
    permission_classes = [IsAuthenticated] # debe estar logeado

    def get_queryset(self):
        # devuelve las direcciones del usuario actual
        return Direccion.objects.filter(propietario=self.request.user)

    def perform_create(self, serializer):
        # asigna automaticamente al usuario logeado como propietario
        serializer.save(propietario=self.request.user)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def perfil_usuario_actual(request):
    """
    Endpoint para que un usuario vea y actualice SU PROPIO perfil.
    Esto es para el "Mi Perfil" en el frontend.
    """
    try:
        user = request.user
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Usamos partial=True para permitir actualizaciones parciales (ej: solo el teléfono)
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Vista de login personalizada que usa nuestro serializador.
    Ahora aceptará 'email' en lugar de 'username'.
    """
    serializer_class = MyTokenObtainPairSerializer