# apps/agenda/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReservationViewSet,
    list_slots,
    generate_slots,
    cancel_reservation_view,
    confirm_reservation_via_link,
    SlotBlockViewSet,
    ProfessionalViewSet,
    ProfessionalServiceViewSet,
    WorkScheduleViewSet,
    BreakViewSet,
    ScheduleExceptionViewSet,
    aggregated_availability,
    dashboard_stats
)

router = DefaultRouter()

router.register(r"professionals", ProfessionalViewSet, basename="professional")
router.register(r"professional-services", ProfessionalServiceViewSet, basename="professional-service")
router.register(r"work-schedules", WorkScheduleViewSet, basename="work-schedule")
router.register(r"breaks", BreakViewSet, basename="break")
router.register(r"exceptions", ScheduleExceptionViewSet, basename="schedule-exception")
router.register(r"reservations", ReservationViewSet, basename="reservation")
router.register(r"blocks", SlotBlockViewSet, basename="slot-block")

urlpatterns = [
    # ViewSet URLs
    path("", include(router.urls)),

    # Disponibilidad pública
    path("slots/", list_slots, name="list-slots"),

    # Admin: generación de slots
    path("slots/generate/", generate_slots, name="generate-slots"),

    # Cancelar reserva
    path("reservations/<int:pk>/cancel/", cancel_reservation_view, name="cancel-reservation"),

    # Slot blocks (admin)
    # Bloqueos de slots (admin) - Ahora vía ViewSet en /api/agenda/blocks/
    # path("blocks/", list_blocks, name="list-blocks"),
    # path("blocks/create/", create_block, name="create-block"),
    # path("blocks/<int:pk>/update/", update_block, name="update-block"),
    # path("blocks/<int:pk>/delete/", delete_block, name="delete-block"),
    path("availability/", aggregated_availability, name="aggregated-availability"),
    path("dashboard/", dashboard_stats, name="dashboard-stats"),
    
    # Público: confirmación por WhatsApp
    path("confirm/<uuid:token>/", confirm_reservation_via_link, name="confirm-reservation"),

]
