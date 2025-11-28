FLOW = {
    "start": {
        "question": "Hola 👋 soy *Revitek Bot*. ¿Quieres agendar un servicio?\n1) Sí\n2) No",
        "options": {"1": "pedir_nombre", "2": "fin"}
    },

    "pedir_nombre": {
        "question": "Perfecto! ¿Cuál es tu nombre?",
        "free_input": True,
        "next": "pedir_email"
    },

    "pedir_email": {
        "question": "¿Cuál es tu correo electrónico?",
        "free_input": True,
        "next": "pedir_telefono"
    },

    "pedir_telefono": {
        "question": "¿Tu número de teléfono?",
        "free_input": True,
        "next": "pedir_patente"
    },

    "pedir_patente": {
        "question": "¿Cuál es la patente de tu vehículo?",
        "free_input": True,
        "next": "elegir_servicio"
    },

    "elegir_servicio": {
        "question": "Indica el servicio que deseas:\n"
                    "1) Cambio de aceite\n"
                    "2) Mantención\n"
                    "3) Diagnóstico",
        "options": {"1": "elegir_fecha", "2": "elegir_fecha", "3": "elegir_fecha"}
    },

    "elegir_fecha": {
        "question": "¿Qué fecha te acomoda? (AAAA-MM-DD)",
        "free_input": True,
        "next": "mostrar_horas"
    },

    # Acción que consulta al backend y devuelve horas disponibles
    "mostrar_horas": {
        "action": "send_hours"
    },

    "confirmar_hora": {
        "question": "Confirma la hora seleccionada (escribe el número):",
        "free_input": True,
        "next": "crear_reserva"
    },

    # Acción que crea la reserva usando tu backend Django
    "crear_reserva": {
        "action": "make_reserva"
    },

    "fin": {
        "question": "Perfecto 👌 Si necesitas algo más, solo escríbeme."
    }
}
