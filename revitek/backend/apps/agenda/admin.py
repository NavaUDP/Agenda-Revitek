# apps/agenda/admin.py
from django.contrib import admin
from .models import (
    Professional,
    ProfessionalService,
    WorkSchedule,
    Break,
    ScheduleException,
    Slot,
    SlotBlock,
    Reservation,
    ReservationService,
    ReservationSlot,
    StatusHistory,
    AdminAudit,
)


@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "phone", "active")
    list_filter = ("active", "accepts_reservations")
    search_fields = ("first_name", "last_name", "email", "phone")


@admin.register(ProfessionalService)
class ProfessionalServiceAdmin(admin.ModelAdmin):
    list_display = ("professional", "service", "duration_override_min", "active")
    list_filter = ("active", "professional")
    search_fields = ("professional__first_name", "service__name")


@admin.register(WorkSchedule)
class WorkScheduleAdmin(admin.ModelAdmin):
    list_display = ("professional", "weekday", "start_time", "end_time", "active")
    list_filter = ("weekday", "active")


@admin.register(Break)
class BreakAdmin(admin.ModelAdmin):
    list_display = ("work_schedule", "start_time", "end_time")


@admin.register(ScheduleException)
class ScheduleExceptionAdmin(admin.ModelAdmin):
    list_display = ("professional", "date", "start", "end", "reason", "created_by")
    list_filter = ("date", "professional")


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ("professional", "date", "start", "end", "status")
    list_filter = ("status", "professional", "date")
    search_fields = ("professional__first_name",)


@admin.register(SlotBlock)
class SlotBlockAdmin(admin.ModelAdmin):
    list_display = ("professional", "date", "start", "end", "reason", "created_by")
    list_filter = ("professional", "date")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "status", "total_min", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("client__email", "client__first_name")


admin.site.register(ReservationService)
admin.site.register(ReservationSlot)
admin.site.register(StatusHistory)
admin.site.register(AdminAudit)
