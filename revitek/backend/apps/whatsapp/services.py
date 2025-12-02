import requests
import json
from django.conf import settings
from .models import WhatsAppLog

class MetaClient:
    """
    Client for interacting with Meta Cloud API (WhatsApp).
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
        Send a template message.
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
        Send a simple text message.
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
        Send a message with Confirm/Cancel buttons to the client.
        """
        if not reservation.client.phone:
            return None

        # Format date and time
        # We need to fetch the first slot to show date/time
        # Fix: Access via reservation_slots
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"

        service_names = ", ".join([s.service.name for s in reservation.services.all()])

        body_text = (
            f"👋 Hola {reservation.client.first_name},\n\n"
            f"Te recordamos que tienes una reserva programada con *Revitek*.\n\n"
            f"🔧 *Servicio:* {service_names}\n"
            f"📅 *Fecha:* {date_str}\n"
            f"⏰ *Hora:* {time_str}\n\n"
            f"Nuestro equipo acudirá a tu dirección (o ubicación acordada) para realizar el servicio o retiro del vehículo.\n\n"
            f"Por favor, confirma que podremos ser recibidos en el horario agendado."
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
        Send a template message notifying that the booking has been approved by admin.
        Uses template: reservation_confirmatio
        """
        if not reservation.client.phone:
            print("DEBUG: Client has no phone number.")
            return None
        
        print(f"DEBUG: Sending approval template to {reservation.client.phone}")

        # Fix: Access via reservation_slots
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"

        service_names = ", ".join([s.service.name for s in reservation.services.all()])
        
        # Template parameters (Body)
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
        Send WhatsApp message with confirmation link (2-hour expiration).
        This replaces the template message when admin approves.
        """
        if not reservation.client.phone:
            print("No phone number for reservation confirmation")
            return None
        
        # Get reservation details
        first_res_slot = reservation.reservation_slots.select_related('slot').order_by('slot__start').first()
        
        if first_res_slot and first_res_slot.slot:
            date_str = first_res_slot.slot.start.strftime('%d/%m/%Y')
            time_str = first_res_slot.slot.start.strftime('%H:%M')
        else:
            date_str = "Fecha por confirmar"
            time_str = "--:--"
        
        service_names = ", ".join([s.service.name for s in reservation.services.all()])
        
        # Confirmation link - for now using localhost, update in production
        # Production should be: https://tudominio.com/confirmar/{token}
        confirmation_url = f"http://localhost:5173/confirmar/{token}"
        
        # Send text message with link
        message = (
            f"✅ *¡Tu reserva ha sido aprobada!*\n\n"
            f"📋 *Detalles:*\n"
            f"• Servicio: {service_names}\n"
            f"• Fecha: {date_str}\n"
            f"• Hora: {time_str}\n\n"
            f"⚠️ *Importante:* Para confirmar tu asistencia, haz clic en el siguiente enlace:\n\n"
            f"{confirmation_url}\n\n"
            f"⏰ Este enlace expira en 2 horas.\n"
            f"Si no confirmas, tu reserva será cancelada."
        )
        
        return self.send_text(reservation.client.phone, message, reservation=reservation)

    def _send_request(self, payload, reservation=None, message_type='text'):
        """
        Internal method to send the request and log it.
        """
        log = WhatsAppLog.objects.create(
            direction='OUTBOUND',
            message_type=message_type,
            phone_number=payload.get('to'),
            content=payload,
            status='SENT', # Optimistic
            reservation=reservation
        )
        print(f"DEBUG: Created WhatsAppLog #{log.id}. Sending request to Meta...")

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
    Handles incoming webhook payloads from Meta.
    """
    def handle_payload(self, payload):
        """
        Main entry point for processing webhook data.
        """
        entry = payload.get('entry', [])
        for e in entry:
            changes = e.get('changes', [])
            for change in changes:
                value = change.get('value', {})
                
                # 1. Handle Status Updates (sent, delivered, read)
                if 'statuses' in value:
                    self.handle_statuses(value['statuses'])
                
                # 2. Handle Incoming Messages
                if 'messages' in value:
                    self.handle_messages(value['messages'])

    def handle_statuses(self, statuses):
        for status in statuses:
            whatsapp_id = status.get('id')
            new_status = status.get('status').upper() # sent, delivered, read
            
            # Update log if exists
            try:
                log = WhatsAppLog.objects.get(whatsapp_id=whatsapp_id)
                
                # Map Meta status to our choices
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
            
            # Log incoming message
            log = WhatsAppLog.objects.create(
                direction='INBOUND',
                message_type=msg_type.upper(),
                phone_number=from_phone,
                whatsapp_id=whatsapp_id,
                content=msg,
                status='RECEIVED'
            )

            # Handle Button Replies (Interactive)
            if msg_type == 'interactive':
                interactive = msg.get('interactive', {})
                if interactive.get('type') == 'button_reply':
                    button_id = interactive.get('button_reply', {}).get('id')
                    
                    # Expected format: "CONFIRM_RESERVATION_<ID>" or "CANCEL_RESERVATION_<ID>"
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
                                        client.send_text(from_phone, "¡Excelente! Tu reserva ha sido re-confirmada. Nuestro equipo estará en tu dirección en el horario acordado.", reservation)
                                    else:
                                        client.send_text(from_phone, "Lo sentimos, esta reserva ya estaba cancelada.", reservation)

                                elif action == 'CANCEL':
                                    if reservation.status != 'CANCELLED':
                                        cancel_reservation(reservation.id, cancelled_by="client_whatsapp")
                                        client.send_text(from_phone, "Entendido, tu reserva ha sido cancelada. Esperamos poder atenderte en otra oportunidad.", reservation)
                                    else:
                                        client.send_text(from_phone, "La reserva ya estaba cancelada.", reservation)
                            
                            except (Reservation.DoesNotExist, ValueError):
                                client.send_text(from_phone, "No pudimos encontrar la reserva asociada a esta acción.")
            
            # Handle Template Button Clicks (type='button')
            elif msg_type == 'button':
                button_payload = msg.get('button', {}).get('payload')
                context_id = msg.get('context', {}).get('id')
                
                print(f"DEBUG: Received button click. Payload: {button_payload}, Context: {context_id}")
                
                if context_id:
                    try:
                        # Find the original outbound message log to get the reservation
                        original_log = WhatsAppLog.objects.filter(whatsapp_id=context_id).first()
                        
                        if original_log and original_log.reservation:
                            reservation = original_log.reservation
                            log.reservation = reservation
                            log.save()
                            
                            print(f"DEBUG: Found reservation #{reservation.id} from context.")

                            # Logic for "Sí, confirmo" (or any positive payload)
                            # We assume the button is for confirmation since we sent a confirmation template
                            if reservation.status != 'CANCELLED':
                                reservation.status = 'RECONFIRMED'
                                reservation.save(update_fields=['status'])
                                client.send_text(from_phone, "¡Excelente! Tu reserva ha sido re-confirmada. Nuestro equipo estará en tu dirección en el horario acordado.", reservation)
                            else:
                                client.send_text(from_phone, "Lo sentimos, esta reserva ya estaba cancelada.", reservation)
                        else:
                            print("DEBUG: Could not find original log or reservation for this context.")
                            client.send_text(from_phone, "No pudimos identificar la reserva asociada.")
                            
                    except Exception as e:
                        print(f"DEBUG: Error handling button click: {e}")

            # Handle Text (Chatbot)
            elif msg_type == 'text':
                bot = ChatBot()
                bot.handle_message(from_phone, msg)


class ChatBot:
    """
    Handles the conversational logic for the WhatsApp Bot.
    """
    def __init__(self):
        self.client = MetaClient()

    def handle_message(self, phone, message_body):
        from .models import WhatsAppSession
        
        # Get or create session
        session, created = WhatsAppSession.objects.get_or_create(phone_number=phone)
        
        # Normalize input
        text = message_body.get('text', {}).get('body', '').strip()
        text_lower = text.lower()
        
        # Global Commands (available in any state)
        if text_lower in ['reset', 'menu', 'inicio', 'volver']:
            session.state = 'MENU'
            session.data = {}
            session.save()
            self.client.send_text(phone, "🔄 Perfecto, volvamos al inicio.\n\n")
            self.send_menu(phone)
            return
        
        # Cancel/Exit command
        if text_lower in ['cancelar', 'salir', 'cancel']:
            session.state = 'MENU'
            session.data = {}
            session.save()
            self.client.send_text(phone, (
                "❌ Proceso cancelado.\n\n"
                "No te preocupes, tus datos están seguros. "
                "Cuando estés listo, escribe *'Menu'* para comenzar.\n\n"
                "_Estoy aquí para ayudarte cuando lo necesites._ 😊"
            ))
            return
        
        # Help command
        if text_lower in ['ayuda', 'help', '?']:
            self.send_help(phone, session.state)
            return

        # State Machine
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
            
        else:
            # Fallback
            self.send_menu(phone)

    def send_menu(self, phone):
        body = (
            "👋 *¡Hola! Bienvenido a Revitek* 🚗✨\n\n"
            "Soy tu asistente virtual y estoy aquí para ayudarte. "
            "Puedo ayudarte a agendar servicios, consultar tus reservas o conectarte con nuestro equipo.\n\n"
            "*¿Qué te gustaría hacer hoy?*\n\n"
            "1️⃣  Agendar un nuevo servicio\n"
            "2️⃣  Consultar mis reservas activas\n"
            "3️⃣  Hablar con un ejecutivo\n\n"
            "_💡 Escribe el número de tu opción o escribe *'Menu'* en cualquier momento para volver aquí._"
        )
        self.client.send_text(phone, body)

    def handle_menu_selection(self, session, text):
        text_lower = text.lower().strip()
        
        if text == '1' or 'agendar' in text_lower:
            session.state = 'SELECT_SERVICE'
            session.save()
            self.send_service_list(session.phone_number)
            
        elif text == '2' or 'reserva' in text_lower:
            self.check_reservations(session.phone_number)
            
        elif text == '3' or 'ejecutivo' in text_lower or 'humano' in text_lower:
            self.client.send_text(session.phone_number, (
                "👨‍💻 *Perfecto, entendido.*\n\n"
                "Un miembro de nuestro equipo revisará tu consulta y se pondrá en contacto contigo a la brevedad.\n\n"
                "📞 Si tu consulta es urgente, puedes llamarnos directamente al *+56 9 XXXX XXXX*.\n\n"
                "_Gracias por confiar en Revitek._"
            ))
            session.state = 'MENU'
            session.save()
            
        else:
            self.client.send_text(session.phone_number, (
                "🤔 Disculpa, no reconocí esa opción.\n\n"
                "Por favor, responde con el número *1*, *2* o *3* según lo que necesites.\n\n"
                "_O escribe 'Menu' para ver las opciones nuevamente._"
            ))

    def send_service_list(self, phone):
        from apps.catalog.models import Service
        services = Service.objects.filter(active=True).order_by('id')[:20]
        
        msg = "🛠️ *Nuestros Servicios Disponibles*\n\n"
        msg += "_Contamos con servicios de alta calidad para el cuidado de tu vehículo:_\n\n"
        
        for i, service in enumerate(services, 1):
            price_fmt = "{:,.0f}".format(service.price).replace(',', '.')
            msg += f"*{i}.* {service.name}\n   💰 ${price_fmt}\n"
            
        msg += (
            "\n━━━━━━━━━━━━━━━\n"
            "👇 *¿Cuál servicio te interesa?*\n"
            "Responde con el número correspondiente.\n\n"
            "_Escribe 'Menu' para volver al inicio._"
        )
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
                self.client.send_text(session.phone_number, (
                    f"✅ *Excelente elección*\n\n"
                    f"Has seleccionado: *{selected_service.name}*\n"
                    f"💰 Valor: ${price_fmt}\n\n"
                    f"📅 *¿Para qué fecha deseas agendar?*\n\n"
                    f"Por favor, escribe la fecha en el siguiente formato:\n"
                    f"*DD/MM/AAAA* (Ejemplo: 15/12/2025)\n\n"
                    f"_💡 Tip: Asegúrate de agendar con al menos 24 horas de anticipación._"
                ))
            else:
                self.client.send_text(session.phone_number, (
                    "⚠️ *Ups*, ese número no corresponde a ningún servicio de la lista.\n\n"
                    "Por favor, verifica e intenta nuevamente con un número del 1 al " + str(len(services)) + "."
                ))
        except ValueError:
            self.client.send_text(session.phone_number, (
                "❌ *Formato incorrecto*\n\n"
                "Por favor, responde solo con el *número* del servicio que deseas (por ejemplo: 1, 2, 3...).\n\n"
                "_Si necesitas ver la lista nuevamente, escribe 'Menu'._"
            ))

    def handle_date_selection(self, session, text):
        from datetime import datetime, timedelta
        try:
            date_obj = datetime.strptime(text, "%d/%m/%Y").date()
            today = datetime.now().date()
            
            # Basic validation: future date
            if date_obj < today:
                self.client.send_text(session.phone_number, (
                    "⚠️ *Fecha no válida*\n\n"
                    "La fecha que ingresaste ya pasó. \n\n"
                    "Por favor, ingresa una fecha *futura* en formato DD/MM/AAAA.\n"
                    "Ejemplo: " + (today + timedelta(days=1)).strftime("%d/%m/%Y")
                ))
                return
            
            # Check if date is too far in the future (e.g., more than 3 months)
            max_date = today + timedelta(days=90)
            if date_obj > max_date:
                self.client.send_text(session.phone_number, (
                    "⚠️ *Fecha muy lejana*\n\n"
                    "Por el momento solo aceptamos reservas hasta 3 meses en adelante.\n\n"
                    f"Por favor, elige una fecha antes del {max_date.strftime('%d/%m/%Y')}."
                ))
                return

            session.data['date'] = text
            session.state = 'SELECT_TIME'
            session.save()
            
            # Fetch available slots
            self.send_time_slots(session.phone_number, date_obj)
            
        except ValueError:
            self.client.send_text(session.phone_number, (
                "❌ *Formato de fecha incorrecto*\n\n"
                "No pude entender la fecha que ingresaste.\n\n"
                "Por favor, usa exactamente este formato: *DD/MM/AAAA*\n\n"
                "*Ejemplos válidos:*\n"
                "• 03/12/2025\n"
                "• 15/01/2026\n\n"
                "_Intenta nuevamente._"
            ))

    def send_time_slots(self, phone, date_obj):
        # TODO: Integrate with real slot availability logic
        # For MVP, showing static slots or querying DB
        day_name = date_obj.strftime('%A')
        day_names_es = {
            'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
            'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
        }
        day_es = day_names_es.get(day_name, day_name)
        
        msg = (
            f"🕒 *Horarios Disponibles*\n"
            f"📅 {day_es}, {date_obj.strftime('%d de %B del %Y')}\n\n"
            "_Estos son los bloques horarios que tenemos disponibles:_\n\n"
            "1️⃣  09:00 AM\n"
            "2️⃣  10:00 AM\n"
            "3️⃣  11:00 AM\n"
            "4️⃣  03:00 PM (15:00)\n\n"
            "━━━━━━━━━━━━━━━\n"
            "👇 *¿Qué horario prefieres?*\n"
            "Responde con el número de tu preferencia.\n\n"
            "_Si ninguno te acomoda, escribe 'Menu' para elegir otra fecha._"
        )
        self.client.send_text(phone, msg)

    def handle_time_selection(self, session, text):
        # Mock implementation for MVP
        times = ["09:00", "10:00", "11:00", "15:00"]
        time_labels = ["09:00 AM", "10:00 AM", "11:00 AM", "03:00 PM"]
        try:
            idx = int(text) - 1
            if 0 <= idx < len(times):
                selected_time = times[idx]
                selected_label = time_labels[idx]
                
                # Send confirmation that we're processing
                self.client.send_text(session.phone_number, (
                    f"⏰ *Horario seleccionado: {selected_label}*\n\n"
                    "Un momento por favor, estoy verificando la disponibilidad y procesando tu reserva...\n\n"
                    "_Esto tomará solo unos segundos._ ⚙️"
                ))
                
                self.finalize_booking(session, selected_time)
            else:
                self.client.send_text(session.phone_number, (
                    "⚠️ *Opción no válida*\n\n"
                    f"Por favor, elige un número del 1 al {len(times)} según los horarios mostrados.\n\n"
                    "_O escribe 'Menu' si deseas cambiar la fecha._"
                ))
        except ValueError:
            self.client.send_text(session.phone_number, (
                "❌ *Formato incorrecto*\n\n"
                "Por favor, responde solo con el *número* del horario (1, 2, 3 o 4)."
            ))

    def find_user_by_phone(self, phone_number):
        from apps.clients.models import User
        
        # Normalize incoming phone: remove non-digits
        raw_phone = ''.join(filter(str.isdigit, phone_number))
        
        # Heuristic: Match last 8 digits (Chilean standard without +569 prefix is 8 digits)
        # This handles:
        # +56 9 8614 2813 -> 86142813
        # 9 8614 2813 -> 86142813
        # 8614 2813 -> 86142813
        
        if len(raw_phone) < 8:
            return None
            
        search_suffix = raw_phone[-8:]
        
        # Inefficient but functional for MVP: Iterate and check suffix
        # Ideally, we should store normalized phones in DB
        users = User.objects.all()
        for u in users:
            if not u.phone: continue
            u_phone = ''.join(filter(str.isdigit, u.phone))
            if u_phone.endswith(search_suffix):
                return u
        return None

    def handle_email_input(self, session, text):
        from apps.clients.models import User
        import re
        
        # Simple email validation
        email = text.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            self.client.send_text(session.phone_number, (
                "❌ *Correo no válido*\n\n"
                "El formato del correo electrónico no es correcto.\n\n"
                "*Ejemplos válidos:*\n"
                "• juan.perez@gmail.com\n"
                "• maria@empresa.cl\n\n"
                "Por favor, verifica e intenta nuevamente."
            ))
            return

        # Check if user exists
        try:
            user = User.objects.get(email=email)
            # Link phone to user
            user.phone = session.phone_number
            user.save()
            self.client.send_text(session.phone_number, (
                f"✅ *¡Cuenta vinculada exitosamente!*\n\n"
                f"Bienvenido de vuelta, *{user.first_name}*. 👋\n\n"
                f"Continuemos con tu reserva..."
            ))
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                email=email,
                first_name="Cliente",  # Placeholder
                phone=session.phone_number
            )
            self.client.send_text(session.phone_number, (
                "✅ *¡Cuenta creada exitosamente!*\n\n"
                f"Hemos registrado tu correo: {email}\n\n"
                "Ahora formas parte de la familia Revitek. 🎉\n\n"
                "Continuemos con tu reserva..."
            ))

        # Resume booking if data exists
        if 'service_id' in session.data and 'date' in session.data and 'time' in session.data:
            self.finalize_booking(session, session.data['time'])
        else:
            # If no booking data, go to menu
            session.state = 'MENU'
            session.save()
            self.send_menu(session.phone_number)

    def finalize_booking(self, session, time_str):
        from apps.agenda.models import Reservation, Slot, ReservationService, Professional
        from apps.clients.models import User
        from apps.catalog.models import Service
        from datetime import datetime, time
        
        # Store time in session just in case we need to resume after registration
        session.data['time'] = time_str
        session.save()
        
        service_id = session.data.get('service_id')
        date_str = session.data.get('date')
        
        # 1. Find User
        user = self.find_user_by_phone(session.phone_number)
        
        if not user:
            # Ask for email to register/link
            session.state = 'WAITING_FOR_EMAIL'
            session.save()
            self.client.send_text(session.phone_number, (
                "👋 *¡Hola!*\n\n"
                "Veo que es tu primera vez usando nuestro asistente virtual (o quizás cambiaste de número).\n\n"
                "📧 *Para continuar con tu reserva, necesito que me proporciones tu correo electrónico:*\n\n"
                "Esto nos permitirá:\n"
                "• Enviarte confirmaciones\n"
                "• Mantener un historial de tus servicios\n"
                "• Comunicarnos contigo si hay algún cambio\n\n"
                "_Por favor, escribe tu correo electrónico._"
            ))
            return

        # 2. Find Service
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            self.client.send_text(session.phone_number, "⚠️ Hubo un error al identificar el servicio. Por favor intenta comenzar de nuevo enviando 'Menu'.")
            return

        # 3. Find Slot
        # Parse date and time
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

        # Search for AVAILABLE slots for this service at this time
        # We need a professional who performs this service
        # And has enough consecutive slots to cover the duration
        
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
        reservation = Reservation.objects.create(
            client=user,
            status='CONFIRMED', # Auto-confirm for WhatsApp
            total_min=service.duration_min,
            note="Reserva creada vía WhatsApp Bot"
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
        msg = (
            "🎉 *¡RESERVA CONFIRMADA!*\n\n"
            "━━━━━━━━━━━━━━━\n"
            "📋 *DETALLES DE TU RESERVA*\n\n"
            f"🆔 Código: *#{reservation.pk}*\n"
            f"👤 Cliente: *{user.first_name or user.email.split('@')[0]}*\n\n"
            f"🔧 Servicio: *{service.name}*\n"
            f"💰 Valor: ${price_fmt}\n"
            f"⏱ Duración aprox: {service.duration_min} minutos\n\n"
            f"📅 Fecha: *{date_str}*\n"
            f"⏰ Hora: *{time_str}*\n"
            f"👨‍🔧 Profesional: {selected_pro.first_name}\n\n"
            "━━━━━━━━━━━━━━━\n\n"
            "📍 *Ubicación:* [Dirección del Taller]\n"
            "🅿️ Hay estacionamiento disponible\n\n"
            "*📝 Recomendaciones:*\n"
            "• Llega 5-10 minutos antes\n"
            "• Trae tu cédula de identidad\n"
            "• Si tienes algún documento del vehículo, tráelo\n\n"
            "*¿Necesitas hacer cambios?*\n"
            "Escríbenos o llama al +56 9 XXXX XXXX\n\n"
            "_¡Gracias por confiar en Revitek! Nos vemos pronto._ 🚗✨"
        )
        
        self.client.send_text(session.phone_number, msg)
        
        # Reset session
        session.state = 'MENU'
        session.data = {}
        session.save()



