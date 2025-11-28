# =====================================================================
# Public Whats

App Confirmation Endpoint
# =====================================================================
@api_view(["GET"])
@permission_classes([AllowAny])
def confirm_reservation_via_link(request, token):
    """
    Public endpoint for confirming a reservation via WhatsApp link.
    URL: /agenda/confirm/<token>/
    """
    from .models import Reservation, StatusHistory
    from datetime import timezone as tz
    
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
