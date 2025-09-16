from rest_framework.generics import RetrieveAPIView
from apps.agenda.models import Reserva
from .serializers import EstadoDetalleSerializer

class EstadoReservaView(RetrieveAPIView):
    queryset = Reserva.objects.all().prefetch_related("historial")
    serializer_class = EstadoDetalleSerializer
    lookup_field = "pk"
