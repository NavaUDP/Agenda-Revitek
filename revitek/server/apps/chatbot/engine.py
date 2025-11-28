import requests
from django.conf import settings
from .models import ChatSession
from .flow import FLOW
from .sender import send_message
from apps.usuarios.models import User, Vehiculo
from apps.agenda.serializers import ReservaCreateSerializer


def get_session(phone):
    s, _ = ChatSession.objects.get_or_create(phone=phone)
    return s


def process_message(phone, text):
    print("🔥 process_message ejecutado:", phone, text)

    session = get_session(phone)
    node = FLOW.get(session.state, FLOW["start"])

    # FREE INPUT
    if node.get("free_input"):
        session.data[session.state] = text
        session.state = node["next"]
        session.save()
        next_node = FLOW[session.state]
        return send_message(phone, next_node["question"])

    # OPTIONS
    if "options" in node:
        if text not in node["options"]:
            return send_message(phone, "Opción inválida. Intenta nuevamente.")
        session.data[session.state] = node["options"][text]
        session.state = node["options"][text] if node["options"][text] != "elegir_fecha" else "elegir_fecha"
        session.save()
        return send_message(phone, FLOW[session.state]["question"])

    # ACTIONS
    if node.get("action") == "send_hours":
        return send_hours(phone, session)

    if node.get("action") == "make_reserva":
        return make_reserva(phone, session)

    # fallback
    return send_message(phone, FLOW["start"]["question"])

def send_hours(phone, session):
    servicios_map = {"1": 1, "2": 2, "3": 3}
    servicio_id = servicios_map[session.data["elegir_servicio"]]

    fecha = session.data["elegir_fecha"]

    r = requests.post(
        f"{settings.BACKEND_URL}/aggregated_availability/",
        json={"services": [servicio_id], "fecha": fecha}
    )

    horas = r.json()

    if not horas:
        return send_message(phone, "No hay horarios disponibles ese día. Intenta otra fecha.")

    txt = "*Horas disponibles:*\n\n"
    for i, h in enumerate(horas, start=1):
        txt += f"{i}) {h['inicio'][11:16]}\n"

    session.data["horas"] = horas
    session.state = "confirmar_hora"
    session.save()

    return send_message(phone, txt)

def make_reserva(phone, session):
    idx = int(session.data["confirmar_hora"]) - 1
    hora = session.data["horas"][idx]

    slot_id = hora["slot_ids"][0]  # tu backend usa solo el inicial

    # crear usuario
    cliente, _ = User.objects.get_or_create(
        email=session.data["pedir_email"],
        defaults={
            "nombre": session.data["pedir_nombre"],
            "telefono": session.data["pedir_telefono"]
        }
    )

    vehiculo, _ = Vehiculo.objects.get_or_create(
        patente=session.data["pedir_patente"].upper(),
        defaults={"propietario": cliente}
    )

    servicios_map = {"1": 1, "2": 2, "3": 3}
    servicio_id = servicios_map[session.data["elegir_servicio"]]

    payload = {
        "cliente": {
            "email": cliente.email,
            "nombre": cliente.nombre,
            "telefono": cliente.telefono
        },
        "vehiculo": {
            "patente": vehiculo.patente
        },
        "direccion": None,
        "profesional_id": hora["profes"][0],
        "servicios": [{"servicio_id": servicio_id, "profesional_id": hora["profes"][0]}],
        "slot_id": slot_id,
        "nota": "Agendado por chatbot"
    }

    serializer = ReservaCreateSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    reserva = serializer.save()

    session.state = "fin"
    session.save()

    return send_message(phone, f"Reserva creada! ID: {reserva.id}\nTe esperamos 🚗✨")
