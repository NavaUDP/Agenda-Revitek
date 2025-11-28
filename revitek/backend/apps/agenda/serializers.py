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
from .services import compute_total_duration

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
        from .models import ProfessionalService  # para evitar import circular

        with transaction.atomic():
            # ----------------------------------------------------------
            # 1) CLIENTE
            # ----------------------------------------------------------
            client_data = validated_data.get("client") or {}
            client = None
            email = (client_data.get("email") or "").strip().lower()

            if email:
                client, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": (client_data.get("first_name") or "").strip(),
                        "last_name": (client_data.get("last_name") or "").strip(),
                        "phone": (client_data.get("phone") or "").strip(),
                    },
                )
                if not created:
                    # Actualiza datos básicos si vienen en el payload
                    first_name = (client_data.get("first_name") or "").strip()
                    last_name = (client_data.get("last_name") or "").strip()
                    phone = (client_data.get("phone") or "").strip()

                    changed_fields = []
                    if first_name and first_name != client.first_name:
                        client.first_name = first_name
                        changed_fields.append("first_name")
                    if last_name and last_name != client.last_name:
                        client.last_name = last_name
                        changed_fields.append("last_name")
                    if phone and phone != getattr(client, "phone", None):
                        client.phone = phone
                        changed_fields.append("phone")

                    if changed_fields:
                        client.save(update_fields=changed_fields)

            # ----------------------------------------------------------
            # 2) VEHÍCULO (opcional)
            # ----------------------------------------------------------
            vehicle_data = validated_data.get("vehicle")
            vehicle_obj = None
            if vehicle_data and client:
                plate = (vehicle_data.get("license_plate") or vehicle_data.get("plate") or "").strip().upper()
                if plate:
                    vehicle_defaults = {
                        "owner": client,
                        "brand": (vehicle_data.get("brand") or "").strip(),
                        "model": (vehicle_data.get("model") or "").strip(),
                        "year": vehicle_data.get("year"),
                    }
                    vehicle_obj, _ = Vehicle.objects.update_or_create(
                        license_plate=plate,
                        owner=client,
                        defaults=vehicle_defaults,
                    )

            # ----------------------------------------------------------
            # 3) DIRECCIÓN (opcional)
            # ----------------------------------------------------------
            address_data = validated_data.get("address")
            address_obj = None
            if address_data and client:
                alias = (address_data.get("alias") or "Principal").strip()
                street = (address_data.get("street") or "").strip()
                number = (address_data.get("number") or "").strip()
                commune = (address_data.get("commune") or "").strip()
                region = (address_data.get("region") or "").strip()
                complement = (address_data.get("complement") or "").strip()

                if street:
                    commune_id = address_data.get("commune_id")
                    commune_obj = None
                    if commune_id:
                         from apps.clients.models import Commune
                         commune_obj = Commune.objects.filter(id=commune_id).first()
                    
                    # Fallback: try to find by name if provided (optional, but good for robustness)
                    if not commune_obj and commune:
                         from apps.clients.models import Commune
                         commune_obj = Commune.objects.filter(name__iexact=commune).first()

                    if commune_obj:
                        address_obj, _ = Address.objects.get_or_create(
                            owner=client,
                            alias=alias,
                            defaults={
                                "street": street,
                                "number": number,
                                "commune": commune_obj,
                                "complement": complement,
                            },
                        )

            # ----------------------------------------------------------
            # 4) VALIDACIÓN DE SLOTS Y SERVICIOS
            # ----------------------------------------------------------
            professional_id = validated_data["professional_id"]
            slot_initial = get_object_or_404(
                Slot.objects.select_for_update(),
                pk=validated_data["slot_id"],
            )

            if slot_initial.status != "AVAILABLE":
                raise serializers.ValidationError({"slot_id": "Slot is not available."})

            services_in = validated_data.get("services", [])

            # todos los servicios deben apuntar al mismo profesional
            for s in services_in:
                if s["professional_id"] != professional_id:
                    raise serializers.ValidationError(
                        {"services": "All services must be assigned to the selected professional."}
                    )

            try:
                total_required_min = compute_total_duration(services_in)
            except ProfessionalService.DoesNotExist:
                raise serializers.ValidationError(
                    {"services": "One or more services are not assigned to the professional or are inactive."}
                )

            slot_duration_min = int(
                (slot_initial.end - slot_initial.start).total_seconds() // 60
            )
            if slot_duration_min <= 0:
                raise serializers.ValidationError({"slot_id": "Slot base has zero duration."})

            slots_needed = (total_required_min + slot_duration_min - 1) // slot_duration_min
            if slots_needed <= 0:
                slots_needed = 1

            # Busca slots consecutivos
            slots_to_reserve = [slot_initial]
            current_slot = slot_initial

            for i in range(1, slots_needed):
                next_start = current_slot.end
                try:
                    next_slot = Slot.objects.select_for_update().get(
                        professional_id=professional_id,
                        start=next_start,
                        status="AVAILABLE",
                    )
                except Slot.DoesNotExist:
                    raise serializers.ValidationError(
                        {
                            "services": (
                                f"Not enough consecutive slots. Required {slots_needed}, "
                                f"found {i}. Total minutes required: {total_required_min}."
                            )
                        }
                    )
                slots_to_reserve.append(next_slot)
                current_slot = next_slot

            # ----------------------------------------------------------
            # 5) CREAR RESERVA
            # ----------------------------------------------------------
            # ----------------------------------------------------------
            # 5) CREAR RESERVA
            # ----------------------------------------------------------
            reservation = Reservation.objects.create(
                client=client,
                vehicle=vehicle_obj,
                address=address_obj,
                note=validated_data.get("note", ""),
                status="PENDING",
                total_min=total_required_min,
            )

            # ----------------------------------------------------------
            # 6) MARCAR SLOTS COMO RESERVED
            # ----------------------------------------------------------
            for s in slots_to_reserve:
                s.status = "RESERVED"
                s.save(update_fields=["status"])
                ReservationSlot.objects.create(
                    reservation=reservation,
                    slot=s,
                    professional_id=professional_id,
                )

            # ----------------------------------------------------------
            # 7) CREAR ReservationService
            # ----------------------------------------------------------
            for s in services_in:
                ps = ProfessionalService.objects.select_related("service").get(
                    professional_id=s["professional_id"],
                    service_id=s["service_id"],
                    active=True,
                )
                duration = ps.duration_override_min or ps.service.duration_min
                ReservationService.objects.create(
                    reservation=reservation,
                    service_id=s["service_id"],
                    professional_id=s["professional_id"],
                    effective_duration_min=duration,
                )

            # ----------------------------------------------------------
            # 8) HISTORIAL DE ESTADO
            # ----------------------------------------------------------
            StatusHistory.objects.create(
                reservation=reservation,
                status="PENDING",
                note="Reservation created (Pending Confirmation)",
            )

            return reservation


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
        # Fallback for legacy reservations: if no address linked, but client has exactly one, use it.
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
        # Fallback for legacy reservations: if no vehicle linked, but client has exactly one, use it.
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
    class Meta:
        model = StatusHistory
        fields = ["status", "timestamp", "note"]
