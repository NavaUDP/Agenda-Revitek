import requests
import json
import logging
from django.conf import settings
from .models import WhatsAppLog
from .messages import BotMessages

logger = logging.getLogger(__name__)

class MetaClient:
    """
    Cliente para interactuar con la API de Meta Cloud (WhatsApp).
    """
    def __init__(self):
        if not settings.WHATSAPP_PHONE_NUMBER_ID:
            raise ValueError("WHATSAPP_PHONE_NUMBER_ID is not set in settings.")
        self.api_url = f"https://graph.facebook.com/v17.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        self.headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

    def send_template(self, to_phone, template_name, language_code="es", components=None, reservation=None):
        """
        Enviar un mensaje de plantilla.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            }
        }
        
        if components:
            payload["template"]["components"] = components

        return self._send_request(payload, reservation, "TEMPLATE")

    def send_text(self, to_phone, body, reservation=None):
        """
        Enviar un mensaje de texto simple.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "text",
            "text": {"body": body}
        }
        return self._send_request(payload, reservation)

    def send_reservation_confirmation_request(self, reservation):
        """
        Enviar un mensaje con botones de Confirmar/Cancelar al cliente.
        """
        if not reservation.client.phone:
            return None

        # Formatear fecha y hora
        # Necesitamos obtener el primer slot para mostrar fecha/hora
        # Corrección: Acceder vía reservation_slots
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"

        service_names = ", ".join([s.service.name for s in reservation.services.all()])

        body_text = BotMessages.CONFIRMATION_INTERACTIVE_BODY.format(
            name=reservation.client.first_name,
            service_names=service_names,
            date=date_str,
            time=time_str
        )

        payload = {
            "messaging_product": "whatsapp",
            "to": reservation.client.phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": body_text
                },
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": f"CONFIRM_RESERVATION_{reservation.id}",
                                "title": "✅ Confirmar Visita"
                            }
                        },
                        {
                            "type": "reply",
                            "reply": {
                                "id": f"CANCEL_RESERVATION_{reservation.id}",
                                "title": "❌ Cancelar"
                            }
                        }
                    ]
                }
            }
        }
        return self._send_request(payload, reservation, message_type='INTERACTIVE')

    def send_booking_approved_notification(self, reservation):
        """
        Enviar un mensaje de plantilla notificando que la reserva ha sido aprobada por el admin.
        Usa plantilla: reservation_confirmation
        """
        if not reservation.client.phone:
            logger.warning(f"Cliente {reservation.client.id} no tiene número de teléfono. No se puede enviar plantilla de aprobación.")
            return None
        
        logger.info(f"Enviando plantilla de aprobación a {reservation.client.phone}")

        # Corrección: Acceder vía reservation_slots
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"

        service_names = ", ".join([s.service.name for s in reservation.services.all()])
        
        # Parámetros de la plantilla (Cuerpo)
        # {{1}} = Nombre Cliente
        # {{2}} = Fecha
        # {{3}} = Hora
        
        components = [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": reservation.client.first_name},
                    {"type": "text", "text": date_str},
                    {"type": "text", "text": time_str},
                ]
            }
        ]

        return self.send_template(
            to_phone=reservation.client.phone,
            template_name="reservation_confirmation",
            language_code="es_CL",
            components=components,
            reservation=reservation
        )

    def send_confirmation_link(self, reservation, token):
        """
        Enviar mensaje de WhatsApp con enlace de confirmación (expiración de 2 horas).
        Esto reemplaza el mensaje de plantilla cuando el admin aprueba.
        """
        if not reservation.client.phone:
            logger.warning("No phone number for reservation confirmation")
            return None
        
        # Obtener detalles de la reserva
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"
        
        service_names = ", ".join([s.service.name for s in reservation.services.all()])
        
        # Enlace de confirmación - por ahora usando localhost, actualizar en producción
        # Producción debería ser: https://tudominio.com/confirmar/{token}
        # Enlace de confirmación
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        confirmation_url = f"{base_url}/confirmar/{token}"
        
        # Enviar mensaje de texto con enlace
        # Enviar mensaje de texto con enlace
        message = BotMessages.CONFIRMATION_LINK_MSG.format(
            service_names=service_names,
            date=date_str,
            time=time_str,
            url=confirmation_url
        )
        
        return self.send_text(reservation.client.phone, message, reservation=reservation)

    def _send_request(self, payload, reservation=None, message_type='text'):
        """
        Método interno para enviar la solicitud y registrarla.
        """
        log = WhatsAppLog.objects.create(
            direction='OUTBOUND',
            message_type=message_type,
            phone_number=payload.get('to'),
            content=payload,
            status='SENT', # Optimistic
            reservation=reservation
        )
        logger.debug(f"Created WhatsAppLog #{log.id}. Sending request to Meta...")

        try:
            response = requests.post(self.api_url, headers=self.headers, json=payload, timeout=10)
            response_data = response.json()
            
            if response.status_code in [200, 201]:
                # Success
                messages = response_data.get('messages', [])
                if messages:
                    log.whatsapp_id = messages[0].get('id')
                log.save()
                return response_data
            else:
                # API Error
                log.status = 'FAILED'
                log.error_message = json.dumps(response_data)
                log.save()
                return None
                
        except Exception as e:
            log.status = 'FAILED'
            log.error_message = str(e)
            log.save()
            return None


class WebhookHandler:
    """
    Maneja payloads de webhook entrantes de Meta.
    """
    def handle_payload(self, payload):
        """
        Punto de entrada principal para procesar datos del webhook.
        """
        entry = payload.get('entry', [])
        for e in entry:
            changes = e.get('changes', [])
            for change in changes:
                value = change.get('value', {})
                
                # 1. Manejar Actualizaciones de Estado (enviado, entregado, leído)
                if 'statuses' in value:
                    self.handle_statuses(value['statuses'])
                
                # 2. Manejar Mensajes Entrantes
                if 'messages' in value:
                    self.handle_messages(value['messages'])

    def handle_statuses(self, statuses):
        for status in statuses:
            whatsapp_id = status.get('id')
            new_status = status.get('status').upper() # sent, delivered, read
            
            # Actualizar log si existe
            try:
                log = WhatsAppLog.objects.get(whatsapp_id=whatsapp_id)
                
                # Mapear estado de Meta a nuestras opciones
                if new_status == 'SENT': log.status = 'SENT'
                elif new_status == 'DELIVERED': log.status = 'DELIVERED'
                elif new_status == 'READ': log.status = 'READ'
                elif new_status == 'FAILED': 
                    log.status = 'FAILED'
                    errors = status.get('errors')
                    if errors:
                        log.error_message = json.dumps(errors)
                
                log.save(update_fields=['status', 'error_message', 'updated_at'])
            except WhatsAppLog.DoesNotExist:
                pass

    def handle_messages(self, messages):
        from apps.agenda.models import Reservation
        from apps.agenda.services import cancel_reservation
        
        client = MetaClient()

        for msg in messages:
            whatsapp_id = msg.get('id')
            from_phone = msg.get('from')
            msg_type = msg.get('type')
            
            # Registrar mensaje entrante
            log = WhatsAppLog.objects.create(
                direction='INBOUND',
                message_type=msg_type.upper(),
                phone_number=from_phone,
                whatsapp_id=whatsapp_id,
                content=msg,
                status='RECEIVED'
            )

            # Manejar Respuestas de Botones (Interactivo)
            if msg_type == 'interactive':
                interactive = msg.get('interactive', {})
                if interactive.get('type') == 'button_reply':
                    button_id = interactive.get('button_reply', {}).get('id')
                    
                    # Formato esperado: "CONFIRM_RESERVATION_<ID>" o "CANCEL_RESERVATION_<ID>"
                    if button_id:
                        parts = button_id.split('_')
                        action = parts[0] # CONFIRM or CANCEL
                        
                        if len(parts) >= 3 and parts[1] == 'RESERVATION':
                            try:
                                res_id = int(parts[2])
                                reservation = Reservation.objects.get(pk=res_id)
                                log.reservation = reservation
                                log.save()

                                if action == 'CONFIRM':
                                    if reservation.status != 'CANCELLED':
                                        reservation.status = 'RECONFIRMED'
                                        reservation.save(update_fields=['status'])
                                        client.send_text(from_phone, BotMessages.CONFIRMATION_SUCCESS, reservation)
                                    else:
                                        client.send_text(from_phone, "Lo sentimos, esta reserva ya estaba cancelada.", reservation)

                                elif action == 'CANCEL':
                                    if reservation.status != 'CANCELLED':
                                        cancel_reservation(reservation.id, cancelled_by="client_whatsapp")
                                        client.send_text(from_phone, BotMessages.CONFIRMATION_CANCELLED, reservation)
                                    else:
                                        client.send_text(from_phone, BotMessages.CONFIRMATION_ALREADY_CANCELLED, reservation)
                            
                            except (Reservation.DoesNotExist, ValueError):
                                client.send_text(from_phone, BotMessages.CONFIRMATION_NOT_FOUND)
            
            # Manejar Clics en Botones de Plantilla (type='button')
            elif msg_type == 'button':
                button_payload = msg.get('button', {}).get('payload')
                context_id = msg.get('context', {}).get('id')
                
                logger.debug(f"Received button click. Payload: {button_payload}, Context: {context_id}")
                
                if context_id:
                    try:
                        # Encontrar el log del mensaje saliente original para obtener la reserva
                        original_log = WhatsAppLog.objects.filter(whatsapp_id=context_id).first()
                        
                        if original_log and original_log.reservation:
                            reservation = original_log.reservation
                            log.reservation = reservation
                            log.save()
                            
                            logger.debug(f"Found reservation #{reservation.id} from context.")

                            # Lógica para "Sí, confirmo" (o cualquier payload positivo)
                            # Asumimos que el botón es para confirmación ya que enviamos una plantilla de confirmación
                            if reservation.status != 'CANCELLED':
                                reservation.status = 'RECONFIRMED'
                                reservation.save(update_fields=['status'])
                                client.send_text(from_phone, BotMessages.CONFIRMATION_SUCCESS, reservation)
                            else:
                                client.send_text(from_phone, BotMessages.CONFIRMATION_ALREADY_CANCELLED, reservation)
                        else:
                            logger.warning("Could not find original log or reservation for this context.")
                            client.send_text(from_phone, BotMessages.CONFIRMATION_NOT_FOUND)
                            
                    except Exception as e:
                        logger.error(f"Error handling button click: {e}")

            # Manejar Texto (Chatbot)
            elif msg_type == 'text':
                bot = ChatBot()
                bot.handle_message(from_phone, msg)


class ChatBot:
    """
    Maneja la lógica conversacional para el Bot de WhatsApp.
    """
    def __init__(self):
        self.client = MetaClient()

    def handle_message(self, phone, message_body):
        from .models import WhatsAppSession
        
        # Obtener o crear sesión
        session, created = WhatsAppSession.objects.get_or_create(phone_number=phone)
        
        # Normalizar entrada
        text = message_body.get('text', {}).get('body', '').strip()
        text_lower = text.lower()
        
        # Comandos Globales (disponibles en cualquier estado)
        if text_lower in ['reset', 'menu', 'inicio', 'volver']:
            session.state = 'MENU'
            session.data = {}
            session.save()
            self.client.send_text(phone, BotMessages.MENU_RESET)
            self.send_menu(phone)
            return
        
        # Comando Cancelar/Salir
        if text_lower in ['cancelar', 'salir', 'cancel']:
            session.state = 'MENU'
            session.data = {}
            session.save()
            self.client.send_text(phone, BotMessages.CANCEL_SUCCESS)
            return
        
        # Comando Ayuda
        if text_lower in ['ayuda', 'help', '?']:
            self.send_help(phone, session.state)
            return

        # Máquina de Estados
        if session.state == 'MENU':
            self.handle_menu_selection(session, text)
        
        elif session.state == 'SELECT_SERVICE':
            self.handle_service_selection(session, text)
            
        elif session.state == 'SELECT_DATE':
            self.handle_date_selection(session, text)
            
        elif session.state == 'SELECT_TIME':
            self.handle_time_selection(session, text)
            
        elif session.state == 'WAITING_FOR_EMAIL':
            self.handle_email_input(session, text)

        elif session.state == 'WAITING_FOR_ADDRESS':
            self.handle_address_input(session, text)
            
        else:
            # Fallback / Disparar en cualquier mensaje
            # Si el usuario envía algo que no reconocemos en un estado específico, o si el estado es MENU
            # por defecto mostramos el menú.
            # Esto asegura que "Hola", "Buenas", etc. disparen el bot.
            self.send_menu(phone)

    def send_menu(self, phone):
        self.client.send_text(phone, BotMessages.MENU_GREETING)

    def handle_menu_selection(self, session, text):
        text_lower = text.lower().strip()
        
        if text == '1' or 'agendar' in text_lower:
            session.state = 'SELECT_SERVICE'
            session.save()
            self.send_service_list(session.phone_number)
            
        elif text == '2' or 'reserva' in text_lower:
            self.check_reservations(session.phone_number)
            
        elif text == '3' or 'ejecutivo' in text_lower or 'humano' in text_lower:
            self.client.send_text(session.phone_number, BotMessages.MENU_HUMAN_HANDOFF)
            session.state = 'MENU'
            session.save()
            
        else:
            self.client.send_text(session.phone_number, BotMessages.UNKNOWN_OPTION)

    def send_service_list(self, phone):
        from apps.catalog.models import Service
        services = Service.objects.filter(active=True).order_by('id')[:20]
        
        msg = BotMessages.SERVICE_LIST_HEADER
        
        for i, service in enumerate(services, 1):
            price_fmt = "{:,.0f}".format(service.price).replace(',', '.')
            msg += f"*{i}.* {service.name}\n   💰 ${price_fmt}\n"
            
        msg += BotMessages.SERVICE_LIST_FOOTER
        self.client.send_text(phone, msg)

    def handle_service_selection(self, session, text):
        from apps.catalog.models import Service
        try:
            idx = int(text) - 1
            services = Service.objects.filter(active=True).order_by('id')[:20]
            
            if 0 <= idx < len(services):
                selected_service = services[idx]
                session.data['service_id'] = selected_service.id
                session.state = 'SELECT_DATE'
                session.save()
                
                price_fmt = "{:,.0f}".format(selected_service.price).replace(',', '.')
                self.client.send_text(session.phone_number, BotMessages.SERVICE_SELECTED.format(
                    service_name=selected_service.name,
                    price=price_fmt
                ))
            else:
                self.client.send_text(session.phone_number, BotMessages.SERVICE_INVALID_OPTION.format(count=len(services)))
        except ValueError:
            self.client.send_text(session.phone_number, BotMessages.SERVICE_FORMAT_ERROR)

    def handle_date_selection(self, session, text):
        from datetime import datetime, timedelta
        try:
            date_obj = datetime.strptime(text, "%d/%m/%Y").date()
            today = datetime.now().date()
            
            # Validación básica: fecha futura
            if date_obj < today:
                self.client.send_text(session.phone_number, BotMessages.DATE_PAST_ERROR.format(
                    next_day=(today + timedelta(days=1)).strftime("%d/%m/%Y")
                ))
                return
            
            # Verificar si la fecha es muy lejana en el futuro (ej., más de 3 meses)
            max_date = today + timedelta(days=90)
            if date_obj > max_date:
                self.client.send_text(session.phone_number, BotMessages.DATE_TOO_FAR_ERROR.format(
                    max_date=max_date.strftime('%d/%m/%Y')
                ))
                return

            session.data['date'] = text
            session.state = 'SELECT_TIME'
            session.save()
            
            # Obtener slots disponibles
            self.send_time_slots(session.phone_number, date_obj)
            
        except ValueError:
            self.client.send_text(session.phone_number, BotMessages.DATE_FORMAT_ERROR)

    def send_time_slots(self, phone, date_obj):
        from apps.agenda.services import compute_aggregated_availability
        
        # Obtener servicio seleccionado de la sesión
        from .models import WhatsAppSession
        try:
            session = WhatsAppSession.objects.get(phone_number=phone)
            service_id = session.data.get('service_id')
        except WhatsAppSession.DoesNotExist:
            self.client.send_text(phone, BotMessages.ERROR_SESSION)
            return

        if not service_id:
            self.client.send_text(phone, BotMessages.SERVICE_NONE_SELECTED)
            return

        # Obtener disponibilidad real
        # compute_aggregated_availability espera lista de service_ids y cadena de fecha "YYYY-MM-DD"
        date_str = date_obj.strftime("%Y-%m-%d")
        available_slots = compute_aggregated_availability([service_id], date_str)
        
        if not available_slots:
            self.client.send_text(phone, BotMessages.DATE_NO_SLOTS.format(date=date_obj.strftime('%d/%m/%Y')))
            return

        # Almacenar slots disponibles en sesión para validación en el siguiente paso
        # Almacenamos una lista simplificada: [{'start': '09:00', 'end': '10:00', 'label': '09:00 AM'}]
        slots_data = []
        msg = BotMessages.TIME_SLOTS_HEADER.format(date=date_obj.strftime('%d/%m/%Y'))

        for i, slot in enumerate(available_slots, 1):
            # slot es un dict: {'inicio': datetime, 'fin': datetime, ...}
            start_dt = slot['inicio']
            end_dt = slot['fin']
            start_str = start_dt.strftime("%H:%M")
            label = start_dt.strftime("%I:%M %p")
            
            slots_data.append({
                'start': start_str,
                'label': label
            })
            
            msg += f"{i}️⃣  {label}\n"
            
            # Limitar a 10 opciones para UX
            if i >= 10:
                msg += "\n_(Mostrando los primeros 10 horarios)_\n"
                break

        session.data['available_slots'] = slots_data
        session.save()

        msg += BotMessages.TIME_SLOTS_FOOTER
        self.client.send_text(phone, msg)

    def handle_time_selection(self, session, text):
        available_slots = session.data.get('available_slots', [])
        
        if not available_slots:
            self.client.send_text(session.phone_number, BotMessages.TIME_SESSION_EXPIRED)
            return

        try:
            idx = int(text) - 1
            if 0 <= idx < len(available_slots):
                selected_slot = available_slots[idx]
                selected_time = selected_slot['start']
                selected_label = selected_slot['label']
                
                # Enviar confirmación de que estamos procesando
                self.client.send_text(session.phone_number, BotMessages.TIME_SELECTED.format(time_label=selected_label))
                
                # Guardar hora
                session.data['time'] = selected_time
                session.save()

                # Verificar si el usuario existe para decidir el siguiente paso
                user = self.find_user_by_phone(session.phone_number)
                
                if not user:
                    # Pedir email
                    session.state = 'WAITING_FOR_EMAIL'
                    session.save()
                    self.client.send_text(session.phone_number, BotMessages.EMAIL_REQUEST)
                else:
                    # Pedir dirección
                    session.state = 'WAITING_FOR_ADDRESS'
                    session.save()
                    self.client.send_text(session.phone_number, BotMessages.ADDRESS_REQUEST)
            else:
                self.client.send_text(session.phone_number, BotMessages.TIME_INVALID_OPTION.format(count=len(available_slots)))
        except ValueError:
            self.client.send_text(session.phone_number, BotMessages.TIME_FORMAT_ERROR)

    def find_user_by_phone(self, phone_number):
        from apps.clients.models import User
        
        # Normalizar teléfono entrante: eliminar no dígitos
        raw_phone = ''.join(filter(str.isdigit, phone_number))
        
        # Heurística: Coincidir últimos 8 dígitos (estándar chileno sin prefijo +569 son 8 dígitos)
        # Esto maneja:
        # +56 9 8614 2813 -> 86142813
        # 9 8614 2813 -> 86142813
        # 8614 2813 -> 86142813
        
        if len(raw_phone) < 8:
            return None
            
        search_suffix = raw_phone[-8:]
        
        if len(raw_phone) < 8:
            return None
            
        search_suffix = raw_phone[-8:]
        
        # Búsqueda optimizada: Consulta directa a BD usando endswith
        # Dado que normalizamos teléfonos al guardar, esto es confiable
        return User.objects.filter(phone__endswith=search_suffix).first()

    def handle_email_input(self, session, text):
        from apps.clients.models import User
        import re
        
        # Validación simple de email
        email = text.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            self.client.send_text(session.phone_number, BotMessages.EMAIL_INVALID)
            return

        # Verificar si el usuario existe
        try:
            user = User.objects.get(email=email)
            # Vincular teléfono a usuario
            user.phone = session.phone_number
            user.save()
            self.client.send_text(session.phone_number, BotMessages.EMAIL_LINKED.format(name=user.first_name))
        except User.DoesNotExist:
            # Crear nuevo usuario
            user = User.objects.create_user(
                email=email,
                first_name="Cliente",  # Placeholder
                phone=session.phone_number
            )
            self.client.send_text(session.phone_number, BotMessages.EMAIL_CREATED.format(email=email))

        # Proceder a recolección de dirección
        session.state = 'WAITING_FOR_ADDRESS'
        session.save()
        self.client.send_text(session.phone_number, BotMessages.ADDRESS_REQUEST)


    def handle_address_input(self, session, text):
        # Guardar dirección en sesión
        session.data['address'] = text.strip()
        session.save()
        
        # Proceder a finalizar
        if 'time' in session.data:
            self.finalize_booking(session, session.data['time'])
        else:
            self.client.send_text(session.phone_number, BotMessages.ERROR_SESSION)

    def _parse_address(self, text):
        """
        Heurística para analizar cadena de dirección en componentes.
        Formato esperado: "Calle Número, Complemento, Comuna"
        """
        import re
        from apps.clients.models import Commune
        
        text = text.strip()
        
        # 1. Intentar encontrar Comuna al final
        # Obtenemos todas las comunas para comparar
        # En una app real con muchas comunas, esto podría ser lento, pero para Chile/Santiago está bien (~50 comunas)
        communes = list(Commune.objects.all())
        selected_commune = None
        
        # Ordenar por longitud desc para coincidir "San Joaquín" antes de "San"
        communes.sort(key=lambda c: len(c.name), reverse=True)
        
        clean_text = text
        for commune in communes:
            if clean_text.lower().endswith(commune.name.lower()):
                selected_commune = commune
                # Eliminar comuna del texto (y coma/espacios finales)
                clean_text = clean_text[:-(len(commune.name))].strip().rstrip(',')
                break
        
        # Si no se encuentra comuna, por defecto usar la primera o una específica
        if not selected_commune:
            selected_commune = Commune.objects.first()

        # 2. Analizar Calle y Número
        # Regex: Capturar todo hasta la última secuencia de dígitos
        # Ejemplo: "Av. Vicuña Mackenna 4927, Depto 3108"
        # Calle: "Av. Vicuña Mackenna"
        # Número: "4927"
        # Complemento: ", Depto 3108"
        
        match = re.search(r'^(?P<street>.+?)\s+(?P<number>\d+)(?P<complement>.*)$', clean_text)
        
        if match:
            street = match.group('street').strip()
            number = match.group('number').strip()
            complement = match.group('complement').strip().lstrip(',').strip()
        else:
            # Fallback si no se encuentra número
            street = clean_text
            number = "S/N"
            complement = ""

        return {
            'street': street,
            'number': number,
            'complement': complement,
            'commune': selected_commune
        }

    def finalize_booking(self, session, time_str):
        from apps.agenda.models import Reservation, Slot, ReservationService, Professional
        from apps.clients.models import User, Address
        from apps.catalog.models import Service
        from datetime import datetime, time
        
        # Almacenar hora en sesión por si necesitamos reanudar después del registro
        session.data['time'] = time_str
        session.save()
        
        service_id = session.data.get('service_id')
        date_str = session.data.get('date')
        
        # 1. Encontrar Usuario
        user = self.find_user_by_phone(session.phone_number)
        
        if not user:
            # No debería suceder si el flujo es correcto, pero verificación de seguridad
            session.state = 'WAITING_FOR_EMAIL'
            session.save()
            self.client.send_text(session.phone_number, BotMessages.EMAIL_REQUEST)
            return

        # 2. Encontrar Servicio
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            self.client.send_text(session.phone_number, "⚠️ Hubo un error al identificar el servicio. Por favor intenta comenzar de nuevo enviando 'Menu'.")
            return

        # 3. Encontrar Slot
        # Analizar fecha y hora
        try:
            date_obj = datetime.strptime(date_str, "%d/%m/%Y").date()
            hour = int(time_str.split(':')[0])
            minute = int(time_str.split(':')[1])
            naive_start = datetime.combine(date_obj, time(hour, minute))
            from django.utils import timezone
            if timezone.is_naive(naive_start):
                start_time = timezone.make_aware(naive_start)
            else:
                start_time = naive_start
        except ValueError:
            self.client.send_text(session.phone_number, "⚠️ Error en el formato de fecha/hora.")
            return

        # Buscar slots DISPONIBLES para este servicio a esta hora
        # Necesitamos un profesional que realice este servicio
        # Y tenga suficientes slots consecutivos para cubrir la duración
        
        # Find professionals for this service
        professionals = Professional.objects.filter(services__service=service, active=True)
        
        target_slots = []
        selected_pro = None
        
        # Calculate how many 60-min slots we need (assuming slots are 60 min for now)
        # Ideally we should check slot duration dynamically, but for MVP we assume 1 hour blocks.
        # If service is 120 min, we need 2 slots.
        # We need to find slots covering start_time to end_time
        
        from datetime import timedelta
        duration_min = service.duration_min
        end_time = start_time + timedelta(minutes=duration_min)
        
        for pro in professionals:
            # Find all available slots for this pro on this day
            # We need slots that start >= start_time and end <= end_time
            # and form a continuous block
            
            # Simple approach: Check if we can find a slot for each hour segment
            # This assumes slots are perfectly aligned with hours (e.g. 15:00-16:00, 16:00-17:00)
            
            required_slots = []
            current_check_time = start_time
            is_pro_available = True
            
            while current_check_time < end_time:
                # Look for a slot starting at current_check_time
                slot = Slot.objects.filter(
                    professional=pro,
                    start=current_check_time,
                    status='AVAILABLE'
                ).first()
                
                if not slot:
                    is_pro_available = False
                    break
                
                required_slots.append(slot)
                current_check_time = slot.end # Move to end of this slot
            
            if is_pro_available and required_slots:
                # Double check total duration covered
                total_covered = sum([(s.end - s.start).total_seconds() / 60 for s in required_slots])
                if total_covered >= duration_min:
                    target_slots = required_slots
                    selected_pro = pro
                    break
        
        if not target_slots:
            self.client.send_text(session.phone_number, (
                "😔 *Lo sentimos mucho*\n\n"
                "No tenemos disponibilidad suficiente para el servicio que seleccionaste en ese horario específico.\n\n"
                "*¿Qué puedes hacer?*\n"
                "• Escribe 'Menu' para elegir otra fecha u horario\n"
                "• Contacta a un ejecutivo (opción 3 del menú principal)\n\n"
                "_Disculpa las molestias. Estamos trabajando para ampliar nuestra disponibilidad._ 🙏"
            ))
            return

        # 4. Create Reservation
        raw_address = session.data.get('address', 'Dirección no especificada')
        
        # Parse and Create Address
        parsed_addr = self._parse_address(raw_address)
        
        address_obj, _ = Address.objects.update_or_create(
            owner=user,
            defaults={
                'street': parsed_addr['street'],
                'number': parsed_addr['number'],
                'complement': parsed_addr['complement'],
                'commune': parsed_addr['commune'],
                'alias': "Casa (WhatsApp)" # Default alias
            }
        )

        # Format address for note and message
        formatted_address = f"{parsed_addr['street']} #{parsed_addr['number']}"
        if parsed_addr['complement']:
            formatted_address += f", {parsed_addr['complement']}"
        formatted_address += f", {parsed_addr['commune'].name}"

        note = f"Reserva creada vía WhatsApp Bot. Dirección: {formatted_address}"

        reservation = Reservation.objects.create(
            client=user,
            status='CONFIRMED', # Auto-confirm for WhatsApp
            total_min=service.duration_min,
            note=note,
            address=address_obj
        )
        
        # Link Service
        ReservationService.objects.create(
            reservation=reservation,
            service=service,
            professional=selected_pro,
            effective_duration_min=service.duration_min
        )
        
        # Update Slots and Link
        from apps.agenda.models import ReservationSlot
        
        for slot in target_slots:
            slot.status = 'RESERVED'
            slot.save()
            
            ReservationSlot.objects.create(
                reservation=reservation,
                slot=slot,
                professional=selected_pro
            )

        # Format professional confirmation message
        price_fmt = "{:,.0f}".format(service.price).replace(',', '.')
        msg = BotMessages.BOOKING_CONFIRMED.format(
            id=reservation.pk,
            client_name=user.first_name or user.email.split('@')[0],
            service_name=service.name,
            price=price_fmt,
            duration=service.duration_min,
            date=date_str,
            time=time_str,
            pro_name=selected_pro.first_name,
            address=formatted_address
        )
        
        self.client.send_text(session.phone_number, msg)
        
        # Reset session
        session.state = 'MENU'
        session.data = {}
        session.save()



