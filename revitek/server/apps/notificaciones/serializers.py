from rest_framework import serializers
from .models import MensajeTemplate, ProgramacionRecordatorio, LogEnvio

class MensajeTemplateSerializer(serializers.ModelSerializer):
	class Meta:
		model = MensajeTemplate
		fields = '__all__'

class ProgramacionRecordatorioSerializer(serializers.ModelSerializer):
	class Meta:
		model = ProgramacionRecordatorio
		fields = '__all__'

class LogEnvioSerializer(serializers.ModelSerializer):
	class Meta:
		model = LogEnvio
		fields = '__all__'
