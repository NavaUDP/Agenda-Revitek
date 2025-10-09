
from rest_framework import viewsets
from .models import MensajeTemplate, ProgramacionRecordatorio, LogEnvio
from .serializers import MensajeTemplateSerializer, ProgramacionRecordatorioSerializer, LogEnvioSerializer
from .permissions import IsAdminToken


class MensajeTemplateViewSet(viewsets.ModelViewSet):
	queryset = MensajeTemplate.objects.all()
	serializer_class = MensajeTemplateSerializer
	permission_classes = [IsAdminToken]


class ProgramacionRecordatorioViewSet(viewsets.ModelViewSet):
	queryset = ProgramacionRecordatorio.objects.all()
	serializer_class = ProgramacionRecordatorioSerializer
	permission_classes = [IsAdminToken]


class LogEnvioViewSet(viewsets.ModelViewSet):
	queryset = LogEnvio.objects.all()
	serializer_class = LogEnvioSerializer
	permission_classes = [IsAdminToken]
