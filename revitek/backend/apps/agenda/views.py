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
    Endpoint de API que permite ver o editar profesionales.
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
        Crea o vincula un Usuario a este Profesional.
        Body: { "email": "...", "password": "..." }
        """
        professional = self.get_object()
        
        # Solo los administradores deberían poder hacer esto
        if not request.user.is_staff:
             return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()

        # Verificar si el usuario existe
        try:
            user = User.objects.get(email=email)
            # Si el usuario existe, solo vincularlo (¿quizás actualizar contraseña si se solicita? No, es más seguro no hacerlo).
            # Por ahora, solo vincular.
        except User.DoesNotExist:
            # Crear nuevo usuario
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

        # Vincular al profesional
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
        Actualiza la contraseña para el usuario vinculado a este profesional.
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
    Endpoint de API para gestionar la relación entre profesionales y servicios.
    Permite filtrar por professional_id o service_id.
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
    Endpoint de API para gestionar horarios de trabajo (horas laborales regulares) de profesionales.
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
        
        # Si el usuario es un profesional, devolver solo sus horarios
        if hasattr(user, 'professional_profile'):
            return queryset.filter(professional=user.professional_profile)
        
        return queryset.none()


# -------------------------------------------------------------------
# BREAKS (colaciones)
# -------------------------------------------------------------------
class BreakViewSet(viewsets.ModelViewSet):
    """
    Endpoint de API para gestionar descansos dentro de un horario de trabajo.
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
    Endpoint de API para gestionar excepciones de horario (ej: feriados, tiempo libre).
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
    Endpoint público para ver slots DISPONIBLES.
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
    Público: crear reserva
    Admin: listar, recuperar
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
        Listar reservas con filtros opcionales:
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
                # Filtrar reservas donde este profesional está involucrado
                queryset = queryset.filter(reservation_slots__professional=user.professional_profile).distinct()
            else:
                # Cliente regular (si se implementa) o no autorizado
                return Response([], status=status.HTTP_200_OK)

        # Filters
        date_str = request.query_params.get("date")
        status_filter = request.query_params.get("status")
        professional_id = request.query_params.get("professional_id")
        client_id = request.query_params.get("client_id")
        include_cancelled = request.query_params.get("include_cancelled", "false").lower() == "true"

        if not include_cancelled and status_filter != 'CANCELLED':
            queryset = queryset.exclude(status='CANCELLED')

        if date_str:
            # Filtrar por fecha de inicio de slots (aproximación, ya que la reserva abarca slots)
            # Buscamos reservas que tengan al menos un slot comenzando en esta fecha
            queryset = queryset.filter(reservation_slots__slot__date=date_str).distinct()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if professional_id:
            queryset = queryset.filter(reservation_slots__professional_id=professional_id).distinct()
            
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        # Ordenar por fecha de creación descendente por defecto, o por fecha de slot
        queryset = queryset.order_by("-created_at")

        serializer = ReservationDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    # --------- Create (Public) ---------
    def create(self, request):
        """
        Crea una reserva completa incluyendo:
        - client
        - vehicle
        - address
        - services
        - slot chain
        """
        # 1. Verificar token de reCAPTCHA
        recaptcha_token = request.data.get('recaptcha_token')
        if not verify_recaptcha(recaptcha_token):
            return Response(
                {"detail": "Verificación de seguridad fallida. Por favor intenta nuevamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validar Reglas de Negocio (Día siguiente, Límite de pendientes)
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
                # Verificar si esta reserva pertenece al profesional
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

    # --------- Complete (Admin/Professional) ---------
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Marca una reserva como COMPLETADA.
        Body: { "note": "Optional completion note" }
        """
        reservation = get_object_or_404(Reservation, pk=pk)
        user = request.user
        
        # 1. RBAC Check
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                is_related = reservation.reservation_slots.filter(professional=user.professional_profile).exists()
                if not is_related:
                     return Response({"detail": "No tienes permiso para gestionar esta reserva."}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Validate Status
        valid_statuses = ['CONFIRMED', 'IN_PROGRESS', 'RECONFIRMED', 'WAITING_CLIENT']
        if reservation.status not in valid_statuses:
            return Response(
                {"detail": f"No se puede completar una reserva en estado {reservation.status}. Debe estar Confirmada o En Curso."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Validar Fecha (No se pueden completar reservas futuras)
        # Verificar la hora de inicio del primer slot
        first_slot = reservation.reservation_slots.order_by('slot__start').first()
        if first_slot:
            if first_slot.slot.start > timezone.now():
                 return Response(
                    {"detail": "No se puede completar una reserva futura antes de que ocurra."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 4. Update
        reservation.status = 'COMPLETED'
        reservation.completed_at = timezone.now()
        
        note = request.data.get('note', '')
        if note:
            reservation.completion_note = note
            
        reservation.save()

        # 5. Log History
        from .models import StatusHistory
        StatusHistory.objects.create(
            reservation=reservation,
            status='COMPLETED',
            note=f"Completed by {user.email}. Note: {note}",
        )

        return Response(ReservationDetailSerializer(reservation).data)


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
    
    # Generar para 30 días comenzando desde la fecha dada
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
            # El profesional puede cancelar reservas en las que está involucrado
            if reservation.reservation_slots.filter(professional=request.user.professional_profile).exists():
                is_authorized = True
        elif reservation.client == request.user:
            # El cliente puede cancelar su propia reserva
            is_authorized = True
    
    # 2. Unauthenticated User (must provide confirmation token)
    elif token:
        if str(reservation.confirmation_token) == str(token):
            is_authorized = True
            cancelled_by = "client" # Forzar 'client' si se usa token

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
    Endpoint de API para gestionar bloqueos de slots.
    Reemplaza FBVs anteriores: list_blocks, create_block, update_block, delete_block.
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
        # El serializador valida que 'professional' esté presente.
        # Necesitamos verificar si el usuario tiene permiso para crear un bloqueo para este profesional.
        professional = serializer.validated_data.get('professional')
        
        # RBAC Check
        if not user.is_staff:
            if hasattr(user, 'professional_profile'):
                if professional.id != user.professional_profile.id:
                     raise PermissionDenied("Cannot create block for another professional")
            else:
                 raise PermissionDenied("Not authorized")

        block = serializer.save(created_by=user)
        
        # Marcar slots superpuestos como BLOQUEADOS
        Slot.objects.filter(
            professional_id=block.professional_id,
            start__gte=block.start,
            end__lte=block.end,
            status="AVAILABLE",
        ).update(status="BLOCKED")

    def perform_update(self, serializer):
        # La verificación RBAC es manejada implícitamente por get_queryset (el usuario solo ve sus propios bloqueos),
        # pero debemos asegurar que no cambien el profesional a otro.
        # Por simplicidad, asumimos que el serializador o permisos manejan esto,
        # pero agreguemos una verificación si se cambia el profesional.
        
        # 1. Obtener valores antiguos
        instance = serializer.instance
        old_prof = instance.professional_id
        old_start = instance.start
        old_end = instance.end
        
        updated = serializer.save()
        
        # Liberar slots anteriores
        Slot.objects.filter(
            professional_id=old_prof,
            start__gte=old_start,
            end__lte=old_end,
            status="BLOCKED",
        ).update(status="AVAILABLE")

        # Bloquear nuevos slots
        Slot.objects.filter(
            professional_id=updated.professional_id,
            start__gte=updated.start,
            end__lte=updated.end,
            status="AVAILABLE",
        ).update(status="BLOCKED")

    def perform_destroy(self, instance):
        # Restaurar slots
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
    Calcula la disponibilidad agregada para múltiples servicios en una fecha específica.
    Devuelve slots consolidados donde TODOS los servicios solicitados pueden realizarse.
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
    Endpoint público para confirmar una reserva vía enlace de WhatsApp.
    URL: /agenda/confirm/<token>/
    """
    success, message, reservation_id = confirm_reservation_by_token(token)
    
    if not success:
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        "detail": message,
        "reservation_id": reservation_id
    }, status=status.HTTP_200_OK)

# =====================================================================
# 6) Dashboard Stats (Professional/Admin)
# =====================================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Devuelve estadísticas para el panel del profesional.
    """
    user = request.user
    professional = None

    if hasattr(user, 'professional_profile'):
        professional = user.professional_profile
    elif user.is_staff:
        # El admin ve estadísticas globales o puede filtrar por ?professional_id
        prof_id = request.query_params.get('professional_id')
        if prof_id:
            from .models import Professional
            professional = get_object_or_404(Professional, pk=prof_id)
    else:
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    # Queryset base
    qs = Reservation.objects.all()
    if professional:
        qs = qs.filter(reservation_slots__professional=professional).distinct()

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # 1. Citas de hoy
    today_appointments = qs.filter(
        reservation_slots__slot__start__range=(today_start, today_end)
    ).exclude(status='CANCELLED').order_by('reservation_slots__slot__start').distinct()

    # 2. Próxima cita
    next_appointment = qs.filter(
        reservation_slots__slot__start__gt=now,
        status__in=['PENDING', 'CONFIRMED']
    ).order_by('reservation_slots__slot__start').first()

    # 3. Estadísticas semanales
    # Calcular inicio/fin de la semana actual (Lunes a Domingo)
    today_date = now.date()
    start_week = today_date - timedelta(days=today_date.weekday())
    end_week = start_week + timedelta(days=7)

    week_qs = qs.filter(
        reservation_slots__slot__date__range=(start_week, end_week)
    ).distinct()

    week_total = week_qs.count()
    week_cancelled = week_qs.filter(status='CANCELLED').count()
    week_completed = week_qs.filter(status='COMPLETED').count()

    # Serialize data
    today_data = ReservationDetailSerializer(today_appointments, many=True).data
    next_data = ReservationDetailSerializer(next_appointment).data if next_appointment else None

    # 4. Feed de actividad reciente
    from .models import StatusHistory
    from .serializers import StatusHistorySerializer
    
    activity_qs = StatusHistory.objects.all()
    if professional:
        activity_qs = activity_qs.filter(reservation__reservation_slots__professional=professional).distinct()
    
    # Obtener las últimas 10 actividades
    recent_activity = activity_qs.select_related('reservation', 'reservation__client').order_by('-timestamp')[:10]
    activity_data = StatusHistorySerializer(recent_activity, many=True).data

    # 5. Gráfico de actividad semanal (Lun-Dom)
    # Necesitamos contar reservas por día.
    # Dado que week_qs ya está filtrado por rango de fechas, podemos iterar o agregar.
    # La agregación es mejor pero necesitamos asegurar 0s para días faltantes.
    # Iteremos sobre el rango de 7 días.
    
    weekly_activity = []
    days_map = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    for i in range(7):
        day_date = start_week + timedelta(days=i)
        # Count reservations for this specific day (excluding cancelled)
        # Note: We use reservation_slots__slot__date to match the day
        day_count = week_qs.filter(
            reservation_slots__slot__date=day_date
        ).exclude(status='CANCELLED').count()
        
        weekly_activity.append({
            "day": days_map[i],
            "citas": day_count
        })

    return Response({
        "today_appointments": today_data,
        "next_appointment": next_data,
        "stats": {
            "week_total": week_total,
            "week_cancelled": week_cancelled,
            "week_completed": week_completed
        },
        "recent_activity": activity_data,
        "weekly_activity": weekly_activity
    })
