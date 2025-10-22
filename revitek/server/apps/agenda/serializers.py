from rest_framework import serializers
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model  # <--- MEJOR MANERA de obtener tu User
from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado, AdminAudit
from apps.catalogo.models import ProfesionalServicio  # Asumo que este existe
from . import services as agenda_services

# Obtenemos el modelo 'User' personalizado que definiste en settings.py
User = get_user_model()


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id", "profesional", "fecha", "inicio", "fin", "estado"]


class ReservaServicioInSerializer(serializers.Serializer):
    servicio_id = serializers.IntegerField()
    profesional_id = serializers.IntegerField()


# --- SERIALIZER DE CLIENTE ANIDADO (PARA MOSTRAR INFO) ---
class UsuarioReservaSerializer(serializers.ModelSerializer):
    """
    Serializer ligero para mostrar los datos del cliente en una reserva.
    """

    class Meta:
        model = User
        fields = ["id", "nombre", "apellido", "email", "telefono"]


class ReservaCreateSerializer(serializers.Serializer):
    cliente = serializers.DictField(required=True)  # {nombre,email,telefono}
    # --- CAMPOS 'titular_' ELIMINADOS ---
    profesional_id = serializers.IntegerField()
    servicios = ReservaServicioInSerializer(many=True)
    slot_id = serializers.IntegerField()
    nota = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated):
        with transaction.atomic():
            cdata = validated.get("cliente")
            cliente = None

            # --- LÓGICA DE USUARIO CORREGIDA ---
            if not cdata or not cdata.get("email"):
                raise serializers.ValidationError({"cliente": "Email del cliente es requerido."})

            # Busca o crea un 'User' (cliente)
            # Usamos update_or_create para actualizar datos si ya existe
            cliente, creado = User.objects.update_or_create(
                email=cdata["email"].strip().lower(),
                defaults={
                    "nombre": cdata.get("nombre", "").strip(),
                    "telefono": cdata.get("telefono", "").strip(),
                    "is_staff": False  # Aseguramos que sea un cliente
                },
            )

            # Si el usuario es nuevo, le ponemos una contraseña "inusable"
            if creado:
                cliente.set_unusable_password()
                cliente.save()

            slot = get_object_or_404(Slot.objects.select_for_update(), pk=validated["slot_id"])
            if slot.estado != "DISPONIBLE":
                raise serializers.ValidationError({"slot_id": "El bloque no está disponible"})

            # (Tu lógica de validación de servicios y profesional es correcta)
            servicios_in = validated.get("servicios", [])
            requested_prof = validated.get("profesional_id")
            for s in servicios_in:
                if s["profesional_id"] != requested_prof:
                    raise serializers.ValidationError(
                        {"servicios": "Servicio asignado a profesional distinto al seleccionado"})

            total_min = agenda_services.compute_total_duration(servicios_in)
            slot_minutes = int((slot.fin - slot.inicio).total_seconds() // 60)
            if total_min > slot_minutes:
                raise serializers.ValidationError(
                    {"servicios": "La suma de duraciones excede la duración del bloque seleccionado"})

            # --- CREACIÓN DE RESERVA CORREGIDA ---
            reserva = Reserva.objects.create(
                cliente=cliente,  # Asignamos el User (cliente)
                nota=validated.get("nota", ""),
                estado="RESERVADO",
                # (Campos 'titular_' ya no existen en el modelo Reserva)
            )

            # (Tu lógica para ReservaSlot y ReservaServicio está perfecta)
            ReservaSlot.objects.create(reserva=reserva, slot=slot, profesional_id=validated["profesional_id"])
            slot.estado = "RESERVADO"
            slot.save(update_fields=["estado"])

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
        fields = ["servicio_id", "profesional_id", "duracion_min_eff"]


class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True, read_only=True)
    reservaslot = serializers.SerializerMethodField()
    # --- CAMBIO IMPORTANTE ---
    # Mostramos el objeto cliente anidado
    cliente = UsuarioReservaSerializer(read_only=True)

    class Meta:
        model = Reserva
        # --- CAMPOS 'titular_' ELIMINADOS ---
        fields = ["id", "estado", "total_min", "cliente",  # <--- AÑADIDO
                  "nota", "created_at", "servicios", "reservaslot", "cancelled_by"]

    def get_reservaslot(self, obj):
        # Corregido: 'reservaslot' es OneToOne, no 'first()'
        try:
            rs = obj.reservaslot
            return {"slot_id": rs.slot_id, "profesional_id": rs.profesional_id} if rs else None
        except ReservaSlot.DoesNotExist:
            return None


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado", "timestamp", "nota"]


class AdminAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAudit
        fields = '__all__'
