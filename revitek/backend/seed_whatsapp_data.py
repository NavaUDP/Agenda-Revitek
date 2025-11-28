import os
import django
import sys
from datetime import datetime, time, date

# Setup Django environment
sys.path.append('/home/lucas/universidad/2025-2/TICS2/Agenda-Revitek/revitek/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.agenda.models import Professional, Slot, ProfessionalService
from apps.catalog.models import Service, Category
from apps.clients.models import User

def seed_data():
    print("Seeding data for WhatsApp Bot Test...")
    
    # 0. Ensure Category exists
    category, _ = Category.objects.get_or_create(name="General")

    # 1. Ensure Service exists (Update duration to 120 min)
    service, created = Service.objects.get_or_create(
        name="Lavado Premium",
        defaults={'price': 15000, 'duration_min': 120, 'active': True, 'category': category}
    )
    if not created:
        service.duration_min = 120
        service.save()
    print(f"Service: {service.name} (ID: {service.id}, Duration: {service.duration_min}m)")

    # 2. Ensure Professional exists
    pro, _ = Professional.objects.get_or_create(
        first_name="Juan",
        last_name="Perez",
        defaults={'email': 'juan@revitek.cl', 'active': True}
    )
    print(f"Professional: {pro} (ID: {pro.id})")
    
    # Link Pro to Service
    ProfessionalService.objects.get_or_create(
        professional=pro,
        service=service,
        defaults={'active': True}
    )

    # 3. Create Slots for 03/12/2025 (Two slots: 15:00-16:00 and 16:00-17:00)
    target_date = date(2025, 12, 3)
    
    # Cleanup existing slots for this pro and date to avoid duplicates/confusion
    # First delete linked ReservationSlots to avoid ProtectedError
    from apps.agenda.models import ReservationSlot
    ReservationSlot.objects.filter(slot__professional=pro, slot__date=target_date).delete()
    Slot.objects.filter(professional=pro, date=target_date).delete()
    
    from datetime import timezone as dt_timezone
    
    # Slot 1: 15:00 Santiago = 18:00 UTC
    start_dt1 = datetime(2025, 12, 3, 18, 0, tzinfo=dt_timezone.utc)
    end_dt1 = datetime(2025, 12, 3, 19, 0, tzinfo=dt_timezone.utc)
    
    slot1 = Slot.objects.create(
        professional=pro,
        start=start_dt1,
        date=target_date,
        end=end_dt1,
        status='AVAILABLE'
    )
        
    # Slot 2: 16:00 Santiago = 19:00 UTC
    start_dt2 = datetime(2025, 12, 3, 19, 0, tzinfo=dt_timezone.utc)
    end_dt2 = datetime(2025, 12, 3, 20, 0, tzinfo=dt_timezone.utc)
    
    slot2 = Slot.objects.create(
        professional=pro,
        start=start_dt2,
        date=target_date,
        end=end_dt2,
        status='AVAILABLE'
    )
        
    print(f"Slots created/reset for {target_date}: 15:00 (18:00 UTC) and 16:00 (19:00 UTC)")

    # 4. Ensure User exists with phone
    user_phone = "+56 9 8614 2813"
    user, _ = User.objects.get_or_create(
        email="test_whatsapp@revitek.cl",
        defaults={
            'first_name': 'Lucas Test',
            'phone': user_phone,
            'is_active': True
        }
    )
    # Ensure phone matches what we expect
    user.phone = user_phone
    user.save()
    print(f"User: {user.first_name} ({user.phone})")

if __name__ == "__main__":
    seed_data()
