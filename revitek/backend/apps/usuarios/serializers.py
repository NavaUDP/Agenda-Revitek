from rest_framework import serializers
from .models import User, Vehiculo, Direccion
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class VehiculoSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Vehiculo.
    El 'propietario' se asignará automáticamente desde la vista.
    """
    class Meta:
        model = Vehiculo
        fields = ['id', 'patente', 'marca', 'modelo', 'year', 'propietario']
        # Hacemos que 'propietario' sea de solo lectura en el serializer
        # La vista se encargará de asignarlo al crear.
        read_only_fields = ['propietario']

class DireccionSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Direccion.
    El 'propietario' se asignará automáticamente desde la vista.
    """
    class Meta:
        model = Direccion
        fields = ['id', 'alias', 'calle', 'numero', 'comuna', 'ciudad', 'notas_adicionales', 'propietario']
        read_only_fields = ['propietario']

class UserSerializer(serializers.ModelSerializer):
    """
    Serializador principal para el modelo User.
    Incluye los vehículos y direcciones anidados para una respuesta completa.
    """
    # Anidamos los serializers para ver los vehículos y direcciones
    # completos del usuario, no solo sus IDs.
    vehiculos = VehiculoSerializer(many=True, read_only=True)
    direcciones = DireccionSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nombre',
            'apellido',
            'telefono',
            'is_staff',
            'vehiculos',
            'direcciones'
        ]
        # 'is_staff' debe ser de solo lectura para que un cliente no pueda
        # convertirse a sí mismo en admin.
        read_only_fields = ['is_staff']


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializador de token personalizado.
    """
    @classmethod
    def get_token(cls, user):
        """
        Añade datos personalizados (claims) al token.
        """
        token = super().get_token(user)

        # Añade claims (datos) personalizados al token
        token['nombre'] = user.nombre
        token['email'] = user.email
        token['is_staff'] = user.is_staff

        return token