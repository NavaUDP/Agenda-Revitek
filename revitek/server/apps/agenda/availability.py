from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from datetime import datetime


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def aggregated_availability(request):
    """Return aggregated available slots for a given date and a list of service ids.

    Request JSON: { "services": [1,2], "fecha": "YYYY-MM-DD" }

    Response: [{ "inicio": iso, "fin": iso, "profes": [ids], "slot_ids": [ids] }, ...]
    """
    services = request.data.get('services')
    fecha = request.data.get('fecha')
    if not services or not isinstance(services, list) or len(services) == 0:
        return Response({'detail': 'services (non-empty list) required'}, status=400)
    if not fecha:
        return Response({'detail': 'fecha required (YYYY-MM-DD)'}, status=400)

    try:
        fecha_parsed = datetime.fromisoformat(fecha).date()
    except Exception:
        return Response({'detail': 'invalid fecha format'}, status=400)

    # Deferred imports to avoid circular dependencies at module import time
    from apps.catalogo.models import ProfesionalServicio
    from .models import Slot
    from .services import generate_daily_slots_for_profesional

    # For each service, find active professionals that provide it
    prof_sets = []
    for sid in services:
        qs = ProfesionalServicio.objects.filter(servicio_id=sid, activo=True).values_list('profesional_id', flat=True)
        prof_sets.append(set(qs))

    if not prof_sets:
        return Response([], status=200)

    # compute intersection: professionals able to perform ALL requested services
    common = set.intersection(*prof_sets) if prof_sets else set()
    if not common:
        return Response([], status=200)

    # ensure daily slots exist for those professionals (generator may create slots)
    for pid in common:
        try:
            generate_daily_slots_for_profesional(pid, fecha_parsed)
        except Exception:
            # ignore generation errors for now
            pass

    # collect available slots for common professionals on the date
    qs = Slot.objects.filter(estado='DISPONIBLE', fecha=fecha_parsed, profesional_id__in=list(common)).order_by('inicio')

    # aggregate by inicio
    map = {}
    for s in qs:
        key = s.inicio.isoformat()
        if key not in map:
            map[key] = {'inicio': s.inicio.isoformat(), 'fin': s.fin.isoformat(), 'profes': [], 'slot_ids': []}
        map[key]['profes'].append(s.profesional_id)
        map[key]['slot_ids'].append(s.id)

    out = sorted(map.values(), key=lambda x: x['inicio'])
    return Response(out)
