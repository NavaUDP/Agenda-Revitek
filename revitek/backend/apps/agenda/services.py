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


# ----------------------------------------------------------------------
# 1) Calcular duración total de una reserva
# ----------------------------------------------------------------------
def compute_total_duration(services: List[dict]) -> int:
    """
    Given a list of:
    {
        "service_id": int,
        "professional_id": int
    }

    Returns total effective minutes
    considering overrides in ProfessionalService.
    Optimized to use a single DB query.
    """
    if not services:
        return 0

    from django.db.models import Q
    
    # Build query for all pairs
    query = Q()
    for s in services:
        query |= Q(service_id=s["service_id"], professional_id=s["professional_id"])
    
    if not query:
        return 0

    # Fetch all needed objects in one go
    ps_objects = ProfessionalService.objects.select_related("service").filter(query, active=True)
    
    # Map for O(1) lookup: (service_id, professional_id) -> ProfessionalService
    ps_map = {(ps.service_id, ps.professional_id): ps for ps in ps_objects}
    
    total = 0
    for s in services:
        key = (s["service_id"], s["professional_id"])
        if key not in ps_map:
            # Maintain original behavior: raise error if not found
            raise ProfessionalService.DoesNotExist(f"ProfessionalService not found for {key}")
        
        ps = ps_map[key]
        total += (ps.duration_override_min or ps.service.duration_min)

    return total


# ----------------------------------------------------------------------
# 2) Obtener WorkSchedule aplicable para un profesional en una fecha dada
# ----------------------------------------------------------------------
def get_work_schedule_for_date(professional_id: int, target_date: date) -> Optional[WorkSchedule]:
    """
    Returns the active WorkSchedule for the given weekday.
    Monday = 0 … Sunday = 6
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
    Generates the base chronological sequence of slots for the day.
    Yields (start, end)
    """
    slots = []
    current = start_dt

    while current + timedelta(minutes=slot_min) <= end_dt:
        slots.append((current, current + timedelta(minutes=slot_min)))
        current += timedelta(minutes=slot_min)

    return slots


# ----------------------------------------------------------------------
# 6) [REMOVED] Obsolete filter functions (logic moved to generate_daily_slots)
# ----------------------------------------------------------------------



# ----------------------------------------------------------------------
# 9) Generar slots finales y persistirlos en DB
# ----------------------------------------------------------------------
def generate_daily_slots(professional_id: int, target_date: date, slot_min: int = 60):
    """
    This is the REAL slot generator with full logic:
    - Applies WorkSchedule for day
    - Removes breaks, exceptions, and blocks in a single pass
    - Saves final slots in DB
    - Cleans up stale AVAILABLE slots that are no longer valid
    """

    ws = get_work_schedule_for_date(professional_id, target_date)
    
    # If no schedule, we should probably clean up ALL available slots for this day
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

    # 2) Collect all busy intervals (breaks, exceptions, blocks)
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

    # 3) Filter slots in one pass
    filtered = []
    for start, end in raw_slots:
        is_blocked = False
        for b_start, b_end in busy_intervals:
            # Check overlap: (StartA < EndB) and (EndA > StartB)
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

    # 5) Limpiar slots AVAILABLE que ya no son válidos (stale)
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
    Cancels a reservation:
    - Marks reservation as CANCELLED
    - Frees its slots
    - Triggers slot regeneration for affected dates to ensure consistency
    """
    reservation = Reservation.objects.select_for_update().get(pk=reservation_id)

    reservation.status = "CANCELLED"
    reservation.cancelled_by = cancelled_by
    reservation.save(update_fields=["status", "cancelled_by"])

    refresh_targets = set()

    # free slots
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
    Calculates consolidated availability for multiple services.
    Refactored from monolithic function to improve readability and maintainability.
    """
    def __init__(self, service_ids, date_str):
        self.service_ids = service_ids
        self.date_str = date_str
        self.date = datetime.strptime(date_str, "%Y-%m-%d").date()
        self.weekday = self.date.weekday()
        self.local_tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'America/Santiago'))
        
        # State
        self.qualified_professionals = set()
        self.valid_start_times = None # None means "any time"
        self.slots_by_prof = {}
        self.filtered_slots = []

    def compute(self):
        if not self.service_ids:
            return []

        # 1. Find professionals who can perform ALL services
        if not self._find_qualified_professionals():
            return []

        # 2. Determine common allowed start times (intersection of rules)
        if not self._determine_common_time_rules():
            return []

        # 3. Fetch available slots for these professionals
        self._fetch_candidate_slots()

        # 4. Filter slots by duration and continuity
        self._filter_slots_by_duration_and_continuity()

        # 5. Group and format results
        return self._format_results()

    def _find_qualified_professionals(self):
        """
        Identifies professionals assigned to ALL requested services.
        """
        # Start with professionals for the first service
        first_service_id = self.service_ids[0]
        candidates = set(
            ProfessionalService.objects.filter(
                service_id=first_service_id,
                active=True
            ).values_list('professional_id', flat=True)
        )

        # Intersect with professionals for remaining services
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
        Calculates the intersection of allowed start times for all services.
        Returns False if intersection is empty (impossible to book).
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
                # No restriction for this service
                pass

        if allowed_times_sets:
            # Intersect all sets
            common_times = allowed_times_sets[0]
            for time_set in allowed_times_sets[1:]:
                common_times &= time_set
            
            if not common_times:
                return False # No common times
            
            self.valid_start_times = common_times
        else:
            self.valid_start_times = None # Any time allowed
            
        return True

    def _fetch_candidate_slots(self):
        """
        Fetches AVAILABLE slots for qualified professionals on the target date.
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

        # Group by professional
        for slot in slots:
            if slot.professional_id not in self.slots_by_prof:
                self.slots_by_prof[slot.professional_id] = []
            self.slots_by_prof[slot.professional_id].append(slot)

    def _filter_slots_by_duration_and_continuity(self):
        """
        Checks if consecutive slots exist to cover the total required duration.
        """
        for prof_id, prof_slots in self.slots_by_prof.items():
            total_duration = self._calculate_total_duration_for_prof(prof_id)
            
            # Sort slots by time (should be already sorted by DB, but safety first)
            prof_slots.sort(key=lambda s: s.start)

            for i, start_slot in enumerate(prof_slots):
                # 1. Check Time Rule
                if not self._check_time_rule(start_slot):
                    continue

                # 2. Check Duration & Continuity
                if self._check_continuity(prof_slots, i, total_duration):
                    self.filtered_slots.append(start_slot)

    def _calculate_total_duration_for_prof(self, prof_id):
        """
        Calculates total duration for the requested services for a specific professional.
        """
        total = 0
        # We could optimize this by pre-fetching ProfessionalServices in __init__ 
        # but for now we rely on the fact that we already filtered professionals.
        # To avoid N+1 inside this loop, we could fetch all relevant ProfessionalServices once.
        # But let's keep it simple for this refactor step or use the optimized compute_total_duration logic?
        # Actually, let's do a quick fetch here or assume standard duration if not critical.
        # Better: fetch all relevant ProfessionalServices for these qualified pros and services.
        
        # For this specific method, let's just query. It's N queries where N = qualified_pros * services.
        # Optimization: Fetch all PS for qualified_pros AND service_ids in one go in __init__.
        # For now, let's leave the query but note it.
        
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
                return False # Gap found
            
            current_check_start = subsequent_slot.end
            if current_check_start >= required_end_time:
                return True
                
        return False

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

        return sorted(slots_by_time.values(), key=lambda x: x["inicio"])


def compute_aggregated_availability(service_ids, date_str):
    """
    Wrapper for AvailabilityCalculator.
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
def confirm_reservation_by_token(token: str):
    """
    Validates token and confirms reservation.
    Returns (success, message, reservation_id)
    """
    from .models import Reservation, StatusHistory
    from django.utils import timezone
    
    try:
        reservation = Reservation.objects.get(confirmation_token=token)
    except Reservation.DoesNotExist:
        return False, "Link de confirmación inválido o expirado.", None
    
    # Check if token has expired
    if reservation.token_expires_at and reservation.token_expires_at < timezone.now():
        return False, "Este link de confirmación ha expirado. Por favor contacta al administrador.", None
    
    # Check if already confirmed/reconfirmed
    if reservation.status in ["CONFIRMED", "RECONFIRMED"]:
        return True, "Esta reserva ya fue confirmada anteriormente.", reservation.id
        
    # Check if cancelled (e.g. expired)
    if reservation.status == "CANCELLED":
        return False, "Esta reserva ha sido cancelada o expiró. Por favor contacta al administrador.", None
    
    # Update status to CONFIRMED (Standardized)
    old_status = reservation.status
    reservation.status = "CONFIRMED"
    
    # Flag to prevent signal loop
    reservation._confirmed_via_link = True
    
    reservation.save(update_fields=["status"])
    
    # Log history
    StatusHistory.objects.create(
        reservation=reservation,
        status="RECONFIRMED",
        note=f"Re-confirmed by client via WhatsApp link (previous status: {old_status})"
    )
    
    return True, "¡Reserva confirmada exitosamente!", reservation.id


# ----------------------------------------------------------------------
# 16) Crear Reserva (Transacción Completa)
# ----------------------------------------------------------------------
def create_reservation_transaction(validated_data):
    """
    Handles the complex logic of creating a reservation:
    - Client creation/update
    - Vehicle/Address creation
    - Slot validation & locking
    - Reservation creation & linking
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
                    # Safeguard: Don't overwrite with masked last name (e.g. "P.")
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
            # Safeguard: Ignore masked plates (containing '*')
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
            number = (address_data.get("number") or "").strip() # Initialize number here
            
            # Safeguard: Ignore masked streets
            if street and '*' not in street:
                # If street is not masked, then we can use the number
                number = (address_data.get("number") or "").strip()
            else:
                # If street is masked or empty, we should not use the number from input
                street = "" # Effectively ignore the street
                number = "" # And ignore the number
            
            commune = (address_data.get("commune") or "").strip()
            region = (address_data.get("region") or "").strip()
            complement = (address_data.get("complement") or "").strip()

            if street: # This check now relies on the potentially cleared 'street' variable
                commune_id = address_data.get("commune_id")
                commune_obj = None
                if commune_id:
                        commune_obj = Commune.objects.filter(id=commune_id).first()
                
                # Fallback: try to find by name if provided (optional, but good for robustness)
                if not commune_obj and commune:
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
            note="Reservation created (Pending Confirmation)",
        )

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