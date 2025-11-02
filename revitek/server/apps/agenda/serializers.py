# ... (imports) ...
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import serializers
from datetime import timedelta # <-- 1. Importar timedelta
from apps.usuarios.serializers import UserSerializer

from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado
from apps.catalogo.models import ProfesionalServicio
from .services import compute_total_duration # <-- 2. Importar nuestro helper

User = get_user_model()


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id", "profesional", "fecha", "inicio", "fin", "estado"]


class ReservaServicioInSerializer(serializers.Serializer):
    servicio_id = serializers.IntegerField()
    profesional_id = serializers.IntegerField()


class ReservaCreateSerializer(serializers.Serializer):
    cliente = serializers.DictField(required=True) # Aseguramos que 'cliente' venga
    titular_nombre = serializers.CharField(allow_blank=True, required=False) # Mantenemos por compatibilidad
    titular_email = serializers.EmailField(allow_null=True, required=False)
    titular_tel = serializers.CharField(allow_blank=True, required=False)
    profesional_id = serializers.IntegerField()
    servicios = ReservaServicioInSerializer(many=True)
    slot_id = serializers.IntegerField() # Este es el slot INICIAL (ej. 9:00)
    nota = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated):
        with transaction.atomic():
            # ... (Lógica de 'cliente' sin cambios) ...
            cdata = validated.get("cliente") or {}
            cliente = None
            email = (cdata.get("email") or "").strip().lower()
            if email:
                if "cliente_" in email and "@revitek.cl" in email:
                     cliente = None
                else:
                    cliente, _ = User.objects.get_or_create(
                        email=email,
                        defaults={
                            "nombre": (cdata.get("nombre") or "").strip() or "Cliente",
                            "telefono": (cdata.get("telefono") or "").strip() or "",
                        },
                    )

            # --- (INICIO DE LA NUEVA LÓGICA DE MÚLTIPLES SLOTS) ---
            
            # 1. Obtener el slot INICIAL que el usuario seleccionó (ej. 9:00)
            slot_inicial = get_object_or_404(Slot.objects.select_for_update(), pk=validated["slot_id"])
            
            if slot_inicial.estado != "DISPONIBLE":
                raise serializers.ValidationError({"slot_id": "El bloque de inicio no está disponible"})

            # 2. Calcular la duración total requerida (ej. 120 min)
            servicios_in = validated.get("servicios", [])
            requested_prof_id = validated.get("profesional_id")
            
            for s in servicios_in:
                if s["profesional_id"] != requested_prof_id:
                    raise serializers.ValidationError({"servicios": "Servicio asignado a profesional distinto al seleccionado"})
            
            try:
                # Usamos el helper de services.py
                total_min_requeridos = compute_total_duration(servicios_in)
            except ProfesionalServicio.DoesNotExist:
                raise serializers.ValidationError({"servicios": "Uno o más servicios no están asignados al profesional o están inactivos"})

            # 3. Calcular cuántos slots de (ej. 60 min) necesitamos
            slot_base_duration_min = int((slot_inicial.fin - slot_inicial.inicio).total_seconds() // 60)
            if slot_base_duration_min <= 0:
                 raise serializers.ValidationError({"slot_id": "El slot base tiene duración cero."})

            # Redondeo hacia arriba (ej. 120 min / 60 min = 2 slots)
            slots_necesarios_count = (total_min_requeridos + slot_base_duration_min - 1) // slot_base_duration_min
            
            if slots_necesarios_count == 0:
                slots_necesarios_count = 1 # Mínimo 1

            # 4. Encontrar los slots consecutivos
            slots_a_reservar = [slot_inicial]
            current_slot = slot_inicial
            
            for i in range(1, slots_necesarios_count):
                siguiente_inicio_esperado = current_slot.fin
                try:
                    slot_siguiente = Slot.objects.select_for_update().get(
                        profesional_id=requested_prof_id,
                        inicio=siguiente_inicio_esperado,
                        estado="DISPONIBLE" # Asegurarse que el siguiente también esté libre
                    )
                    slots_a_reservar.append(slot_siguiente)
                    current_slot = slot_siguiente
                except Slot.DoesNotExist:
                    # ¡Error! No hay suficientes slots consecutivos disponibles
                    raise serializers.ValidationError({"servicios": f"No hay suficientes bloques disponibles consecutivos. Se necesitan {total_min_requeridos} min ({slots_necesarios_count} bloques) pero solo se encontraron {i}."})

            # 5. Si llegamos aquí, tenemos todos los slots. Creamos la reserva.
            reserva = Reserva.objects.create(
                cliente=cliente,
                nota=validated.get("nota", ""),
                estado="RESERVADO",
                total_min=total_min_requeridos # Guardamos el total real
            )

            # 6. Marcar todos los slots como RESERVADOS y crear los ReservaSlot (ahora múltiples)
            for slot in slots_a_reservar:
                slot.estado = "RESERVADO"
                slot.save(update_fields=["estado"])
                # Se crea una entrada en ReservaSlot por CADA slot consumido
                ReservaSlot.objects.create(
                    reserva=reserva, 
                    slot=slot, 
                    profesional_id=requested_prof_id
                )
            
            # --- (FIN DE LA LÓGICA DE MÚLTIPLES SLOTS) ---

            # ... (lógica de 'ReservaServicio' e 'HistorialEstado' sin cambios) ...
            for s in servicios_in:
                ps = ProfesionalServicio.objects.select_related("servicio").get(
                    profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                )
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                ReservaServicio.objects.create(
                    reserva=reserva, servicio_id=s["servicio_id"], profesional_id=s["profesional_id"], duracion_min_eff=dur
                )
            
            HistorialEstado.objects.create(reserva=reserva, estado="RESERVADO", nota="Creación")
            return reserva


class ReservaDetailServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaServicio
        fields = ["servicio_id", "profesional_id", "duracion_min_eff"]


class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True, read_only=True)
    reservaslot = serializers.SerializerMethodField()
    cliente = UserSerializer(read_only=True)

    class Meta:
        model = Reserva
        fields = ["id", "estado", "total_min", "nota", "created_at", "servicios", "reservaslot", "cancelled_by", "cliente"]

    def get_reservaslot(self, obj):
        # --- (MODIFICACIÓN) ---
        # Ahora 'reservaslot' es una relación 'many', no 'first()'
        # Devolvemos el primer slot (inicio) y el último (fin)
        rs_qs = ReservaSlot.objects.filter(reserva=obj).select_related("slot").order_by('slot__inicio')
        if not rs_qs.exists():
            return None
        
        first_rs = rs_qs.first()
        last_rs = rs_qs.last()
        
        return {
            "slot_id_inicio": getattr(first_rs.slot, "id", None),
            "slot_id_fin": getattr(last_rs.slot, "id", None),
            "inicio": first_rs.slot.inicio.isoformat() if first_rs else None,
            "fin": last_rs.slot.fin.isoformat() if last_rs else None,
            "profesional_id": getattr(first_rs, "profesional_id", None)
        }
        # --- (FIN DE LA MODIFICACIÓN) ---


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado", "timestamp", "nota"]