from datetime import datetime
from django.utils.dateparse import parse_date
from rest_framework.generics import ListAPIView, CreateAPIView, RetrieveAPIView
from rest_framework.exceptions import ValidationError
from .models import Slot, Reserva
from .serializers import SlotSerializer, ReservaCreateSerializer, ReservaDetailSerializer

class SlotsPorDiaView(ListAPIView):
    serializer_class = SlotSerializer

    def get_queryset(self):
        profesional_id = self.request.query_params.get("profesional_id")
        fecha_str = self.request.query_params.get("fecha")
        if not profesional_id or not fecha_str:
            raise ValidationError({"params":"profesional_id y fecha son requeridos"})
        fecha = parse_date(fecha_str)
        if not fecha:
            raise ValidationError({"fecha":"Formato inválido YYYY-MM-DD"})
        return Slot.objects.filter(profesional_id=profesional_id, fecha=fecha).order_by("inicio")

class ReservaCreateView(CreateAPIView):
    serializer_class = ReservaCreateSerializer

class ReservaDetailView(RetrieveAPIView):
    queryset = Reserva.objects.all()
    serializer_class = ReservaDetailSerializer
    lookup_field = "pk"
