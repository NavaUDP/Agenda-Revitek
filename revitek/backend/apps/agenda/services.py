from datetime import datetime, timedelta, time, date
from typing import List, Optional

from django.db import transaction
from django.utils import timezone
from django.conf import settings
import pytz

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
    ReservationSlot,
)
# from apps.email_service.services import send_reserva_confirmada, send_reserva_cancelada


# ----------------------------------------------------------------------
# 1) Calcular duración total de una reserva
# ----------------------------------------------------------------------
def compute_total_duration(services: List[dict]) -> int:
    """
    Dada una lista de:
    {
        "service_id": int,
        "professional_id": int
    }

    Devuelve el total de minutos efectivos
    considerando anulaciones en ProfessionalService.
    Optimizado para usar una sola consulta a la BD.
    """
    if not services:
        return 0

    from django.db.models import Q
    
    # Construir consulta para todos los pares
    query = Q()
    for s in services:
        query |= Q(service_id=s["service_id"], professional_id=s["professional_id"])
    
    if not query:
        return 0

    # Obtener todos los objetos necesarios de una vez
    ps_objects = ProfessionalService.objects.select_related("service").filter(query, active=True)
    
    # Mapa para búsqueda O(1): (service_id, professional_id) -> ProfessionalService
    ps_map = {(ps.service_id, ps.professional_id): ps for ps in ps_objects}
    
    total = 0
    for s in services:
        key = (s["service_id"], s["professional_id"])
        if key not in ps_map:
            # Mantener comportamiento original: lanzar error si no se encuentra
            raise ProfessionalService.DoesNotExist(f"ProfessionalService not found for {key}")
        
        ps = ps_map[key]
        total += (ps.duration_override_min or ps.service.duration_min)

    return total


# ----------------------------------------------------------------------
# 2) Obtener WorkSchedule aplicable para un profesional en una fecha dada
# ----------------------------------------------------------------------
def get_work_schedule_for_date(professional_id: int, target_date: date) -> Optional[WorkSchedule]:
    """
    Devuelve el WorkSchedule activo para el día de la semana dado.
    Lunes = 0 … Domingo = 6
    """
    weekday = target_date.weekday()
    try:
        return WorkSchedule.objects.get(
            professional_id=professional_id,
            weekday=weekday,
            active=True,
        )
    except WorkSchedule.DoesNotExist:
        return None


# ----------------------------------------------------------------------
# 3) Obtener breaks relevantes dentro de un horario
# ----------------------------------------------------------------------
def get_breaks_for_work_schedule(ws: WorkSchedule):
    return list(ws.breaks.all().order_by("start_time"))


# ----------------------------------------------------------------------
# 4) Obtener excepciones (bloqueos extraordinarios) para el día
# ----------------------------------------------------------------------
def get_exceptions_for_day(professional_id: int, target_date: date):
    return list(
        ScheduleException.objects.filter(
            professional_id=professional_id,
            date=target_date,
        ).order_by("start")
    )


# ----------------------------------------------------------------------
# 5) Generar slots base (no considera breaks ni excepciones aún)
# ----------------------------------------------------------------------
def generate_raw_slots(start_dt: datetime, end_dt: datetime, slot_min: int = 60):
    """
    Genera la secuencia cronológica base de slots para el día.
    Devuelve (inicio, fin)
    """
    slots = []
    current = start_dt

    while current + timedelta(minutes=slot_min) <= end_dt:
        slots.append((current, current + timedelta(minutes=slot_min)))
        current += timedelta(minutes=slot_min)

    return slots


# ----------------------------------------------------------------------
# 9) Generar slots finales y persistirlos en DB
# ----------------------------------------------------------------------
def generate_daily_slots(professional_id: int, target_date: date, slot_min: int = 60):
    """
    Este es el generador de slots REAL con lógica completa:
    - Aplica WorkSchedule para el día
    - Elimina breaks, excepciones y bloqueos en una sola pasada
    - Guarda slots finales en BD
    - Limpia slots AVAILABLE obsoletos que ya no son válidos
    """

    ws = get_work_schedule_for_date(professional_id, target_date)
    
    # Si no hay horario, probablemente deberíamos limpiar TODOS los slots disponibles para este día
    if not ws:
        Slot.objects.filter(
            professional_id=professional_id,
            date=target_date,
            status="AVAILABLE"
        ).delete()
        return []

    # Rango laboral base
    start_dt = datetime.combine(target_date, ws.start_time)
    end_dt = datetime.combine(target_date, ws.end_time)

    if timezone.is_naive(start_dt):
        start_dt = timezone.make_aware(start_dt)
        end_dt = timezone.make_aware(end_dt)

    # 1) Generar slots crudos
    raw_slots = generate_raw_slots(start_dt, end_dt, slot_min)

    # 2) Recolectar todos los intervalos ocupados (breaks, excepciones, bloqueos)
    busy_intervals = []

    # Breaks
    for br in get_breaks_for_work_schedule(ws):
        b_start = datetime.combine(target_date, br.start_time)
        b_end = datetime.combine(target_date, br.end_time)
        if timezone.is_naive(b_start):
            b_start = timezone.make_aware(b_start)
            b_end = timezone.make_aware(b_end)
        busy_intervals.append((b_start, b_end))

    # Exceptions
    for ex in get_exceptions_for_day(professional_id, target_date):
        e_start = ex.start
        e_end = ex.end
        if timezone.is_naive(e_start):
             e_start = timezone.make_aware(e_start)
             e_end = timezone.make_aware(e_end)
        busy_intervals.append((e_start, e_end))

    # Blocks
    blocks = SlotBlock.objects.filter(professional_id=professional_id, date=target_date)
    for bl in blocks:
        bl_start = bl.start
        bl_end = bl.end
        if timezone.is_naive(bl_start):
             bl_start = timezone.make_aware(bl_start)
             bl_end = timezone.make_aware(bl_end)
        busy_intervals.append((bl_start, bl_end))

    # 3) Filtrar slots en una sola pasada
    filtered = []
    for start, end in raw_slots:
        is_blocked = False
        for b_start, b_end in busy_intervals:
            # Verificar superposición: (StartA < EndB) y (EndA > StartB)
            if start < b_end and end > b_start:
                is_blocked = True
                break
        if not is_blocked:
            filtered.append((start, end))

    # 4) Crear slots si no existen y recolectar inicios válidos
    slots_created = []
    valid_start_times = set()

    for start, end in filtered:
        valid_start_times.add(start)
        slot, created = Slot.objects.get_or_create(
            professional_id=professional_id,
            start=start,
            defaults={
                "date": target_date,
                "end": end,
                "status": "AVAILABLE",
            },
        )
        slots_created.append(slot)

    # 5) Limpiar slots AVAILABLE que ya no son válidos (obsoletos)
    existing_slots = Slot.objects.filter(
        professional_id=professional_id,
        date=target_date,
        status="AVAILABLE"
    )

    from django.db.models import ProtectedError
    
    for slot in existing_slots:
        if slot.start not in valid_start_times:
            try:
                slot.delete()
            except ProtectedError:
                slot.status = "BLOCKED"
                slot.save(update_fields=["status"])

    return slots_created


# ----------------------------------------------------------------------
# 10) Obtener slots disponibles (filtrados)
# ----------------------------------------------------------------------
def get_available_slots(professional_id=None, date_filter=None):
    qs = Slot.objects.filter(status="AVAILABLE")
    if professional_id:
        qs = qs.filter(professional_id=professional_id)
    if date_filter:
        qs = qs.filter(date=date_filter)
    return qs.order_by("start")


# ----------------------------------------------------------------------
# 11) Cancelar una reserva
# ----------------------------------------------------------------------
@transaction.atomic
def cancel_reservation(reservation_id: int, cancelled_by: str = "admin"):
    """
    Cancela una reserva:
    - Marca la reserva como CANCELADA
    - Libera sus slots
    - Dispara regeneración de slots para fechas afectadas para asegurar consistencia
    """
    reservation = Reservation.objects.select_for_update().get(pk=reservation_id)

    reservation.status = "CANCELLED"
    reservation.cancelled_by = cancelled_by
    reservation.save(update_fields=["status", "cancelled_by"])

    refresh_targets = set()

    # liberar slots
    for rs in reservation.reservation_slots.all():
        slot = rs.slot
        slot.status = "AVAILABLE"
        slot.save(update_fields=["status"])
        
        # Guardar para regenerar
        refresh_targets.add((rs.professional_id, slot.date))

    # Regenerar slots para asegurar que los slots liberados son válidos
    # (por ejemplo, si el horario del profesional cambió mientras estaba reservado)
    for prof_id, d in refresh_targets:
        generate_daily_slots(prof_id, d)

    for prof_id, d in refresh_targets:
        generate_daily_slots(prof_id, d)

    # Enviar correo de cancelación (DESACTIVADO POR AHORA)
    # try:
    #     send_reserva_cancelada(reservation)
    # except Exception as e:
         # No fallar la transacción si el correo falla
    #     pass

    return reservation


# ----------------------------------------------------------------------
# 12) Generar slots a futuro (ej para un mes)
# ----------------------------------------------------------------------
def generate_slots_range(professional_id: int, start_date: date, days: int = 30):
    out = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        try:
            created = generate_daily_slots(professional_id, d)
            out.extend(created)
        except Exception:
            pass
    return out


def filter_slots_by_service(slots, services, target_date):
    """
    Filtra slots que NO coincidan con los horarios permitidos
    por TODOS los servicios solicitados.

    USA: ServiceTimeRule (no ServiceAllowedTime)
    """
    from apps.catalog.models import ServiceTimeRule

    weekday = target_date.weekday()

    valid_slots = []

    for start, end in slots:
        start_str = start.strftime("%H:%M")

        ok = True
        for service_id in services:
            try:
                time_rule = ServiceTimeRule.objects.get(
                    service_id=service_id,
                    weekday=weekday
                )
                if start_str not in time_rule.allowed_times:
                    ok = False
                    break
            except ServiceTimeRule.DoesNotExist:
                # Si el servicio no define horarios → se permite cualquier hora
                pass

        if ok:
            valid_slots.append((start, end))

    return valid_slots


# Reemplazar la función compute_aggregated_availability en agenda/services.py

# Reemplazar la función compute_aggregated_availability en agenda/services.py

class AvailabilityCalculator:
    """
    Calcula disponibilidad consolidada para múltiples servicios.
    Refactorizado de función monolítica para mejorar legibilidad y mantenibilidad.
    """
    def __init__(self, service_ids, date_str):
        self.service_ids = service_ids
        self.date_str = date_str
        self.date = datetime.strptime(date_str, "%Y-%m-%d").date()
        self.weekday = self.date.weekday()
        self.local_tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'America/Santiago'))
        
        # State
        self.qualified_professionals = set()
        self.valid_start_times = None # None significa "cualquier hora"
        self.slots_by_prof = {}
        self.filtered_slots = []
        self.daily_loads = {} # Para almacenar cargas diarias de profesionales

    def compute(self):
        if not self.service_ids:
            return []

        # 1. Encontrar profesionales que puedan realizar TODOS los servicios
        if not self._find_qualified_professionals():
            return []

        # 2. Determinar horas de inicio permitidas comunes (intersección de reglas)
        if not self._determine_common_time_rules():
            return []

        # 3. Obtener slots disponibles para estos profesionales
        self._fetch_candidate_slots()

        # 4. Filtrar slots por duración y continuidad
        self._filter_slots_by_duration_and_continuity()

        # 5. Calcular cargas diarias para profesionales calificados
        self._calculate_daily_loads()

        # 6. Agrupar y formatear resultados
        return self._format_results()

    def _find_qualified_professionals(self):
        """
        Identifica profesionales asignados a TODOS los servicios solicitados.
        """
        # Comenzar con profesionales para el primer servicio
        first_service_id = self.service_ids[0]
        candidates = set(
            ProfessionalService.objects.filter(
                service_id=first_service_id,
                active=True
            ).values_list('professional_id', flat=True)
        )

        # Intersectar con profesionales para los servicios restantes
        for service_id in self.service_ids[1:]:
            next_candidates = set(
                ProfessionalService.objects.filter(
                    service_id=service_id,
                    active=True
                ).values_list('professional_id', flat=True)
            )
            candidates &= next_candidates
            
            if not candidates:
                return False

        self.qualified_professionals = candidates
        return True

    def _determine_common_time_rules(self):
        """
        Calcula la intersección de horas de inicio permitidas para todos los servicios.
        Devuelve False si la intersección está vacía (imposible reservar).
        """
        from apps.catalog.models import ServiceTimeRule

        allowed_times_sets = []
        for service_id in self.service_ids:
            try:
                time_rule = ServiceTimeRule.objects.get(
                    service_id=service_id,
                    weekday=self.weekday
                )
                allowed_times_sets.append(set(time_rule.allowed_times))
            except ServiceTimeRule.DoesNotExist:
                # Sin restricción para este servicio
                pass

        if allowed_times_sets:
            # Intersectar todos los conjuntos
            common_times = allowed_times_sets[0]
            for time_set in allowed_times_sets[1:]:
                common_times &= time_set
            
            if not common_times:
                return False # Sin horas comunes
            
            self.valid_start_times = common_times
        else:
            self.valid_start_times = None # Cualquier hora permitida
            
        return True

    def _fetch_candidate_slots(self):
        """
        Obtiene slots DISPONIBLES para profesionales calificados en la fecha objetivo.
        """
        slots = (
            Slot.objects.filter(
                date=self.date,
                status="AVAILABLE",
                professional_id__in=self.qualified_professionals
            )
            .order_by("start")
            .select_related("professional")
        )

        # Agrupar por profesional
        for slot in slots:
            if slot.professional_id not in self.slots_by_prof:
                self.slots_by_prof[slot.professional_id] = []
            self.slots_by_prof[slot.professional_id].append(slot)

    def _filter_slots_by_duration_and_continuity(self):
        """
        Verifica si existen slots consecutivos para cubrir la duración total requerida.
        """
        for prof_id, prof_slots in self.slots_by_prof.items():
            total_duration = self._calculate_total_duration_for_prof(prof_id)
            
            # Ordenar slots por tiempo (debería estar ordenado por BD, pero seguridad primero)
            prof_slots.sort(key=lambda s: s.start)

            for i, start_slot in enumerate(prof_slots):
                # 1. Verificar Regla de Tiempo
                if not self._check_time_rule(start_slot):
                    continue

                # 2. Verificar Duración y Continuidad
                if self._check_continuity(prof_slots, i, total_duration):
                    self.filtered_slots.append(start_slot)

    def _calculate_total_duration_for_prof(self, prof_id):
        """
        Calcula la duración total para los servicios solicitados para un profesional específico.
        """
        total = 0
        # Podríamos optimizar esto pre-obteniendo ProfessionalServices en __init__ 
        # pero por ahora confiamos en que ya filtramos profesionales.
        # Para evitar N+1 dentro de este bucle, podríamos obtener todos los ProfessionalServices relevantes una vez.
        # Pero mantengámoslo simple para este paso de refactorización o usemos la lógica optimizada de compute_total_duration?
        # Mejor: obtener todos los PS relevantes para estos pros calificados y servicios.
        # Por ahora, dejemos la consulta pero tomemos nota.
        
        for s_id in self.service_ids:
            try:
                ps = ProfessionalService.objects.get(
                    service_id=s_id,
                    professional_id=prof_id,
                    active=True
                )
                total += (ps.duration_override_min or ps.service.duration_min)
            except ProfessionalService.DoesNotExist:
                continue
        return total

    def _check_time_rule(self, slot):
        if self.valid_start_times is None:
            return True
            
        slot_local = slot.start
        if slot_local.tzinfo is not None:
            slot_local = slot_local.astimezone(self.local_tz)
        
        start_str = slot_local.strftime("%H:%M")
        return start_str in self.valid_start_times

    def _check_continuity(self, slots, start_index, required_duration):
        start_slot = slots[start_index]
        required_end_time = start_slot.start + timedelta(minutes=required_duration)
        current_check_start = start_slot.start
        
        for subsequent_slot in slots[start_index:]:
            if subsequent_slot.start > current_check_start:
                return False # Brecha encontrada
            
            current_check_start = subsequent_slot.end
            if current_check_start >= required_end_time:
                return True
                
        return False

    def _calculate_daily_loads(self):
        """
        Calcula el número de reservas activas para cada profesional calificado en la fecha objetivo.
        Almacena el resultado en self.daily_loads.
        """
        from django.db.models import Count, Q
        
        self.daily_loads = {}
        
        if not self.qualified_professionals:
            return

        # Contar reservas que tienen al menos un slot en esta fecha
        # Filtramos por reservation_slots__slot__date=self.date
        # Y status en [CONFIRMED, PENDING, IN_PROGRESS, RECONFIRMED, WAITING_CLIENT]
        
        active_statuses = ['CONFIRMED', 'PENDING', 'IN_PROGRESS', 'RECONFIRMED', 'WAITING_CLIENT']
        
        # Consultamos objetos Reservation, filtramos por fecha y estado, y agregamos por profesional
        # Nota: Una reserva tiene múltiples slots. Queremos contar RESERVAS, no slots.
        # Pero necesitamos agrupar por profesional.
        # Dado que una reserva está vinculada a un profesional vía ReservationSlot, y todos los slots de una reserva
        # suelen ser con el mismo profesional (impuesto por nuestra lógica), podemos agrupar por reservation_slots__professional.
        
        # Sin embargo, ¿una reserva podría abarcar múltiples días? 
        # El requisito dice "reservas asignadas en la fecha solicitada".
        # Si una reserva comienza ayer y termina mañana, ¿cuenta?
        # Usualmente nos importa la fecha de inicio.
        # Mantengámonos en "reservas que tienen slots en esta fecha".
        
        counts = (
            Reservation.objects
            .filter(
                reservation_slots__slot__date=self.date,
                reservation_slots__professional_id__in=self.qualified_professionals,
                status__in=active_statuses
            )
            .values('reservation_slots__professional_id')
            .annotate(count=Count('id', distinct=True))
        )
        
        for entry in counts:
            self.daily_loads[entry['reservation_slots__professional_id']] = entry['count']

    def _format_results(self):
        slots_by_time = {}
        for slot in self.filtered_slots:
            slot_start_local = slot.start
            slot_end_local = slot.end

            if slot_start_local.tzinfo is not None:
                slot_start_local = slot_start_local.astimezone(self.local_tz)
                slot_end_local = slot_end_local.astimezone(self.local_tz)

            key = (slot_start_local, slot_end_local)
            if key not in slots_by_time:
                slots_by_time[key] = {
                    "inicio": slot_start_local,
                    "fin": slot_end_local,
                    "professionals": [],
                    "slot_ids": []
                }
            slots_by_time[key]["professionals"].append(slot.professional_id)
            slots_by_time[key]["slot_ids"].append(slot.id)

        # Sort professionals by load for each slot
        for key in slots_by_time:
            # Ordenar por carga (asc), luego por ID (asc) para determinismo
            # Vamos a unirlos, ordenar y separar.
            combined = list(zip(slots_by_time[key]["professionals"], slots_by_time[key]["slot_ids"]))
            combined.sort(key=lambda x: (self.daily_loads.get(x[0], 0), x[0]))
            
            slots_by_time[key]["professionals"] = [x[0] for x in combined]
            slots_by_time[key]["slot_ids"] = [x[1] for x in combined]

        return sorted(slots_by_time.values(), key=lambda x: x["inicio"])


def compute_aggregated_availability(service_ids, date_str):
    """
    Envoltorio para AvailabilityCalculator.
    """
    from datetime import datetime
    from .models import Slot, ProfessionalService
    import pytz
    from django.conf import settings
    
    calculator = AvailabilityCalculator(service_ids, date_str)
    return calculator.compute()


# ----------------------------------------------------------------------
# 15) Confirmar reserva por token (Lógica de Negocio)
# ----------------------------------------------------------------------
@transaction.atomic
def confirm_reservation_by_token(token: str):
    """
    Valida token y confirma reserva.
    Devuelve (éxito, mensaje, reservation_id)
    """
    from .models import Reservation, StatusHistory
    from django.utils import timezone
    
    try:
        # Usar select_for_update para bloquear la fila y prevenir condiciones de carrera
        reservation = Reservation.objects.select_for_update().get(confirmation_token=token)
    except Reservation.DoesNotExist:
        return False, "Link de confirmación inválido o expirado.", None
    
    # Verificar si el token ha expirado
    if reservation.token_expires_at and reservation.token_expires_at < timezone.now():
        return False, "Este link de confirmación ha expirado. Por favor contacta al administrador.", None
    
    # Verificar si ya está confirmada/reconfirmada
    if reservation.status in ["CONFIRMED", "RECONFIRMED"]:
        return True, "Esta reserva ya fue confirmada anteriormente.", reservation.id
        
    # Verificar si está cancelada (ej. expirada)
    if reservation.status == "CANCELLED":
        return False, "Esta reserva ha sido cancelada o expiró. Por favor contacta al administrador.", None
    
    # Actualizar estado a CONFIRMED (Estandarizado)
    old_status = reservation.status
    reservation.status = "CONFIRMED"
    
    # Bandera para prevenir bucle de señales
    reservation._confirmed_via_link = True
    
    reservation.save(update_fields=["status"])
    
    # Registrar historial
    StatusHistory.objects.create(
        reservation=reservation,
        status="RECONFIRMED",
        note=f"Reconfirmada por cliente vía WhatsApp (estado anterior: {old_status})"
    )
    
    return True, "¡Reserva confirmada exitosamente!", reservation.id


# ----------------------------------------------------------------------
# 16) Crear Reserva (Transacción Completa)
# ----------------------------------------------------------------------
def create_reservation_transaction(validated_data):
    """
    Maneja la lógica compleja de crear una reserva:
    - Creación/actualización de cliente
    - Creación de Vehículo/Dirección
    - Validación y bloqueo de slots
    - Creación y vinculación de reserva
    """
    from django.db import transaction
    from django.shortcuts import get_object_or_404
    from django.contrib.auth import get_user_model
    from apps.clients.models import Vehicle, Address, Commune
    from .models import (
        Slot, Reservation, ReservationSlot, ReservationService, 
        ProfessionalService, StatusHistory
    )
    from rest_framework.exceptions import ValidationError

    User = get_user_model()

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
                    # Salvaguarda: No sobrescribir con apellido enmascarado (ej. "P.")
                    is_masked = last_name.endswith('.') and len(last_name) <= 3 and client.last_name.startswith(last_name[:-1])
                    if not is_masked:
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
            # Salvaguarda: Ignorar patentes enmascaradas (conteniendo '*')
            if plate and '*' not in plate:
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
            number = (address_data.get("number") or "").strip() # Inicializar número aquí
            
            # Salvaguarda: Ignorar calles enmascaradas
            if street and '*' not in street:
                # Si la calle no está enmascarada, entonces podemos usar el número
                number = (address_data.get("number") or "").strip()
            else:
                # Si la calle está enmascarada o vacía, no deberíamos usar el número de la entrada
                street = "" # Efectivamente ignorar la calle
                number = "" # E ignorar el número
            
            commune = (address_data.get("commune") or "").strip()
            region = (address_data.get("region") or "").strip()
            complement = (address_data.get("complement") or "").strip()

            if street: # This check now relies on the potentially cleared 'street' variable
                commune_id = address_data.get("commune_id")
                commune_obj = None
                if commune_id:
                        commune_obj = Commune.objects.filter(id=commune_id).first()
                
                # Try to find existing address to update or create new
                address_defaults = {
                    "street": street,
                    "number": number,
                    "complement": complement,
                    "commune": commune_obj
                }
                
                address_obj, _ = Address.objects.update_or_create(
                    owner=client,
                    alias=alias,
                    defaults=address_defaults
                )





        # ----------------------------------------------------------
        # 4) VALIDACIÓN DE SLOTS Y SERVICIOS
        # ----------------------------------------------------------
        professional_id = validated_data["professional_id"]
        
        # Lock initial slot
        try:
            slot_initial = Slot.objects.select_for_update().get(pk=validated_data["slot_id"])
        except Slot.DoesNotExist:
             raise ValidationError({"slot_id": "Slot not found."})

        if slot_initial.status != "AVAILABLE":
            raise ValidationError({"slot_id": "Slot is not available."})

        services_in = validated_data.get("services", [])

        # todos los servicios deben apuntar al mismo profesional
        for s in services_in:
            if s["professional_id"] != professional_id:
                raise ValidationError(
                    {"services": "All services must be assigned to the selected professional."}
                )

        try:
            total_required_min = compute_total_duration(services_in)
        except ProfessionalService.DoesNotExist:
            raise ValidationError(
                {"services": "One or more services are not assigned to the professional or are inactive."}
            )

        slot_duration_min = int(
            (slot_initial.end - slot_initial.start).total_seconds() // 60
        )
        if slot_duration_min <= 0:
            raise ValidationError({"slot_id": "Slot base has zero duration."})

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
                raise ValidationError(
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
            note="Reserva creada (Pendiente de confirmación)",
        )

        # Send Confirmation Email (DISABLED FOR NOW)
        # try:
        #     send_reserva_confirmada(reservation)
        # except Exception as e:
        #     # Log error but don't fail transaction
        #     pass

        return reservation


# ----------------------------------------------------------------------
# 13) Crear horario por defecto para profesional
# ----------------------------------------------------------------------
def create_default_schedule(professional):
    """
    Creates default WorkSchedule:
    - Mon-Fri: 09:00 - 18:00
    - Sat: 09:00 - 14:00
    """
    default_schedules = []
    # Mon-Fri
    for weekday in range(5):
        default_schedules.append(
            WorkSchedule(
                professional=professional,
                weekday=weekday,
                start_time=datetime.strptime("09:00", "%H:%M").time(),
                end_time=datetime.strptime("18:00", "%H:%M").time(),
                active=True
            )
        )
    # Saturday
    default_schedules.append(
        WorkSchedule(
            professional=professional,
            weekday=5,
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("14:00", "%H:%M").time(),
            active=True
        )
    )
    WorkSchedule.objects.bulk_create(default_schedules)

    # Generate slots for the next 30 days
    today = datetime.now().date()
    generate_slots_range(professional.id, today, days=30)


# ----------------------------------------------------------------------
# 14) Validar reglas de negocio para reserva
# ----------------------------------------------------------------------
def validate_booking_rules(data):
    """
    Validates business rules for creating a reservation.
    Returns (is_valid, error_message)
    """
    # 1. Validate "next day" restriction
    slot_id = data.get("slot_id")
    if slot_id:
        try:
            slot = Slot.objects.get(pk=slot_id)
            current_date = timezone.now().date()
            slot_date = slot.start.date()
            
            # Cannot book for today or past
            if slot_date <= current_date:
                return False, "Las reservas deben hacerse con al menos 1 día de anticipación."

        except Slot.DoesNotExist:
            pass # Serializer will handle missing/invalid slot

    # 2. Limit PENDING reservations per client (anti-abuse)
    client_data = data.get('client', {})
    email = client_data.get('email', '').strip().lower()
    phone = client_data.get('phone', '').strip()
    
    if email or phone:
        from django.db.models import Q
        
        # Check for existing PENDING reservations with same email OR phone
        pending_filters = Q(status='PENDING')
        email_phone_filters = Q()
        
        if email:
            email_phone_filters |= Q(client__email__iexact=email)
        if phone:
            email_phone_filters |= Q(client__phone=phone)
        
        existing_pending = Reservation.objects.filter(
            pending_filters & email_phone_filters
        ).exists()
        
        if existing_pending:
            return False, "Ya tienes una reserva pendiente. Por favor espera la confirmación antes de crear otra."

    return True, None