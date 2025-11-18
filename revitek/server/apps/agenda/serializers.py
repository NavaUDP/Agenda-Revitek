# revitek/server/apps/agenda/serializers.py
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import serializers
from datetime import timedelta
from apps.usuarios.serializers import UserSerializer
from apps.usuarios.models import Vehiculo, Direccion

from .models import Slot, Reserva, ReservaServicio, ReservaSlot, HistorialEstado, SlotBlock
from apps.catalogo.models import ProfesionalServicio
from .services import compute_total_duration

User = get_user_model()


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id", "profesional", "fecha", "inicio", "fin", "estado"]


class ReservaServicioInSerializer(serializers.Serializer):
    servicio_id = serializers.IntegerField()
    profesional_id = serializers.IntegerField()


class ReservaCreateSerializer(serializers.Serializer):
    # Información del cliente
    cliente = serializers.DictField(required=True)
    
    # Información del vehículo
    vehiculo = serializers.DictField(required=False, allow_null=True)
    
    # Información de la dirección
    direccion = serializers.DictField(required=False, allow_null=True)
    
    # Datos de la reserva
    profesional_id = serializers.IntegerField()
    servicios = ReservaServicioInSerializer(many=True)
    slot_id = serializers.IntegerField()
    nota = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated):
        with transaction.atomic():
            # 1. PROCESAR DATOS DEL CLIENTE
            cdata = validated.get("cliente") or {}
            cliente = None
            email = (cdata.get("email") or "").strip().lower()
            
            # Solo crear/actualizar cliente si tiene un email real
            if email and "cliente_" not in email and "@revitek.cl" not in email:
                # Buscar o crear el cliente
                cliente, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "nombre": (cdata.get("nombre") or "").strip() or "Cliente",
                        "apellido": (cdata.get("apellido") or "").strip() or "",
                        "telefono": (cdata.get("telefono") or "").strip() or "",
                    },
                )
                
                # Si el cliente ya existía, actualizar sus datos
                if not created:
                    cliente.nombre = (cdata.get("nombre") or "").strip() or cliente.nombre
                    cliente.apellido = (cdata.get("apellido") or "").strip() or cliente.apellido
                    cliente.telefono = (cdata.get("telefono") or "").strip() or cliente.telefono
                    cliente.save(update_fields=["nombre", "apellido", "telefono"])

            # 2. PROCESAR VEHÍCULO (si se proporcionó)
            vdata = validated.get("vehiculo")
            if vdata and cliente:
                patente = (vdata.get("patente") or "").strip().upper()
                if patente:
                    # Buscar o crear el vehículo
                    vehiculo, _ = Vehiculo.objects.get_or_create(
                        patente=patente,
                        defaults={
                            "propietario": cliente,
                            "marca": (vdata.get("marca") or "").strip() or "Sin especificar",
                            "modelo": (vdata.get("modelo") or "").strip() or "",
                            "year": vdata.get("year"),
                        }
                    )

            # 3. PROCESAR DIRECCIÓN (si se proporcionó)
            ddata = validated.get("direccion")
            if ddata and cliente:
                direccion_texto = (ddata.get("direccion_completa") or "").strip()
                if direccion_texto:
                    # Intentar parsear la dirección (puedes mejorar esto)
                    Direccion.objects.get_or_create(
                        propietario=cliente,
                        alias=ddata.get("alias") or "Principal",
                        defaults={
                            "calle": direccion_texto,
                            "numero": "",
                            "comuna": ddata.get("comuna") or "",
                            "ciudad": "Santiago",
                        }
                    )

            # 4. LÓGICA DE SLOTS (sin cambios)
            slot_inicial = get_object_or_404(Slot.objects.select_for_update(), pk=validated["slot_id"])
            
            if slot_inicial.estado != "DISPONIBLE":
                raise serializers.ValidationError({"slot_id": "El bloque de inicio no está disponible"})

            servicios_in = validated.get("servicios", [])
            requested_prof_id = validated.get("profesional_id")
            
            for s in servicios_in:
                if s["profesional_id"] != requested_prof_id:
                    raise serializers.ValidationError({"servicios": "Servicio asignado a profesional distinto al seleccionado"})
            
            try:
                total_min_requeridos = compute_total_duration(servicios_in)
            except ProfesionalServicio.DoesNotExist:
                raise serializers.ValidationError({"servicios": "Uno o más servicios no están asignados al profesional o están inactivos"})

            slot_base_duration_min = int((slot_inicial.fin - slot_inicial.inicio).total_seconds() // 60)
            if slot_base_duration_min <= 0:
                raise serializers.ValidationError({"slot_id": "El slot base tiene duración cero."})

            slots_necesarios_count = (total_min_requeridos + slot_base_duration_min - 1) // slot_base_duration_min
            
            if slots_necesarios_count == 0:
                slots_necesarios_count = 1

            slots_a_reservar = [slot_inicial]
            current_slot = slot_inicial
            
            for i in range(1, slots_necesarios_count):
                siguiente_inicio_esperado = current_slot.fin
                try:
                    slot_siguiente = Slot.objects.select_for_update().get(
                        profesional_id=requested_prof_id,
                        inicio=siguiente_inicio_esperado,
                        estado="DISPONIBLE"
                    )
                    slots_a_reservar.append(slot_siguiente)
                    current_slot = slot_siguiente
                except Slot.DoesNotExist:
                    raise serializers.ValidationError({"servicios": f"No hay suficientes bloques disponibles consecutivos. Se necesitan {total_min_requeridos} min ({slots_necesarios_count} bloques) pero solo se encontraron {i}."})

            # 5. CREAR LA RESERVA
            reserva = Reserva.objects.create(
                cliente=cliente,
                nota=validated.get("nota", ""),
                estado="RESERVADO",
                total_min=total_min_requeridos
            )

            # 6. MARCAR SLOTS COMO RESERVADOS
            for slot in slots_a_reservar:
                slot.estado = "RESERVADO"
                slot.save(update_fields=["estado"])
                ReservaSlot.objects.create(
                    reserva=reserva, 
                    slot=slot, 
                    profesional_id=requested_prof_id
                )
            
            # 7. CREAR SERVICIOS DE LA RESERVA
            for s in servicios_in:
                ps = ProfesionalServicio.objects.select_related("servicio").get(
                    profesional_id=s["profesional_id"], servicio_id=s["servicio_id"], activo=True
                )
                dur = ps.duracion_override_min or ps.servicio.duracion_min
                ReservaServicio.objects.create(
                    reserva=reserva, 
                    servicio_id=s["servicio_id"], 
                    profesional_id=s["profesional_id"], 
                    duracion_min_eff=dur
                )
            
            # 8. CREAR HISTORIAL
            HistorialEstado.objects.create(reserva=reserva, estado="RESERVADO", nota="Creación")
            
            return reserva


class ReservaDetailServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaServicio
        fields = ["servicio_id", "profesional_id", "duracion_min_eff"]


class ReservaDetailSerializer(serializers.ModelSerializer):
    servicios = ReservaDetailServicioSerializer(many=True, read_only=True)
    reservaslot = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    vehiculos = serializers.SerializerMethodField()
    direcciones = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = [
            "id", "estado", "total_min", "nota", "created_at", 
            "servicios", "reservaslot", "cancelled_by", 
            "cliente", "vehiculos", "direcciones"
        ]

    def get_cliente(self, obj):
        if not obj.cliente:
            return None
        return {
            "id": obj.cliente.id,
            "email": obj.cliente.email,
            "nombre": obj.cliente.nombre,
            "apellido": obj.cliente.apellido,
            "telefono": obj.cliente.telefono,
        }
    
    def get_vehiculos(self, obj):
        if not obj.cliente:
            return []
        from apps.usuarios.models import Vehiculo
        vehiculos = Vehiculo.objects.filter(propietario=obj.cliente)
        return [{
            "id": v.id,
            "patente": v.patente,
            "marca": v.marca,
            "modelo": v.modelo,
            "year": v.year
        } for v in vehiculos]
    
    def get_direcciones(self, obj):
        if not obj.cliente:
            return []
        from apps.usuarios.models import Direccion
        direcciones = Direccion.objects.filter(propietario=obj.cliente)
        return [{
            "id": d.id,
            "alias": d.alias,
            "calle": d.calle,
            "numero": d.numero,
            "comuna": d.comuna,
            "ciudad": d.ciudad,
            "notas_adicionales": d.notas_adicionales
        } for d in direcciones]

    def get_reservaslot(self, obj):
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


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstado
        fields = ["estado", "timestamp", "nota"]


class SlotBlockSerializer(serializers.ModelSerializer):
    profesional_nombre = serializers.CharField(source='profesional.nombre', read_only=True)
    
    class Meta:
        model = SlotBlock
        fields = ['id', 'profesional', 'profesional_nombre', 'fecha', 'inicio', 'fin', 'razon', 'created_at']
        read_only_fields = ['id', 'created_at']