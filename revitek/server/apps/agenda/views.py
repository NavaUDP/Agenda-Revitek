from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Slot, Reserva, SlotBlock
from .serializers import SlotSerializer, ReservaCreateSerializer, ReservaDetailSerializer, SlotBlockSerializer
from .services import generate_daily_slots_for_profesional, cancel_reserva, get_available_slots
from rest_framework.permissions import IsAdminUser, AllowAny


@api_view(["GET"])
@permission_classes([AllowAny])
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
	def get_permissions(self):
		if self.action == 'create':
			self.permission_classes = [AllowAny]
		else:
			self.permission_classes = [IsAdminUser]
		return super().get_permissions()
	
	def list(self,request):
		queryset = Reserva.objects.all().prefetch_related('servicios', 'reservaslot', 'reservaslot__slot', 'cliente')
		serializer = ReservaDetailSerializer(queryset, many=True)
		return Response(serializer.data)

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
@permission_classes([IsAdminUser])
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
@permission_classes([AllowAny])
def cancel_reserva_view(request, pk=None):
	# accept path param pk or payload reserva_id
	reserva_id = pk or request.data.get('reserva_id')
	if not reserva_id:
		return Response({'detail': 'reserva_id required'}, status=400)
	reserva = cancel_reserva(reserva_id, cancelled_by=request.data.get('by','admin'))
	return Response({'id': reserva.id, 'estado': reserva.estado})


# ===== MANEJO DE BLOQUEOS CON SlotBlock =====

@api_view(["GET"])
@permission_classes([AllowAny])
def list_blocks(request):
	"""Lista todos los bloqueos de horario"""
	fecha = request.query_params.get("fecha")
	profesional_id = request.query_params.get("profesional_id")
	
	qs = SlotBlock.objects.all()
	if fecha:
		qs = qs.filter(fecha=fecha)
	if profesional_id:
		qs = qs.filter(profesional_id=profesional_id)
	
	serializer = SlotBlockSerializer(qs.order_by('inicio'), many=True)
	return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_block_view(request):
	"""
	Crea un bloqueo de horario.
	Body: { profesional_id: int, fecha: date, inicio: datetime, fin: datetime, razon: str }
	"""
	from datetime import datetime
	
	serializer = SlotBlockSerializer(data=request.data)
	if serializer.is_valid():
		# Guardar con el usuario que lo creó
		block = serializer.save(created_by=request.user if request.user.is_authenticated else None)
		
		# También marcar los slots correspondientes como BLOQUEADO
		try:
			inicio = datetime.fromisoformat(str(request.data.get('inicio')).replace('Z', '+00:00'))
			fin = datetime.fromisoformat(str(request.data.get('fin')).replace('Z', '+00:00'))
			
			Slot.objects.filter(
				profesional_id=request.data.get('profesional_id'),
				inicio__gte=inicio,
				fin__lte=fin,
				estado='DISPONIBLE'
			).update(estado='BLOQUEADO')
		except Exception as e:
			print(f"Error marcando slots: {e}")
		
		return Response(SlotBlockSerializer(block).data, status=status.HTTP_201_CREATED)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAdminUser])
def update_block_view(request, pk):
	"""
	Actualiza un bloqueo existente.
	"""
	from datetime import datetime
	
	block = get_object_or_404(SlotBlock, pk=pk)
	
	# Guardar valores antiguos para actualizar slots
	old_prof_id = block.profesional_id
	old_inicio = block.inicio
	old_fin = block.fin
	
	serializer = SlotBlockSerializer(block, data=request.data, partial=True)
	if serializer.is_valid():
		updated_block = serializer.save()
		
		# Liberar slots antiguos
		try:
			Slot.objects.filter(
				profesional_id=old_prof_id,
				inicio__gte=old_inicio,
				fin__lte=old_fin,
				estado='BLOQUEADO'
			).update(estado='DISPONIBLE')
			
			# Marcar nuevos slots como bloqueados
			new_inicio = datetime.fromisoformat(str(request.data.get('inicio', updated_block.inicio)).replace('Z', '+00:00'))
			new_fin = datetime.fromisoformat(str(request.data.get('fin', updated_block.fin)).replace('Z', '+00:00'))
			
			Slot.objects.filter(
				profesional_id=updated_block.profesional_id,
				inicio__gte=new_inicio,
				fin__lte=new_fin,
				estado='DISPONIBLE'
			).update(estado='BLOQUEADO')
		except Exception as e:
			print(f"Error actualizando slots: {e}")
		
		return Response(SlotBlockSerializer(updated_block).data)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_block_view(request, pk):
	"""
	Elimina un bloqueo y libera los slots.
	"""
	block = get_object_or_404(SlotBlock, pk=pk)
	
	prof_id = block.profesional_id
	inicio = block.inicio
	fin = block.fin
	
	# Liberar slots
	try:
		Slot.objects.filter(
			profesional_id=prof_id,
			inicio__gte=inicio,
			fin__lte=fin,
			estado='BLOQUEADO'
		).update(estado='DISPONIBLE')
	except Exception as e:
		print(f"Error liberando slots: {e}")
	
	block.delete()
	return Response({'detail': 'Bloqueo eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)

