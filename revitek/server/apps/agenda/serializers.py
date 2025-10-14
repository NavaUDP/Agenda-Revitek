from rest_framework import serializers
from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado, AdminAudit
from apps.catalogo.models import ProfesionalServicio
from apps.usuarios.models import Cliente

class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id","profesional","fecha","inicio","fin","estado"]

class ReservaServicioInSerializer(serializers.Serializer):
    servicio_id = serializers.IntegerField()
    profesional_id = serializers.IntegerField()

class ReservaCreateSerializer(serializers.Serializer):
    cliente = serializers.DictField(required=False)  # {nombre,email,telefono}
    titular_nombre = serializers.CharField(allow_blank=True, required=False)
    titular_email = serializers.EmailField(allow_null=True, required=False)
    titular_tel = serializers.CharField(allow_blank=True, required=False)
    profesional_id = serializers.IntegerField()
    servicios = ReservaServicioInSerializer(many=True)
    slot_id = serializers.IntegerField()
    nota = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated):
        from django.db import transaction
        from django.shortcuts import get_object_or_404
        from . import services as agenda_services

        with transaction.atomic():
            # cliente opcional (upsert por email si viene)
            cdata = validated.get("cliente") or {}
            cliente = None
            if cdata.get("email"):
                cliente, _ = Cliente.objects.get_or_create(
                    email=cdata["email"].strip().lower(),
                    defaults={"nombre": cdata.get("nombre","").strip(), "telefono": cdata.get("telefono","").strip()},
                )

            slot = get_object_or_404(Slot.objects.select_for_update(), pk=validated["slot_id"])
            if slot.estado != "DISPONIBLE":
                raise serializers.ValidationError({"slot_id": "El bloque no está disponible"})

            # validate that all servicios are offered by the selected profesional
            # and compute total duration
            servicios_in = validated.get("servicios", [])
            # Ensure profesional matches the slot professional
            requested_prof = validated.get("profesional_id")
            for s in servicios_in:
                if s["profesional_id"] != requested_prof:
                    raise serializers.ValidationError({"servicios": "Servicio asignado a profesional distinto al seleccionado"})

            total_min = agenda_services.compute_total_duration(servicios_in)
            slot_minutes = int((slot.fin - slot.inicio).total_seconds() // 60)
            if total_min > slot_minutes:
                raise serializers.ValidationError({"servicios": "La suma de duraciones excede la duración del bloque seleccionado"})

            reserva = Reserva.objects.create(
                cliente=cliente,
                titular_nombre=validated.get("titular_nombre",""),
                titular_email=validated.get("titular_email"),
                titular_tel=validated.get("titular_tel",""),
                nota=validated.get("nota",""),
                estado="RESERVADO",
            )

            # ocupar el slot
            ReservaSlot.objects.create(reserva=reserva, slot=slot, profesional_id=validated["profesional_id"])
            slot.estado = "RESERVADO"
            slot.save(update_fields=["estado"])

            # servicios con duraciones (overrides) — use previously computed total_min
            for s in servicios_in:
                ps = ProfesionalServicio.objects.select_related("servicio").get(
                    profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                )
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                ReservaServicio.objects.create(
                    reserva=reserva, servicio_id=s["servicio_id"], profesional_id=s["profesional_id"],
                    duracion_min_eff=dur
                )

            reserva.total_min = total_min
            reserva.save(update_fields=["total_min"])

            HistorialEstado.objects.create(reserva=reserva, estado="RESERVADO", nota="Creación")
            return reserva

class ReservaDetailServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaServicio
        fields = ["servicio_id","profesional_id","duracion_min_eff"]

class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True)
    reservaslot = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = ["id","estado","total_min","titular_nombre","titular_email","titular_tel",
                  "nota","created_at","servicios","reservaslot"]

    def get_reservaslot(self, obj):
        rs = obj.reservaslot.first()
        return {"slot_id": rs.slot_id, "profesional_id": rs.profesional_id} if rs else None

class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado","timestamp","nota"]

class AdminAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAudit
        fields = '__all__'

class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True)
    reservaslot = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = ["id","estado","total_min","titular_nombre","titular_email","titular_tel",
                  "nota","created_at","servicios","reservaslot","cancelled_by"]

    def get_reservaslot(self, obj):
        rs = obj.reservaslot.first()
        return {"slot_id": rs.slot_id, "profesional_id": rs.profesional_id} if rs else None
