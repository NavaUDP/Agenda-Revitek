from datetime import datetime, timedelta, time, date
from typing import List, Optional

from django.db import transaction
from django.utils import timezone

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
    """
    total = 0

    for s in services:
        ps = ProfessionalService.objects.select_related("service").get(
            service_id=s["service_id"],
            professional_id=s["professional_id"],
            active=True,
        )
        duration = ps.duration_override_min or ps.service.duration_min
        total += duration

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
# 6) Filtrar slots por breaks
# ----------------------------------------------------------------------
def remove_break_periods(slots, breaks, target_date: date):
    """
    Remove slots that overlap any break defined in WorkSchedule.
    """
    valid = []
    for start, end in slots:
        keep = True
        for br in breaks:
            br_start = datetime.combine(target_date, br.start_time)
            br_end = datetime.combine(target_date, br.end_time)

            if timezone.is_naive(br_start):
                br_start = timezone.make_aware(br_start)
            if timezone.is_naive(br_end):
                br_end = timezone.make_aware(br_end)

            if end > br_start and start < br_end:  # overlap
                keep = False
                break
        if keep:
            valid.append((start, end))
    return valid


# ----------------------------------------------------------------------
# 7) Filtrar slots por ScheduleException
# ----------------------------------------------------------------------
def remove_schedule_exceptions(slots, exceptions):
    """
    Remove slots overlapping special exceptions.
    """
    valid = []
    for start, end in slots:
        keep = True
        for ex in exceptions:
            if end > ex.start and start < ex.end:  # overlap
                keep = False
                break
        if keep:
            valid.append((start, end))
    return valid


# ----------------------------------------------------------------------
# 8) Filtrar slots por SlotBlock existente
# ----------------------------------------------------------------------
def remove_slot_blocks(slots, professional_id: int, target_date: date):
    blocks = SlotBlock.objects.filter(
        professional_id=professional_id,
        date=target_date,
    )

    valid = []
    for start, end in slots:
        keep = True
        for bl in blocks:
            if end > bl.start and start < bl.end:
                keep = False
                break
        if keep:
            valid.append((start, end))

    return valid


# ----------------------------------------------------------------------
# 9) Generar slots finales y persistirlos en DB
# ----------------------------------------------------------------------
def generate_daily_slots(professional_id: int, target_date: date, slot_min: int = 60):
    """
    This is the REAL slot generator with full logic:
    - Applies WorkSchedule for day
    - Removes breaks
    - Removes schedule exceptions
    - Removes slot blocks
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

    # 2) Remover breaks
    breaks = get_breaks_for_work_schedule(ws)
    filtered = remove_break_periods(raw_slots, breaks, target_date)

    # 3) Remover excepciones extraordinarias
    exceptions = get_exceptions_for_day(professional_id, target_date)
    filtered = remove_schedule_exceptions(filtered, exceptions)

    # 4) Remover bloqueos manuales
    filtered = remove_slot_blocks(filtered, professional_id, target_date)

    # 5) Crear slots si no existen y recolectar inicios válidos
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

    # 6) Limpiar slots AVAILABLE que ya no son válidos (stale)
    # Esto ocurre si el horario cambió y quedaron slots huerfanos
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
                # If slot is protected (e.g. used in a past reservation), we can't delete it.
                # We just leave it. It won't be returned as "available" by get_available_slots
                # because get_available_slots filters by status="AVAILABLE".
                # Wait, if we leave it as AVAILABLE, it WILL be returned.
                # We must mark it as BLOCKED or something else if it's invalid.
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

def compute_aggregated_availability(service_ids, date_str):
    """
    Retorna slots disponibles consolidados entre todos los profesionales
    que pueden realizar TODOS los servicios solicitados.

    Filtra por:
    1. Profesionales que tienen asignados TODOS los servicios
    2. Horarios permitidos para TODOS los servicios (ServiceTimeRule)
    """
    from datetime import datetime
    from .models import Slot, ProfessionalService
    from apps.catalog.models import ServiceTimeRule  # ← CAMBIO AQUÍ
    import pytz
    from django.conf import settings

    date = datetime.strptime(date_str, "%Y-%m-%d").date()
    weekday = date.weekday()

    # Obtener timezone local
    local_tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'America/Santiago'))

    # 1) Encontrar profesionales que pueden realizar TODOS los servicios
    if not service_ids:
        return []

    # Profesionales que tienen el primer servicio
    professionals_with_first = set(
        ProfessionalService.objects.filter(
            service_id=service_ids[0],
            active=True
        ).values_list('professional_id', flat=True)
    )

    # Filtrar por cada servicio adicional (intersección)
    qualified_professionals = professionals_with_first
    for service_id in service_ids[1:]:
        professionals_with_service = set(
            ProfessionalService.objects.filter(
                service_id=service_id,
                active=True
            ).values_list('professional_id', flat=True)
        )
        qualified_professionals &= professionals_with_service

    if not qualified_professionals:
        # Ningún profesional puede realizar todos los servicios
        return []

    # 2) Obtener horarios permitidos para TODOS los servicios
    allowed_times_sets = []

    for service_id in service_ids:
        try:
            time_rule = ServiceTimeRule.objects.get(  # ← CAMBIO AQUÍ
                service_id=service_id,
                weekday=weekday
            )
            # Convertir a set de strings "HH:MM"
            allowed_times_sets.append(set(time_rule.allowed_times))  # ← CAMBIO AQUÍ
        except ServiceTimeRule.DoesNotExist:  # ← CAMBIO AQUÍ
            # Si un servicio no tiene restricciones, permitir cualquier hora
            pass

    # Si hay restricciones, hacer intersección de todos los horarios permitidos
    if allowed_times_sets:
        # Intersección: solo horarios que funcionen para TODOS los servicios
        valid_start_times = allowed_times_sets[0]
        for time_set in allowed_times_sets[1:]:
            valid_start_times &= time_set

        if not valid_start_times:
            # No hay horarios que funcionen para todos los servicios
            return []
    else:
        # Si ningún servicio tiene restricciones, permitir cualquier hora
        valid_start_times = None

    # 3) Obtener slots disponibles solo de profesionales calificados
    slots = (
        Slot.objects.filter(
            date=date,
            status="AVAILABLE",
            professional_id__in=qualified_professionals
        )
        .order_by("start")
        .select_related("professional")
    )

    # 4) Filtrar por horarios permitidos
    filtered_slots = []
    for slot in slots:
        # Convertir a hora local  ← CAMBIO AQUÍ
        slot_local = slot.start
        if slot_local.tzinfo is not None:
            slot_local = slot_local.astimezone(local_tz)

        slot_start_time = slot_local.strftime("%H:%M")

        # Si hay restricciones de horario, validar
        if valid_start_times is not None:
            if slot_start_time in valid_start_times:
                filtered_slots.append(slot)
        else:
            # Sin restricciones, agregar todos los slots
            filtered_slots.append(slot)

    # 5) Agrupar por horario (usando hora LOCAL)  ← CAMBIO AQUÍ
    slots_by_time = {}
    for slot in filtered_slots:
        # Convertir a hora local para agrupar
        slot_start_local = slot.start
        slot_end_local = slot.end

        if slot_start_local.tzinfo is not None:
            slot_start_local = slot_start_local.astimezone(local_tz)
            slot_end_local = slot_end_local.astimezone(local_tz)

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

    # 6) Convertir a lista ordenada
    result = sorted(slots_by_time.values(), key=lambda x: x["inicio"])

    return result