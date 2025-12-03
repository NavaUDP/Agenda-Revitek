from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


from .models import User, Region, Commune, Vehicle, Address


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"


class CommuneSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        source="region",
        write_only=True,
    )

    class Meta:
        model = Commune
        fields = ["id", "name", "region", "region_id"]


class AddressSerializer(serializers.ModelSerializer):
    commune = CommuneSerializer(read_only=True)
    commune_id = serializers.PrimaryKeyRelatedField(
        queryset=Commune.objects.all(),
        source="commune",
        write_only=True,
    )

    class Meta:
        model = Address
        fields = [
            "id",
            "alias",
            "street",
            "number",
            "complement",
            "commune",
            "commune_id",
            "notes",
            "lat",
            "lon",
        ]


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ["id", "license_plate", "brand", "model", "year"]


class UserSerializer(serializers.ModelSerializer):
    vehicles = VehicleSerializer(many=True, read_only=True)
    addresses = AddressSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "vehicles",
            "addresses",
        ]


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Manda info del admin al frontend junto con el token.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Solo campos que deseas exponer en el frontend
        token["email"] = user.email
        token["is_staff"] = user.is_staff
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        
        if hasattr(user, 'professional_profile'):
            token["professional_id"] = user.professional_profile.id

        return token


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer