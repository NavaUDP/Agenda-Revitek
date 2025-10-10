from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Servicio, ProfesionalServicio
from .serializers import ServicioSerializer, ProfesionalServicioSerializer


class ServicioViewSet(viewsets.ReadOnlyModelViewSet):
	queryset = Servicio.objects.filter(activo=True)
	serializer_class = ServicioSerializer

	def list(self, request, *args, **kwargs):
		profesional_id = request.query_params.get("profesional_id")
		if profesional_id:
			ps = ProfesionalServicio.objects.filter(profesional_id=profesional_id, activo=True).select_related('servicio')
			data = []
			for p in ps:
				data.append({
					"servicio": ServicioSerializer(p.servicio).data,
					"duracion_eff": p.duracion_override_min or p.servicio.duracion_min,
					"activo": p.activo,
				})
			return Response(data)
		return super().list(request, *args, **kwargs)


class ProfesionalServicioViewSet(viewsets.ModelViewSet):
	queryset = ProfesionalServicio.objects.all()
	serializer_class = ProfesionalServicioSerializer

	@action(detail=False, methods=["post"])
	def asignar(self, request):
		serializer = ProfesionalServicioSerializer(data=request.data)
		if serializer.is_valid():
			ps = ProfesionalServicio.objects.create(**serializer.validated_data)
			return Response(ProfesionalServicioSerializer(ps).data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

