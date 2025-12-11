"""
Script para verificar la estructura de ReservationSlots en las reservas.
"""
from apps.agenda.models import Reservation, ReservationSlot

print("\n" + "="*80)
print("VERIFICACIÓN DE RESERVATION SLOTS")
print("="*80 + "\n")

# Obtener todas las reservas activas
reservas = Reservation.objects.exclude(status='CANCELLED').order_by('id')

for res in reservas:
    slots = ReservationSlot.objects.filter(reservation=res).select_related('slot', 'professional')
    
    print(f"Reserva #{res.id} - Estado: {res.status}")
    print(f"  Cliente: {res.client.first_name} {res.client.last_name} ({res.client.email})")
    print(f"  Total Slots: {slots.count()}")
    
    if slots.exists():
        first_slot = slots.first()
        print(f"  Profesional asignado: {first_slot.professional.first_name} {first_slot.professional.last_name} (ID: {first_slot.professional_id})")
        print(f"  Fecha/Hora: {first_slot.slot.start.strftime('%Y-%m-%d %H:%M')}")
    else:
        print(f"  ⚠️  NO TIENE SLOTS ASIGNADOS")
    
    print()

print("\n" + "="*80)
print("RESUMEN DE PROFESIONALES")
print("="*80 + "\n")

from apps.agenda.models import Professional

profesionales = Professional.objects.filter(active=True)
for prof in profesionales:
    count = ReservationSlot.objects.filter(professional=prof).values('reservation').distinct().count()
    print(f"Profesional: {prof.first_name} {prof.last_name} (ID: {prof.id}) - {count} reservas")

print()
