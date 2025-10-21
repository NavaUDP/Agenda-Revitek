from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.profesionales.models import Profesional
from apps.catalogo.models import Servicio, ProfesionalServicio
from .models import Slot
from datetime import datetime, date, timedelta, time


class AgendaApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.pro = Profesional.objects.create(nombre="Juan Perez", email="juan@example.com")
		self.serv = Servicio.objects.create(nombre="Cambio de aceite", duracion_min=60)
		ProfesionalServicio.objects.create(profesional=self.pro, servicio=self.serv, duracion_override_min=None)
		# create a slot for tomorrow
		tomorrow = date.today() + timedelta(days=1)
		inicio_dt = datetime.combine(tomorrow, time(hour=9, minute=0))
		fin_dt = inicio_dt + timedelta(minutes=60)
		Slot.objects.create(profesional=self.pro, fecha=tomorrow, inicio=inicio_dt, fin=fin_dt, estado="DISPONIBLE")

	def test_list_slots(self):
		resp = self.client.get('/api/agenda/slots', {'profesional_id': self.pro.id, 'fecha': str(date.today() + timedelta(days=1))})
		self.assertEqual(resp.status_code, 200)
		self.assertTrue(isinstance(resp.json(), list))
		self.assertGreaterEqual(len(resp.json()), 1)

	def test_create_reserva(self):
		slots = self.client.get('/api/agenda/slots', {'profesional_id': self.pro.id, 'fecha': str(date.today() + timedelta(days=1))}).json()
		slot_id = slots[0]['id']
		payload = {
			'cliente': {'nombre': 'Cliente Test', 'email': 'cliente@test.com', 'telefono': '1234'},
			'titular_nombre': 'Cliente Test',
			'titular_email': 'cliente@test.com',
			'titular_tel': '1234',
			'profesional_id': self.pro.id,
			'servicios': [{'servicio_id': self.serv.id, 'profesional_id': self.pro.id}],
			'slot_id': slot_id,
			'nota': 'Prueba'
		}
		resp = self.client.post('/api/agenda/reservas/', payload, format='json')
		self.assertEqual(resp.status_code, 201)
		data = resp.json()
		self.assertIn('id', data)

	def test_create_reserva_exceeds_slot(self):
		# create another servicio with long duration and assign to profesional
		serv2 = Servicio.objects.create(nombre="Servicio Largo", duracion_min=90)
		ProfesionalServicio.objects.create(profesional=self.pro, servicio=serv2, duracion_override_min=None)
		slots = self.client.get('/api/agenda/slots', {'profesional_id': self.pro.id, 'fecha': str(date.today() + timedelta(days=1))}).json()
		slot_id = slots[0]['id']
		payload = {
			'cliente': {'nombre': 'Cliente Test', 'email': 'cliente2@test.com', 'telefono': '1234'},
			'titular_nombre': 'Cliente Test',
			'titular_email': 'cliente2@test.com',
			'titular_tel': '1234',
			'profesional_id': self.pro.id,
			'servicios': [
				{'servicio_id': self.serv.id, 'profesional_id': self.pro.id},
				{'servicio_id': serv2.id, 'profesional_id': self.pro.id},
			],
			'slot_id': slot_id,
			'nota': 'Prueba exceso'
		}
		resp = self.client.post('/api/agenda/reservas/', payload, format='json')
		self.assertEqual(resp.status_code, 400)
