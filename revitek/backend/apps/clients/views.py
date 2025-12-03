from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Region, Commune, Vehicle, Address
from .serializers import (
    UserSerializer,
    RegionSerializer,
    CommuneSerializer,
    VehicleSerializer,
    AddressSerializer, MyTokenObtainPairSerializer,
)


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.all().order_by("number")
    serializer_class = RegionSerializer
    permission_classes = [AllowAny]


class CommuneViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Commune.objects.all().order_by("name")
    serializer_class = CommuneSerializer
    permission_classes = [AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.prefetch_related('vehicles', 'addresses')
        if user.is_staff:
            return queryset.all()
        return queryset.filter(id=user.id)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def lookup(self, request):
        """
        Public endpoint to lookup user details by email or phone for booking autocomplete.
        """
        email = request.query_params.get('email')
        phone = request.query_params.get('phone')

        if not email and not phone:
            return Response({"error": "Email or phone required"}, status=400)

        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
        elif phone:
            user = User.objects.find_by_phone(phone)

        if not user:
            return Response({"found": False}, status=404)

        # Get latest vehicle and address
        vehicle = user.vehicles.order_by('-id').first()
        address = user.addresses.order_by('-id').first()

        # SECURITY: Mask sensitive data for public lookup
        vehicle_data = None
        if vehicle:
            vehicle_data = {
                "id": vehicle.id,
                "brand": vehicle.brand,
                "model": vehicle.model,
                # Mask plate: AB-CD-12 -> AB-**-**
                "license_plate": f"{vehicle.license_plate[:2]}****" if len(vehicle.license_plate) > 2 else "**"
            }

        address_data = None
        if address:
            address_data = {
                "id": address.id,
                "commune": address.commune.name, # Safe
                # Mask street: Av. Providencia 1234 -> Av. Provi******
                "street": f"{address.street[:5]}******" if len(address.street) > 5 else "***",
                "number": "**",
                "alias": address.alias
            }

        data = {
            "found": True,
            "first_name": user.first_name,
            "last_name": f"{user.last_name[:1]}." if user.last_name else "",
            "vehicle": vehicle_data,
            "address": address_data,
        }
        return Response(data)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MyTokenObtainPairView(TokenObtainPairView):
    """
    Vista de login personalizada que usa nuestro serializador.
    Ahora aceptará 'email' en lugar de 'username'.
    """
    serializer_class = MyTokenObtainPairSerializer