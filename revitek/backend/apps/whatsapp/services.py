import requests
import json
import logging
from django.conf import settings
from .models import WhatsAppLog
from .messages import BotMessages

logger = logging.getLogger(__name__)

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
        Send a template message notifying that the booking has been approved by admin.
        Uses template: reservation_confirmatio
        """
        if not reservation.client.phone:
            logger.warning(f"Client {reservation.client.id} has no phone number. Cannot send approval template.")
            return None
        
        logger.info(f"Sending approval template to {reservation.client.phone}")

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
            logger.warning("No phone number for reservation confirmation")
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
        # Confirmation link
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        confirmation_url = f"{base_url}/confirmar/{token}"
        
        # Send text message with link
        # Send text message with link
        message = BotMessages.CONFIRMATION_LINK_MSG.format(
            service_names=service_names,
            date=date_str,
            time=time_str,
            url=confirmation_url
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
            
            # Handle Template Button Clicks (type='button')
            elif msg_type == 'button':
                button_payload = msg.get('button', {}).get('payload')
                context_id = msg.get('context', {}).get('id')
                
                logger.debug(f"Received button click. Payload: {button_payload}, Context: {context_id}")
                
                if context_id:
                    try:
                        # Find the original outbound message log to get the reservation
                        original_log = WhatsAppLog.objects.filter(whatsapp_id=context_id).first()
                        
                        if original_log and original_log.reservation:
                            reservation = original_log.reservation
                            log.reservation = reservation
                            log.save()
                            
                            logger.debug(f"Found reservation #{reservation.id} from context.")

                            # Logic for "Sí, confirmo" (or any positive payload)
                            # We assume the button is for confirmation since we sent a confirmation template
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
            self.client.send_text(phone, BotMessages.MENU_RESET)
            self.send_menu(phone)
            return
        
        # Cancel/Exit command
        if text_lower in ['cancelar', 'salir', 'cancel']:
            session.state = 'MENU'
            session.data = {}
            session.save()
            self.client.send_text(phone, BotMessages.CANCEL_SUCCESS)
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

        elif session.state == 'WAITING_FOR_ADDRESS':
            self.handle_address_input(session, text)
            
        else:
            # Fallback / Trigger on any message
            # If the user sends something we don't recognize in a specific state, or if state is MENU
            # we default to showing the menu.
            # This ensures "Hola", "Buenas", etc. triggers the bot.
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
            
            # Basic validation: future date
            if date_obj < today:
                self.client.send_text(session.phone_number, BotMessages.DATE_PAST_ERROR.format(
                    next_day=(today + timedelta(days=1)).strftime("%d/%m/%Y")
                ))
                return
            
            # Check if date is too far in the future (e.g., more than 3 months)
            max_date = today + timedelta(days=90)
            if date_obj > max_date:
                self.client.send_text(session.phone_number, BotMessages.DATE_TOO_FAR_ERROR.format(
                    max_date=max_date.strftime('%d/%m/%Y')
                ))
                return

            session.data['date'] = text
            session.state = 'SELECT_TIME'
            session.save()
            
            # Fetch available slots
            self.send_time_slots(session.phone_number, date_obj)
            
        except ValueError:
            self.client.send_text(session.phone_number, BotMessages.DATE_FORMAT_ERROR)

    def send_time_slots(self, phone, date_obj):
        from apps.agenda.services import compute_aggregated_availability
        
        # Get selected service from session
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

        # Fetch real availability
        # compute_aggregated_availability expects list of service_ids and date string "YYYY-MM-DD"
        date_str = date_obj.strftime("%Y-%m-%d")
        available_slots = compute_aggregated_availability([service_id], date_str)
        
        if not available_slots:
            self.client.send_text(phone, BotMessages.DATE_NO_SLOTS.format(date=date_obj.strftime('%d/%m/%Y')))
            return

        # Store available slots in session for validation in next step
        # We store a simplified list: [{'start': '09:00', 'end': '10:00', 'label': '09:00 AM'}]
        slots_data = []
        msg = BotMessages.TIME_SLOTS_HEADER.format(date=date_obj.strftime('%d/%m/%Y'))

        for i, slot in enumerate(available_slots, 1):
            # slot is a dict: {'inicio': datetime, 'fin': datetime, ...}
            start_dt = slot['inicio']
            end_dt = slot['fin']
            start_str = start_dt.strftime("%H:%M")
            label = start_dt.strftime("%I:%M %p")
            
            slots_data.append({
                'start': start_str,
                'label': label
            })
            
            msg += f"{i}️⃣  {label}\n"
            
            # Limit to 10 options for UX
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
                
                # Send confirmation that we're processing
                self.client.send_text(session.phone_number, BotMessages.TIME_SELECTED.format(time_label=selected_label))
                
                # Save time
                session.data['time'] = selected_time
                session.save()

                # Check if user exists to decide next step
                user = self.find_user_by_phone(session.phone_number)
                
                if not user:
                    # Ask for email
                    session.state = 'WAITING_FOR_EMAIL'
                    session.save()
                    self.client.send_text(session.phone_number, BotMessages.EMAIL_REQUEST)
                else:
                    # Ask for address
                    session.state = 'WAITING_FOR_ADDRESS'
                    session.save()
                    self.client.send_text(session.phone_number, BotMessages.ADDRESS_REQUEST)
            else:
                self.client.send_text(session.phone_number, BotMessages.TIME_INVALID_OPTION.format(count=len(available_slots)))
        except ValueError:
            self.client.send_text(session.phone_number, BotMessages.TIME_FORMAT_ERROR)

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
        
        if len(raw_phone) < 8:
            return None
            
        search_suffix = raw_phone[-8:]
        
        # Optimized search: Direct DB query using endswith
        # Since we normalize phones on save, this is reliable
        return User.objects.filter(phone__endswith=search_suffix).first()

    def handle_email_input(self, session, text):
        from apps.clients.models import User
        import re
        
        # Simple email validation
        email = text.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            self.client.send_text(session.phone_number, BotMessages.EMAIL_INVALID)
            return

        # Check if user exists
        try:
            user = User.objects.get(email=email)
            # Link phone to user
            user.phone = session.phone_number
            user.save()
            self.client.send_text(session.phone_number, BotMessages.EMAIL_LINKED.format(name=user.first_name))
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                email=email,
                first_name="Cliente",  # Placeholder
                phone=session.phone_number
            )
            self.client.send_text(session.phone_number, BotMessages.EMAIL_CREATED.format(email=email))

        # Proceed to address collection
        session.state = 'WAITING_FOR_ADDRESS'
        session.save()
        self.client.send_text(session.phone_number, BotMessages.ADDRESS_REQUEST)


    def handle_address_input(self, session, text):
        # Save address to session
        session.data['address'] = text.strip()
        session.save()
        
        # Proceed to finalize
        if 'time' in session.data:
            self.finalize_booking(session, session.data['time'])
        else:
            self.client.send_text(session.phone_number, BotMessages.ERROR_SESSION)

    def _parse_address(self, text):
        """
        Heuristic to parse address string into components.
        Expected format: "Street Number, Complement, Commune"
        """
        import re
        from apps.clients.models import Commune
        
        text = text.strip()
        
        # 1. Try to find Commune at the end
        # We fetch all communes to check against
        # In a real app with many communes, this might be slow, but for Chile/Santiago it's fine (~50 communes)
        communes = list(Commune.objects.all())
        selected_commune = None
        
        # Sort by length desc to match "San Joaquín" before "San"
        communes.sort(key=lambda c: len(c.name), reverse=True)
        
        clean_text = text
        for commune in communes:
            if clean_text.lower().endswith(commune.name.lower()):
                selected_commune = commune
                # Remove commune from text (and trailing comma/spaces)
                clean_text = clean_text[:-(len(commune.name))].strip().rstrip(',')
                break
        
        # If no commune found, default to first one or specific default
        if not selected_commune:
            selected_commune = Commune.objects.first()

        # 2. Parse Street and Number
        # Regex: Capture everything until the last sequence of digits
        # Example: "Av. Vicuña Mackenna 4927, Depto 3108"
        # Street: "Av. Vicuña Mackenna"
        # Number: "4927"
        # Complement: ", Depto 3108"
        
        match = re.search(r'^(?P<street>.+?)\s+(?P<number>\d+)(?P<complement>.*)$', clean_text)
        
        if match:
            street = match.group('street').strip()
            number = match.group('number').strip()
            complement = match.group('complement').strip().lstrip(',').strip()
        else:
            # Fallback if no number found
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
        
        # Store time in session just in case we need to resume after registration
        session.data['time'] = time_str
        session.save()
        
        service_id = session.data.get('service_id')
        date_str = session.data.get('date')
        
        # 1. Find User
        user = self.find_user_by_phone(session.phone_number)
        
        if not user:
            # Should not happen if flow is correct, but safety check
            session.state = 'WAITING_FOR_EMAIL'
            session.save()
            self.client.send_text(session.phone_number, BotMessages.EMAIL_REQUEST)
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



