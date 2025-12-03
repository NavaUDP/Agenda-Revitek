import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revitek.backend.revitek.settings")
django.setup()

from apps.catalog.models import Service, ServiceTimeRule
from apps.agenda.models import WorkSchedule

def delete_invalid_saturday_rules():
    print("Deleting Invalid Saturday Schedules (Weekday=5)...")
    
    # 1. Determine Saturday Working Hours (Max)
    saturday_schedules = WorkSchedule.objects.filter(weekday=5, active=True)
    if not saturday_schedules.exists():
        print("No active WorkSchedules found for Saturday.")
        return

    max_saturday_duration_min = 0
    for ws in saturday_schedules:
        start_min = ws.start_time.hour * 60 + ws.start_time.minute
        end_min = ws.end_time.hour * 60 + ws.end_time.minute
        duration = end_min - start_min
        if duration > max_saturday_duration_min:
            max_saturday_duration_min = duration

    print(f"Max Saturday Duration: {max_saturday_duration_min} min")

    # 2. Find Services with Duration > Max Saturday Duration
    long_services = Service.objects.filter(duration_min__gt=max_saturday_duration_min, active=True)
    
    deleted_count = 0
    for service in long_services:
        # 3. Find and Delete Saturday Rule
        saturday_rule = ServiceTimeRule.objects.filter(service=service, weekday=5).first()
        
        if saturday_rule:
            print(f"Deleting rule for '{service.name}' (Duration: {service.duration_min} min)...")
            saturday_rule.delete()
            deleted_count += 1
        else:
            print(f"Skipping '{service.name}' (No Saturday rule found).")

    print(f"\nSuccessfully deleted {deleted_count} invalid Saturday rules.")

delete_invalid_saturday_rules()
