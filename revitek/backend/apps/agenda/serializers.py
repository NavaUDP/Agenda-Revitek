from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from apps.clients.models import Vehicle, Address
from apps.catalog.models import Service
from .models import (
    Professional,
    ProfessionalService,
    WorkSchedule,
    Break,
    ScheduleException,
    Slot,
    SlotBlock,
    Reservation,
    ReservationService,
    ReservationSlot,
    StatusHistory,
)
from .services import compute_total_duration, create_reservation_transaction

User = get_user_model()


# ----------------------------------------------------------------------
# SERIALIZERS BÁSICOS
# ----------------------------------------------------------------------
class ProfessionalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Professional
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "accepts_reservations",
            "active",
            "calendar_color",
            "bio",
            "photo",
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class ProfessionalAdminSerializer(ProfessionalSerializer):
    """
    Serializador para administradores que incluye detalles de la cuenta de usuario.
    """
    has_user = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    create_user_account = serializers.BooleanField(write_only=True, default=True, required=False)

    class Meta(ProfessionalSerializer.Meta):
        fields = ProfessionalSerializer.Meta.fields + ["has_user", "user_email", "password", "create_user_account"]

    def get_has_user(self, obj):
        return obj.user is not None

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        create_user_account = validated_data.pop('create_user_account', True)
        
        # Crear el profesional
        professional = super().create(validated_data)
        
        # Crear cuenta de usuario automáticamente si se solicita y hay email
        if create_user_account and professional.email and password:
            email = professional.email.strip().lower()
            
            # Verificar si ya existe un usuario con ese email
            existing_user = User.objects.filter(email=email).first()
            
            if existing_user:
                # Si existe, vincular al profesional
                professional.user = existing_user
                professional.save()
            else:
                # Crear nuevo usuario
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=professional.first_name,
                    last_name=professional.last_name,
                    phone=professional.phone or ""
                )
                professional.user = user
                professional.save()
        
        return professional


class ProfessionalServiceSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    professional = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all())

    class Meta:
        model = ProfessionalService
        fields = [
            "id",
            "professional",
            "service",
            "duration_override_min",
            "active",
        ]


class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = [
            "id",
            "professional",
            "weekday",
            "start_time",
            "end_time",
            "active",
        ]


class BreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = Break
        fields = [
            "id",
            "work_schedule",
            "start_time",
            "end_time",
        ]


class ScheduleExceptionSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(source="professional.__str__", read_only=True)

    class Meta:
        model = ScheduleException
        fields = [
            "id",
            "professional",
            "professional_name",
            "date",
            "start",
            "end",
            "reason",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]


class SlotSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(source="professional.__str__", read_only=True)

    class Meta:
        model = Slot
        fields = [
            "id",
            "professional",
            "professional_name",
            "date",
            "start",
            "end",
            "status",
        ]


class SlotBlockSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(source="professional.__str__", read_only=True)

    class Meta:
        model = SlotBlock
        fields = [
            "id",
            "professional",
            "professional_name",
            "date",
            "start",
            "end",
            "reason",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]


# ----------------------------------------------------------------------
# RESERVAS - INPUT
# ----------------------------------------------------------------------
class ReservationServiceInputSerializer(serializers.Serializer):
    """
    Payload para un servicio de la reserva:
    {
        "service_id": 1,
        "professional_id": 3
    }
    """
    service_id = serializers.IntegerField()
    professional_id = serializers.IntegerField()


class ReservationCreateSerializer(serializers.Serializer):
    """
    Crea una reserva completa:
    - Crea/actualiza cliente
    - Crea/actualiza vehículo (opcional)
    - Crea/actualiza dirección (opcional)
    - Valida servicios ↔ profesional
    - Toma slots consecutivos
    """
    # Información del cliente
    client = serializers.DictField(required=True)

    # Vehículo opcional
    vehicle = serializers.DictField(required=False, allow_null=True)

    # Dirección opcional
    address = serializers.DictField(required=False, allow_null=True)

    # Datos de la reserva
    professional_id = serializers.IntegerField()
    services = ReservationServiceInputSerializer(many=True)
    slot_id = serializers.IntegerField()
    note = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated_data):
        return create_reservation_transaction(validated_data)


# ----------------------------------------------------------------------
# RESERVAS - OUTPUT / DETALLE
# ----------------------------------------------------------------------
class ReservationServiceDetailSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = ReservationService
        fields = [
            "service_id",
            "service_name",
            "professional_id",
            "effective_duration_min",
        ]


class ReservationSlotSummarySerializer(serializers.Serializer):
    """
    Resumen de los slots ocupados:
    - primer slot
    - último slot
    - profesional
    """
    slot_id_start = serializers.IntegerField()
    slot_id_end = serializers.IntegerField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    professional_id = serializers.IntegerField()


class ReservationDetailSerializer(serializers.ModelSerializer):
    services = ReservationServiceDetailSerializer(many=True, read_only=True)
    slots_summary = serializers.SerializerMethodField()
    client_info = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    vehicle = serializers.SerializerMethodField()
    client_addresses = serializers.SerializerMethodField()
    client_vehicles = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "status",
            "cancelled_by",
            "total_min",
            "note",
            "created_at",
            "services",
            "slots_summary",
            "client_info",
            "address",
            "vehicle",
            "client_addresses",
            "client_vehicles",
        ]

    def get_client_info(self, obj):
        if not obj.client:
            return None
        return {
            "id": obj.client.id,
            "email": obj.client.email,
            "first_name": getattr(obj.client, "first_name", ""),
            "last_name": getattr(obj.client, "last_name", ""),
            "phone": getattr(obj.client, "phone", ""),
        }

    def get_slots_summary(self, obj):
        qs = ReservationSlot.objects.filter(
            reservation=obj
        ).select_related("slot").order_by("slot__start")

        if not qs.exists():
            return None

        first_rs = qs.first()
        last_rs = qs.last()

        return {
            "slot_id_start": first_rs.slot.id,
            "slot_id_end": last_rs.slot.id,
            "start": first_rs.slot.start,
            "end": last_rs.slot.end,
            "professional_id": first_rs.professional_id,
        }

    def get_address(self, obj):
        addr = obj.address
        # Respaldo para reservas antiguas: si no hay dirección vinculada, pero el cliente tiene exactamente una, usarla.
        if not addr and obj.client:
            client_addresses = obj.client.addresses.select_related("commune__region").all()
            if client_addresses.count() == 1:
                addr = client_addresses.first()

        if not addr:
            return None

        return {
            "id": addr.id,
            "alias": addr.alias,
            "street": addr.street,
            "number": addr.number,
            "commune": addr.commune.name,
            "region": addr.commune.region.name,
            "complement": addr.complement,
            "notes": addr.notes,
        }

    def get_vehicle(self, obj):
        veh = obj.vehicle
        # Respaldo para reservas antiguas: si no hay vehículo vinculado, pero el cliente tiene exactamente uno, usarlo.
        if not veh and obj.client:
            client_vehicles = obj.client.vehicles.all()
            if client_vehicles.count() == 1:
                veh = client_vehicles.first()

        if not veh:
            return None

        return {
            "id": veh.id,
            "license_plate": veh.license_plate,
            "brand": veh.brand,
            "model": veh.model,
            "year": veh.year,
        }

    def get_client_addresses(self, obj):
        if not obj.client:
            return []
        return [
            {
                "id": addr.id,
                "alias": addr.alias,
                "street": addr.street,
                "number": addr.number,
                "commune": addr.commune.name,
                "region": addr.commune.region.name,
                "complement": addr.complement,
                "notes": addr.notes,
            }
            for addr in obj.client.addresses.select_related("commune__region").all()
        ]

    def get_client_vehicles(self, obj):
        if not obj.client:
            return []
        return [
            {
                "id": v.id,
                "license_plate": v.license_plate,
                "brand": v.brand,
                "model": v.model,
                "year": v.year,
            }
            for v in obj.client.vehicles.all()
        ]


class StatusHistorySerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StatusHistory
        fields = ["id", "reservation", "status", "timestamp", "note", "client_name"]

    def get_client_name(self, obj):
        if obj.reservation.client:
            return f"{obj.reservation.client.first_name} {obj.reservation.client.last_name}".strip()
        return "Cliente Desconocido"
