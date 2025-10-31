"""
Minimal, clean serializers for the agenda app used by tests and views.

Only the bits required by tests are implemented. This file intentionally
avoids complex representation logic and uses explicit queries when reading
the Reserva->ReservaSlot relation to prevent RelatedManager attribute errors.
"""

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import serializers

from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado
from apps.catalogo.models import ProfesionalServicio


User = get_user_model()


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id", "profesional", "fecha", "inicio", "fin", "estado"]


class ReservaServicioInSerializer(serializers.Serializer):
    servicio_id = serializers.IntegerField()
    profesional_id = serializers.IntegerField()


class ReservaCreateSerializer(serializers.Serializer):
    cliente = serializers.DictField(required=False)
    titular_nombre = serializers.CharField(allow_blank=True, required=False)
    titular_email = serializers.EmailField(allow_null=True, required=False)
    titular_tel = serializers.CharField(allow_blank=True, required=False)
    profesional_id = serializers.IntegerField()
    servicios = ReservaServicioInSerializer(many=True)
    slot_id = serializers.IntegerField()
    nota = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated):
        with transaction.atomic():
            # Create or get client user if email provided
            cdata = validated.get("cliente") or {}
            cliente = None
            email = (cdata.get("email") or "").strip().lower()
            if email:
                cliente, _ = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "nombre": (cdata.get("nombre") or "").strip() or "Cliente",
                        "telefono": (cdata.get("telefono") or "").strip() or "",
                    },
                )

            # Lock the slot row
            slot = get_object_or_404(Slot.objects.select_for_update(), pk=validated["slot_id"])
            if slot.estado != "DISPONIBLE":
                raise serializers.ValidationError({"slot_id": "El bloque no está disponible"})

            servicios_in = validated.get("servicios", [])
            requested_prof = validated.get("profesional_id")
            for s in servicios_in:
                if s["profesional_id"] != requested_prof:
                    raise serializers.ValidationError({"servicios": "Servicio asignado a profesional distinto al seleccionado"})

            # compute total duration
            total_min = 0
            for s in servicios_in:
                try:
                    ps = ProfesionalServicio.objects.select_related("servicio").get(
                        profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                    )
                except ProfesionalServicio.DoesNotExist:
                    raise serializers.ValidationError({"servicios": "Servicio no asignado al profesional"})
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                total_min += dur

            slot_minutes = int((slot.fin - slot.inicio).total_seconds() // 60)
            if total_min > slot_minutes:
                raise serializers.ValidationError({"servicios": "La suma de duraciones excede la duración del bloque seleccionado"})

            # Create Reserva with allowed fields only
            reserva = Reserva.objects.create(
                cliente=cliente,
                nota=validated.get("nota", ""),
                estado="RESERVADO",
            )

            # Reserve the slot and mark it as reserved
            ReservaSlot.objects.create(reserva=reserva, slot=slot, profesional_id=validated["profesional_id"])
            slot.estado = "RESERVADO"
            slot.save(update_fields=["estado"])

            # Create ReservaServicio entries
            for s in servicios_in:
                ps = ProfesionalServicio.objects.select_related("servicio").get(
                    profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                )
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                ReservaServicio.objects.create(
                    reserva=reserva, servicio_id=s["servicio_id"], profesional_id=s["profesional_id"], duracion_min_eff=dur
                )

            reserva.total_min = total_min
            reserva.save(update_fields=["total_min"])
            HistorialEstado.objects.create(reserva=reserva, estado="RESERVADO", nota="Creación")
            return reserva


class ReservaDetailServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaServicio
        fields = ["servicio_id", "profesional_id", "duracion_min_eff"]


class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True, read_only=True)
    reservaslot = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = ["id", "estado", "total_min", "nota", "created_at", "servicios", "reservaslot", "cancelled_by"]

    def get_reservaslot(self, obj):
        # Query explicitly to avoid reverse-manager attribute issues
        rs = ReservaSlot.objects.filter(reserva=obj).select_related("slot").first()
        if not rs:
            return None
        slot_id = getattr(rs, "slot_id", None)
        if slot_id is None and getattr(rs, "slot", None) is not None:
            slot_id = getattr(rs.slot, "id", None)
        return {"slot_id": slot_id, "profesional_id": getattr(rs, "profesional_id", None)}


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado", "timestamp", "nota"]
