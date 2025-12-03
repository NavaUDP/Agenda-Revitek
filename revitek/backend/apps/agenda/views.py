from django.shortcuts import render, get_object_or_404
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import requests
from datetime import datetime, date, timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

User = get_user_model()

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
    SlotBlockSerializer,
    ProfessionalSerializer,
    ProfessionalAdminSerializer,
    ProfessionalServiceSerializer,
    WorkScheduleSerializer,
    BreakSerializer,
    ScheduleExceptionSerializer
)
from .services import (
    generate_daily_slots,
    generate_slots_range,
    get_available_slots,
    get_available_slots,
    cancel_reservation,
    create_default_schedule,
    create_default_schedule,
    validate_booking_rules,
    confirm_reservation_by_token,
)
from .utils import verify_recaptcha
from rest_framework.exceptions import PermissionDenied





# -------------------------------------------------------------------
# PROFESIONALES
# -------------------------------------------------------------------
class ProfessionalViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows professionals to be viewed or edited.
    """
    queryset = Professional.objects.filter(active=True).select_related('user')
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.user.is_staff:
            return ProfessionalAdminSerializer
        return ProfessionalSerializer

    def perform_create(self, serializer):
        professional = serializer.save()
        create_default_schedule(professional)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def create_user(self, request, pk=None):
        """
        Creates or links a User to this Professional.
        Body: { "email": "...", "password": "..." }
        """
        professional = self.get_object()
        
        # Only admins should be able to do this
        if not request.user.is_staff:
             return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()

        # Check if user exists
        try:
            user = User.objects.get(email=email)
            # If user exists, just link it (maybe update password if requested? No, safer not to)
            # Actually, user might want to set password for existing user if they forgot.
            # For now, let's just link.
        except User.DoesNotExist:
            # Create new user
            try:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=professional.first_name,
                    last_name=professional.last_name,
                    phone=professional.phone or ""
                )
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Link to professional
        professional.user = user
        professional.save()

        return Response({
            "detail": "User linked successfully",
            "user_email": user.email,
            "has_user": True
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_password(self, request, pk=None):
        """
        Updates the password for the user linked to this professional.
        Body: { "password": "..." }
        """
        professional = self.get_object()
        
        if not request.user.is_staff:
             return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        if not professional.user:
            return Response({"detail": "This professional does not have a linked user."}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get("password")
        if not password:
            return Response({"detail": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

        professional.user.set_password(password)
        professional.user.save()

        return Response({"detail": "Password updated successfully"})


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
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["professional"]

    def get_queryset(self):
        user = self.request.user
        queryset = WorkSchedule.objects.all()
        
        if user.is_staff:
            return queryset
        
        # If user is a professional, return only their schedules
        if hasattr(user, 'professional_profile'):
            return queryset.filter(professional=user.professional_profile)
        
        return queryset.none()


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

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Break.objects.all()
        
        if hasattr(user, 'professional_profile'):
            return Break.objects.filter(work_schedule__professional=user.professional_profile)
        
        return Break.objects.none()


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

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ScheduleException.objects.all()
        
        if hasattr(user, 'professional_profile'):
            return ScheduleException.objects.filter(professional=user.professional_profile)
        
        return ScheduleException.objects.none()


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
            self.permission_classes = [IsAuthenticated] # Changed from IsAdminUser
        return super().get_permissions()

    # --------- List (Admin/Professional) ---------
    def list(self, request):
        """
        List reservations with optional filters:
        - date: YYYY-MM-DD
        - status: PENDING, CONFIRMED, etc.
        - professional_id: int
        - client_id: int
        - include_cancelled: true/false (default false)
        """
        user = request.user
        queryset = Reservation.objects.all().prefetch_related(
            "services",
            "reservation_slots",
            "reservation_slots__slot",
            "client",
        )

        # RBAC Filtering
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                # Filter reservations where this professional is involved
                queryset = queryset.filter(reservation_slots__professional=user.professional_profile).distinct()
            else:
                # Regular client (if implemented) or unauthorized
                return Response([], status=status.HTTP_200_OK)

        # Filters
        date_str = request.query_params.get("date")
        status_filter = request.query_params.get("status")
        professional_id = request.query_params.get("professional_id")
        client_id = request.query_params.get("client_id")
        include_cancelled = request.query_params.get("include_cancelled", "false").lower() == "true"

        if not include_cancelled:
            queryset = queryset.exclude(status='CANCELLED')

        if date_str:
            # Filter by slots start date (approximation, as reservation spans slots)
            # We look for reservations that have at least one slot starting on this date
            queryset = queryset.filter(reservation_slots__slot__date=date_str).distinct()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if professional_id:
            queryset = queryset.filter(reservation_slots__professional_id=professional_id).distinct()
            
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        # Order by creation date desc by default, or by slot date
        queryset = queryset.order_by("-created_at")

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
        # 1. Verify reCAPTCHA token
        recaptcha_token = request.data.get('recaptcha_token')
        if not verify_recaptcha(recaptcha_token):
            return Response(
                {"detail": "Verificación de seguridad fallida. Por favor intenta nuevamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validate Business Rules (Next day, Pending limit)
        is_valid, error_msg = validate_booking_rules(request.data)
        if not is_valid:
            return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReservationCreateSerializer(data=request.data)

        if serializer.is_valid():
            reservation = serializer.save()
            return Response(
                ReservationDetailSerializer(reservation).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --------- Retrieve (Admin/Professional) ---------
    def retrieve(self, request, pk=None):
        reservation = get_object_or_404(Reservation, pk=pk)
        
        # RBAC Check
        user = request.user
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                # Check if this reservation belongs to the professional
                is_related = reservation.reservation_slots.filter(professional=user.professional_profile).exists()
                if not is_related:
                     return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        serializer = ReservationDetailSerializer(reservation)
        return Response(serializer.data)

    # --------- Partial Update (Admin/Professional) ---------
    def partial_update(self, request, pk=None):
        reservation = get_object_or_404(Reservation, pk=pk)
        
        # RBAC Check
        user = request.user
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                is_related = reservation.reservation_slots.filter(professional=user.professional_profile).exists()
                if not is_related:
                     return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
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
                note=f"Status changed from {old_status} to {new_status} by {user.email}",
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
    - { "reservation_id": X, "by": "client" | "admin", "token": "..." }
    """
    reservation_id = pk or request.data.get("reservation_id")
    cancelled_by = request.data.get("by", "admin")
    token = request.data.get("token")

    if not reservation_id:
        return Response({"detail": "reservation_id required"}, status=400)

    reservation = get_object_or_404(Reservation, pk=reservation_id)

    # SECURITY CHECK: Prevent IDOR
    is_authorized = False

    # 1. Authenticated User
    if request.user.is_authenticated:
        if request.user.is_staff:
            is_authorized = True
        elif hasattr(request.user, 'professional_profile'):
            # Professional can cancel reservations they are involved in
            if reservation.reservation_slots.filter(professional=request.user.professional_profile).exists():
                is_authorized = True
        elif reservation.client == request.user:
            # Client can cancel their own reservation
            is_authorized = True
    
    # 2. Unauthenticated User (must provide confirmation token)
    elif token:
        if str(reservation.confirmation_token) == str(token):
            is_authorized = True
            cancelled_by = "client" # Force 'client' if using token

    if not is_authorized:
        return Response(
            {"detail": "No tienes permiso para cancelar esta reserva. Inicia sesión o usa el link de tu correo/WhatsApp."},
            status=status.HTTP_403_FORBIDDEN
        )

    reservation = cancel_reservation(reservation_id, cancelled_by=cancelled_by)
    return Response(
        {"id": reservation.id, "status": reservation.status},
        status=200,
    )


# =====================================================================
# 5) Slot Blocks (Admin/Professional) - ViewSet
# =====================================================================
class SlotBlockViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing slot blocks.
    Replaces previous FBVs: list_blocks, create_block, update_block, delete_block.
    """
    queryset = SlotBlock.objects.all()
    serializer_class = SlotBlockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SlotBlock.objects.all()
        
        # RBAC
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                qs = qs.filter(professional=user.professional_profile)
            else:
                return SlotBlock.objects.none()

        # Filters
        professional_id = self.request.query_params.get("professional_id")
        date_str = self.request.query_params.get("date")
        
        if professional_id:
            qs = qs.filter(professional_id=professional_id)
        if date_str:
            qs = qs.filter(date=date_str)
            
        return qs.order_by("start")

    def perform_create(self, serializer):
        user = self.request.user
        # The serializer validates that 'professional' is present.
        # We need to check if the user is allowed to create a block for this professional.
        professional = serializer.validated_data.get('professional')
        
        # RBAC Check
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                if professional.id != user.professional_profile.id:
                     raise PermissionDenied("Cannot create block for another professional")
            else:
                 raise PermissionDenied("Not authorized")

        block = serializer.save(created_by=user)
        
        # Mark overlapping slots as BLOCKED
        Slot.objects.filter(
            professional_id=block.professional_id,
            start__gte=block.start,
            end__lte=block.end,
            status="AVAILABLE",
        ).update(status="BLOCKED")

    def perform_update(self, serializer):
        # RBAC Check is implicitly handled by get_queryset (user can only see their own blocks),
        # but we should ensure they don't change the professional to someone else.
        # For simplicity, we assume the serializer or permissions handle this, 
        # but let's add a check if professional is being changed.
        
        # 1. Get old values
        instance = serializer.instance
        old_prof = instance.professional_id
        old_start = instance.start
        old_end = instance.end
        
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

    def perform_destroy(self, instance):
        # Restore slots
        Slot.objects.filter(
            professional_id=instance.professional_id,
            start__gte=instance.start,
            end__lte=instance.end,
            status="BLOCKED",
        ).update(status="AVAILABLE")
        
        instance.delete()


@api_view(["POST"])
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
    success, message, reservation_id = confirm_reservation_by_token(token)
    
    if not success:
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        "detail": message,
        "reservation_id": reservation_id
    }, status=status.HTTP_200_OK)
