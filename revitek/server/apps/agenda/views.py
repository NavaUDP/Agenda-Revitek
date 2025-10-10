from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Slot, Reserva
from .serializers import SlotSerializer, ReservaCreateSerializer, ReservaDetailSerializer


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

