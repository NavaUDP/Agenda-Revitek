from django.test import TestCase
from .models import MensajeTemplate, ProgramacionRecordatorio, LogEnvio

class MensajeTemplateTest(TestCase):
    def test_create_template(self):
        template = MensajeTemplate.objects.create(nombre="Test", contenido="Hola", canal="whatsapp")
        self.assertTrue(template.pk)
        self.assertEqual(template.canal, "whatsapp")

class ProgramacionRecordatorioTest(TestCase):
    def test_create_recordatorio(self):
        # Minimal test, should be expanded with Reserva fixture
        recordatorio = ProgramacionRecordatorio.objects.create(fecha_envio="2025-10-10T10:00:00Z")
        self.assertTrue(recordatorio.pk)

class LogEnvioTest(TestCase):
    def test_create_log(self):
        # Minimal test, should be expanded with ProgramacionRecordatorio fixture
        log = LogEnvio.objects.create(exito=True)
        self.assertTrue(log.pk)
