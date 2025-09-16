from rest_framework import serializers
from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado
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
        from apps.profesionales.models import Profesional
        from apps.catalogo.models import Servicio

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

            # servicios con overrides
            total_min, total_precio = 0, 0
            for s in validated["servicios"]:
                ps = ProfesionalServicio.objects.select_related("servicio").get(
                    profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                )
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                precio = ps.precio_override if ps.precio_override is not None else ps.servicio.precio_base
                ReservaServicio.objects.create(
                    reserva=reserva, servicio_id=s["servicio_id"], profesional_id=s["profesional_id"],
                    duracion_min_eff=dur, precio_eff=precio
                )
                total_min += dur
                total_precio += float(precio)

            reserva.total_min = total_min
            reserva.total_precio = total_precio
            reserva.save(update_fields=["total_min","total_precio"])

            HistorialEstado.objects.create(reserva=reserva, estado="RESERVADO", nota="Creación")

            return reserva

class ReservaDetailServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaServicio
        fields = ["servicio_id","profesional_id","duracion_min_eff","precio_eff"]

class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True)
    reservaslot = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = ["id","estado","total_min","total_precio","titular_nombre","titular_email","titular_tel","nota",
                  "created_at","servicios","reservaslot"]

    def get_reservaslot(self, obj):
        rs = obj.reservaslot.first()
        return {"slot_id": rs.slot_id, "profesional_id": rs.profesional_id} if rs else None

class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado","timestamp","nota"]
