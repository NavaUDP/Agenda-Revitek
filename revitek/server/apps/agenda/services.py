from datetime import timedelta
from typing import List
from apps.catalogo.models import ProfesionalServicio


def compute_total_duration(servicios: List[dict]) -> int:
    """Given a list of {'servicio_id', 'profesional_id'} return total minutes considering overrides."""
    total = 0
    for s in servicios:
        ps = ProfesionalServicio.objects.select_related('servicio').get(
            profesional_id=s['profesional_id'], servicio_id=s['servicio_id'], activo=True
        )
        dur = ps.duracion_override_min or ps.servicio.duracion_min
        total += dur
    return total


def generate_available_slots(profesional_id: int, start_date, days: int = 30):
    """Stub: generate availability for a professional over next `days` days.
    For now this is a placeholder; production implementation should use
    `apps.profesionales.CalendarioLaboral`, `Descanso`, and existing `Slot`s to
    compute free blocks and avoid overbooking.
    """
    # TODO: implement real generator using CalendarioLaboral and Descanso
    return []
from datetime import datetime, timedelta, time, date
from django.utils import timezone
from .models import Slot, Reserva, ReservaSlot
from apps.profesionales.models import Profesional


def generate_daily_slots_for_profesional(profesional_id, for_date: date, slot_min=60):
    """
    (RESTAURADO A LA LÓGICA ORIGINAL)
    Create availability slots for a professional on a given date if none exist.
    """
    prof = Profesional.objects.get(pk=profesional_id)
    start = datetime.combine(for_date, time(hour=9, minute=0))
    end = datetime.combine(for_date, time(hour=17, minute=0))
    # naive -> make aware
    if timezone.is_naive(start):
        start = timezone.make_aware(start)
        end = timezone.make_aware(end)

    slots = []
    cur = start
    # Bucle restaurado para crear slots de 60 min (o slot_min)
    while cur + timedelta(minutes=slot_min) <= end:
        fin = cur + timedelta(minutes=slot_min)
        s, created = Slot.objects.get_or_create(profesional_id=profesional_id, inicio=cur, defaults={
            'fecha': for_date, 'fin': fin, 'estado': 'DISPONIBLE'
        })
        slots.append(s)
        cur = fin
    return slots


def get_available_slots(profesional_id=None, fecha=None):
    qs = Slot.objects.filter(estado='DISPONIBLE')
    if profesional_id:
        qs = qs.filter(profesional_id=profesional_id)
    if fecha:
        qs = qs.filter(fecha=fecha)
    return qs.order_by('inicio')


def cancel_reserva(reserva_id, cancelled_by='admin'):
    reserva = Reserva.objects.get(pk=reserva_id)
    reserva.estado = 'CANCELADO'
    reserva.cancelled_by = cancelled_by
    reserva.save(update_fields=['estado','cancelled_by'])
    # free slot
    rs = reserva.reservaslot.first()
    if rs:
        slot = rs.slot
        slot.estado = 'DISPONIBLE'
        slot.save(update_fields=['estado'])
    return reserva
