from django.shortcuts import render, get_object_or_404
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
import requests
from datetime import datetime, date, timedelta

from .models import (
    Slot,
    Reservation,
    SlotBlock,
    Professional,
    ProfessionalService,
    WorkSchedule,
    Break,
    ScheduleException,
)
from .serializers import (
    SlotSerializer,
    ReservationCreateSerializer,
    ReservationDetailSerializer,
    SlotBlockSerializer,
    ProfessionalSerializer,
    ProfessionalServiceSerializer,
    WorkScheduleSerializer,
    BreakSerializer,
    ScheduleExceptionSerializer
)
from .services import (
    generate_daily_slots,
    generate_slots_range,
    get_available_slots,
    cancel_reservation,
)


# =====================================================================
# reCAPTCHA Verification Helper
# =====================================================================
def verify_recaptcha(token: str) -> bool:
    """
    Verify reCAPTCHA v3 token with Google.
    Returns True if verification succeeds and score > 0.5
    """
    print(f"🔍 Verificando reCAPTCHA... Token recibido: {token[:20] if token else 'None'}...")
    
    if not token:
        print("❌ No se recibió token de reCAPTCHA")
        return False
    
    secret_key = getattr(settings, 'RECAPTCHA_SECRET_KEY', None)
    if not secret_key:
        # If not configured, allow (for development)
        return True
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': secret_key,
                'response': token
            },
            timeout=5
        )
        result = response.json()
        
        # Check if verification succeeded and score is acceptable
        success = result.get('success', False)
        score = result.get('score', 0.0)
        
        # Log for debugging
        if not success:
            print(f"❌ reCAPTCHA verification failed: {result.get('error-codes')}")
        elif score < 0.5:
            print(f"⚠️  reCAPTCHA score too low: {score}")
        else:
            print(f"✅ reCAPTCHA verified - Score: {score}")
        
        return success and score >= 0.5
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        # In case of API error, allow (fail-open for better UX)
        return True


# -------------------------------------------------------------------
# PROFESIONALES
# -------------------------------------------------------------------
class ProfessionalViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows professionals to be viewed or edited.
    """
    queryset = Professional.objects.filter(active=True)
    serializer_class = ProfessionalSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        professional = serializer.save()
        
        # 1. Create default WorkSchedule (Mon-Fri 09-18, Sat 09-14)
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

        # 2. Generate slots for the next 30 days
        from .services import generate_slots_range
        today = datetime.now().date()
        generate_slots_range(professional.id, today, days=30)


# -------------------------------------------------------------------
# SERVICIOS ↔ PROFESIONAL (asignaciones)
# -------------------------------------------------------------------
class ProfessionalServiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing the relationship between professionals and services.
    Allows filtering by professional_id or service_id.
    """
    queryset = ProfessionalService.objects.all()
    serializer_class = ProfessionalServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtrado personalizado por query params.
        Permite filtrar por professional_id y service_id.
        """
        queryset = super().get_queryset()

        # Filtrar por professional_id si se proporciona
        professional_id = self.request.query_params.get('professional_id')
        if professional_id is not None:
            queryset = queryset.filter(professional_id=professional_id)

        # Filtrar por service_id si se proporciona
        service_id = self.request.query_params.get('service_id')
        if service_id is not None:
            queryset = queryset.filter(service_id=service_id)

        return queryset


# -------------------------------------------------------------------
# HORARIOS DE TRABAJO
# -------------------------------------------------------------------
class WorkScheduleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing work schedules (regular working hours) for professionals.
    """
    queryset = WorkSchedule.objects.all()
    serializer_class = WorkScheduleSerializer
    permission_classes = [IsAuthenticated]


# -------------------------------------------------------------------
# BREAKS (colaciones)
# -------------------------------------------------------------------
class BreakViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing breaks within a work schedule.
    """
    queryset = Break.objects.all()
    serializer_class = BreakSerializer
    permission_classes = [IsAuthenticated]


# -------------------------------------------------------------------
# EXCEPCIONES (vacaciones, clases, eventos)
# -------------------------------------------------------------------
class ScheduleExceptionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing schedule exceptions (e.g., holidays, time off).
    """
    queryset = ScheduleException.objects.all()
    serializer_class = ScheduleExceptionSerializer
    permission_classes = [IsAuthenticated]


# =====================================================================
# 1) List Available Slots
# =====================================================================
@api_view(["GET"])
@permission_classes([AllowAny])
def list_slots(request):
    """
    Public endpoint to view AVAILABLE slots.
    Filters:
    - ?professional_id=#
    - ?date=YYYY-MM-DD
    """
    professional_id = request.query_params.get("professional_id")
    date_str = request.query_params.get("date")

    qs = get_available_slots(
        professional_id=professional_id,
        date_filter=date_str,
    )

    serializer = SlotSerializer(qs, many=True)
    return Response(serializer.data)


# =====================================================================
# 2) Reservation ViewSet
# =====================================================================
class ReservationViewSet(viewsets.ViewSet):
    """
    Public: create reservation
    Admin: list, retrieve
    """

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [AllowAny]
        else:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()

    # --------- List (Admin only) ---------
    def list(self, request):
        # Exclude cancelled reservations to reduce calendar clutter
        queryset = Reservation.objects.exclude(status='CANCELLED').prefetch_related(
            "services",
            "reservation_slots",
            "reservation_slots__slot",
            "client",
        )

        serializer = ReservationDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    # --------- Create (Public) ---------
    def create(self, request):
        """
        Creates a full reservation including:
        - client
        - vehicle
        - address
        - services
        - slot chain
        """
        # 1. Validate "next day" restriction
        slot_id = request.data.get("slot_id")
        if slot_id:
            try:
                slot = Slot.objects.get(pk=slot_id)
                
                from django.utils import timezone
                current_date = timezone.now().date()
                slot_date = slot.start.date()
                
                # Cannot book for today or past
                if slot_date <= current_date:
                     return Response(
                        {"detail": "Las reservas deben hacerse con al menos 1 día de anticipación."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            except Slot.DoesNotExist:
                pass # Serializer will handle missing/invalid slot

        # 2. Verify reCAPTCHA token
        recaptcha_token = request.data.get('recaptcha_token')
        if not verify_recaptcha(recaptcha_token):
            return Response(
                {"detail": "Verificación de seguridad fallida. Por favor intenta nuevamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Limit PENDING reservations per client (anti-abuse)
        client_data = request.data.get('client', {})
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
                return Response(
                    {"detail": "Ya tienes una reserva pendiente. Por favor espera la confirmación antes de crear otra."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = ReservationCreateSerializer(data=request.data)

        if serializer.is_valid():
            reservation = serializer.save()
            return Response(
                ReservationDetailSerializer(reservation).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --------- Retrieve (Admin only) ---------
    def retrieve(self, request, pk=None):
        reservation = get_object_or_404(Reservation, pk=pk)
        serializer = ReservationDetailSerializer(reservation)
        return Response(serializer.data)

    # --------- Partial Update (Admin only) ---------
    def partial_update(self, request, pk=None):
        reservation = get_object_or_404(Reservation, pk=pk)
        
        new_status = request.data.get("status")
        if new_status:
            old_status = reservation.status
            reservation.status = new_status
            reservation.save(update_fields=["status"])
            
            # Log history
            from .models import StatusHistory
            StatusHistory.objects.create(
                reservation=reservation,
                status=new_status,
                note=f"Status changed from {old_status} to {new_status} by admin",
            )

        serializer = ReservationDetailSerializer(reservation)
        return Response(serializer.data)


# =====================================================================
# 3) Generate Slots (Admin)
# =====================================================================
@api_view(["POST"])
@permission_classes([IsAdminUser])
def generate_slots(request):
    """
    Body:
    {
        "professional_id": int,
        "date": "YYYY-MM-DD"
    }
    """
    professional_id = request.data.get("professional_id")
    date_str = request.data.get("date")

    if not professional_id or not date_str:
        return Response(
            {"detail": "professional_id and date are required"},
            status=400,
        )

    try:
        target_date = datetime.fromisoformat(date_str).date()
    except Exception:
        return Response({"detail": "Invalid date format"}, status=400)

    from .services import generate_slots_range
    
    # Generate for 30 days starting from the given date
    slots = generate_slots_range(professional_id, target_date, days=30)
    return Response(SlotSerializer(slots, many=True).data)


# =====================================================================
# 4) Cancel Reservation
# =====================================================================
@api_view(["POST"])
@permission_classes([AllowAny])  # allow clients to cancel their own reservation
def cancel_reservation_view(request, pk=None):
    """
    Path param or body:
    - /api/agenda/reservations/{id}/cancel/
    - { "reservation_id": X, "by": "client" | "admin" }
    """
    reservation_id = pk or request.data.get("reservation_id")
    cancelled_by = request.data.get("by", "admin")

    if not reservation_id:
        return Response({"detail": "reservation_id required"}, status=400)

    reservation = cancel_reservation(reservation_id, cancelled_by=cancelled_by)
    return Response(
        {"id": reservation.id, "status": reservation.status},
        status=200,
    )


# =====================================================================
# 5) Slot Blocks (Admin CRUD-like)
# =====================================================================
@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_blocks(request):
    """
    Lists slot blocks.
    Filters: ?professional_id, ?date
    """
    professional_id = request.query_params.get("professional_id")
    date_str = request.query_params.get("date")

    qs = SlotBlock.objects.all()
    if professional_id:
        qs = qs.filter(professional_id=professional_id)
    if date_str:
        qs = qs.filter(date=date_str)

    serializer = SlotBlockSerializer(qs.order_by("start"), many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_block(request):
    """
    Creates a SlotBlock.
    Body:
    {
        "professional": id,
        "date": "YYYY-MM-DD",
        "start": "YYYY-MM-DDTHH:MM",
        "end": "YYYY-MM-DDTHH:MM",
        "reason": "...",
    }
    """
    serializer = SlotBlockSerializer(data=request.data)

    if serializer.is_valid():
        block = serializer.save(created_by=request.user)

        # Mark overlapping slots as BLOCKED
        try:
            Slot.objects.filter(
                professional_id=block.professional_id,
                start__gte=block.start,
                end__lte=block.end,
                status="AVAILABLE",
            ).update(status="BLOCKED")
        except Exception as e:
            print("Error blocking slots:", e)

        return Response(
            SlotBlockSerializer(block).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAdminUser])
def update_block(request, pk):
    """
    Updates a SlotBlock and adjusts affected slots.
    """
    block = get_object_or_404(SlotBlock, pk=pk)

    # Backup old values
    old_prof = block.professional_id
    old_start = block.start
    old_end = block.end

    serializer = SlotBlockSerializer(block, data=request.data, partial=True)

    if serializer.is_valid():
        updated = serializer.save()

        # Free previous slots
        Slot.objects.filter(
            professional_id=old_prof,
            start__gte=old_start,
            end__lte=old_end,
            status="BLOCKED",
        ).update(status="AVAILABLE")

        # Block new slots
        Slot.objects.filter(
            professional_id=updated.professional_id,
            start__gte=updated.start,
            end__lte=updated.end,
            status="AVAILABLE",
        ).update(status="BLOCKED")

        return Response(SlotBlockSerializer(updated).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_block(request, pk):
    """
    Deletes a SlotBlock and restores the affected slots.
    """
    block = get_object_or_404(SlotBlock, pk=pk)

    Slot.objects.filter(
        professional_id=block.professional_id,
        start__gte=block.start,
        end__lte=block.end,
        status="BLOCKED",
    ).update(status="AVAILABLE")

    block.delete()

    return Response({"detail": "Block removed"}, status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def aggregated_availability(request):
    """
    Calculates aggregated availability for multiple services on a specific date.
    Returns consolidated slots where ALL requested services can be performed.
    """
    services = request.data.get("services", [])
    date = request.data.get("date")

    if not services or not date:
        return Response({"error": "services[] and date are required"}, status=400)

    from .services import compute_aggregated_availability

    data = compute_aggregated_availability(services, date)

    return Response(data)



# =====================================================================
# Public WhatsApp Confirmation Endpoint
# =====================================================================
@api_view(["GET"])
@permission_classes([AllowAny])
def confirm_reservation_via_link(request, token):
    """
    Public endpoint for confirming a reservation via WhatsApp link.
    URL: /agenda/confirm/<token>/
    """
    from .models import Reservation, StatusHistory
    
    try:
        reservation = Reservation.objects.get(confirmation_token=token)
    except Reservation.DoesNotExist:
        return Response(
            {"detail": "Link de confirmación inválido o expirado."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if token has expired
    if reservation.token_expires_at and reservation.token_expires_at < timezone.now():
        return Response(
            {"detail": "Este link de confirmación ha expirado. Por favor contacta al administrador."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already confirmed
    if reservation.status == "CONFIRMED":
        return Response(
            {"detail": "Esta reserva ya fue confirmada anteriormente."},
            status=status.HTTP_200_OK
        )
    
    # Update status to CONFIRMED
    old_status = reservation.status
    reservation.status = "CONFIRMED"
    
    # Flag to prevent signal loop
    reservation._confirmed_via_link = True
    
    reservation.save(update_fields=["status"])
    
    # Log history
    StatusHistory.objects.create(
        reservation=reservation,
        status="CONFIRMED",
        note=f"Confirmed via WhatsApp link (previous status: {old_status})"
    )
    
    return Response({
        "detail": "¡Reserva confirmada exitosamente!",
        "reservation_id": reservation.id
    }, status=status.HTTP_200_OK)
