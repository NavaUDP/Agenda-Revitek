import os
import django
from datetime import datetime, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revitek.backend.revitek.settings")
django.setup()

from apps.catalog.models import Service, ServiceTimeRule
from apps.agenda.models import WorkSchedule, Professional

def analyze_saturday_schedules():
    print("Analyzing Saturday Schedules (Weekday=5)...")
    
    # 1. Determine Saturday Working Hours
    # We'll look at all active WorkSchedules for Saturday to find the maximum possible duration
    saturday_schedules = WorkSchedule.objects.filter(weekday=5, active=True)
    
    if not saturday_schedules.exists():
        print("No active WorkSchedules found for Saturday.")
        return

    max_saturday_duration_min = 0
    schedule_details = []

    for ws in saturday_schedules:
        # Calculate duration
        start = datetime.combine(datetime.today(), ws.start_time)
        end = datetime.combine(datetime.today(), ws.end_time)
        duration = (end - start).total_seconds() / 60
        
        if duration > max_saturday_duration_min:
            max_saturday_duration_min = duration
            
        schedule_details.append(f"Professional {ws.professional}: {ws.start_time}-{ws.end_time} ({int(duration)} min)")

    print(f"\nMax Saturday Duration found: {int(max_saturday_duration_min)} minutes")
    print("Details:")
    for detail in schedule_details:
        print(f"  - {detail}")

    # 2. Find Services with Duration > Max Saturday Duration
    long_services = Service.objects.filter(duration_min__gt=max_saturday_duration_min, active=True)
    
    print(f"\nFound {long_services.count()} services longer than {int(max_saturday_duration_min)} minutes:")
    
    services_to_clean = []

    for service in long_services:
        # 3. Check if they have a rule for Saturday
        saturday_rule = ServiceTimeRule.objects.filter(service=service, weekday=5).first()
        
        if saturday_rule:
            print(f"  [!] Service '{service.name}' (Duration: {service.duration_min} min) has a Saturday rule!")
            print(f"      Allowed Times: {saturday_rule.allowed_times}")
            services_to_clean.append(saturday_rule)
        else:
            print(f"  [OK] Service '{service.name}' (Duration: {service.duration_min} min) has NO Saturday rule.")

    return services_to_clean

analyze_saturday_schedules()
