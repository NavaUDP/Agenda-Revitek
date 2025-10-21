from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Slot, Reserva
from .serializers import SlotSerializer, ReservaCreateSerializer, ReservaDetailSerializer
from .services import generate_daily_slots_for_profesional, cancel_reserva, get_available_slots
from rest_framework.permissions import IsAdminUser


@api_view(["GET"])
def list_slots(request):
	profesional_id = request.query_params.get("profesional_id")
	fecha = request.query_params.get("fecha")
	qs = Slot.objects.filter(estado="DISPONIBLE")
	if profesional_id:
		qs = qs.filter(profesional_id=profesional_id)
	if fecha:
		qs = qs.filter(fecha=fecha)
	serializer = SlotSerializer(qs.order_by('inicio'), many=True)
	return Response(serializer.data)


class ReservaViewSet(viewsets.ViewSet):
	def create(self, request):
		serializer = ReservaCreateSerializer(data=request.data)
		if serializer.is_valid():
			reserva = serializer.create(serializer.validated_data)
			out = ReservaDetailSerializer(reserva)
			return Response(out.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def retrieve(self, request, pk=None):
		reserva = get_object_or_404(Reserva, pk=pk)
		serializer = ReservaDetailSerializer(reserva)
		return Response(serializer.data)


@api_view(["POST"])
def generate_slots(request):
	# admin-only in production; kept simple here
	profesional_id = request.data.get('profesional_id')
	fecha = request.data.get('fecha')
	if not profesional_id or not fecha:
		return Response({'detail': 'profesional_id and fecha required'}, status=400)
	from datetime import datetime
	fecha_parsed = datetime.fromisoformat(fecha).date()
	slots = generate_daily_slots_for_profesional(profesional_id, fecha_parsed)
	return Response(SlotSerializer(slots, many=True).data)


@api_view(["POST"])
def cancel_reserva_view(request, pk=None):
	# accept path param pk or payload reserva_id
	reserva_id = pk or request.data.get('reserva_id')
	if not reserva_id:
		return Response({'detail': 'reserva_id required'}, status=400)
	reserva = cancel_reserva(reserva_id, cancelled_by=request.data.get('by','admin'))
	return Response({'id': reserva.id, 'estado': reserva.estado})

