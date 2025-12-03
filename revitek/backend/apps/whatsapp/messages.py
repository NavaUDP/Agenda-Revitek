class BotMessages:
    # General
    ERROR_SESSION = "⚠️ Error de sesión. Por favor escribe 'Menu' para reiniciar."
    ERROR_GENERIC = "⚠️ Ocurrió un error inesperado. Por favor intenta nuevamente más tarde."
    CANCEL_SUCCESS = (
        "❌ Proceso cancelado.\n\n"
        "No te preocupes, tus datos están seguros. "
        "Cuando estés listo, escribe *'Menu'* para comenzar.\n\n"
        "_Estoy aquí para ayudarte cuando lo necesites._ 😊"
    )
    UNKNOWN_OPTION = (
        "🤔 Disculpa, no reconocí esa opción.\n\n"
        "Por favor, responde con el número de la opción que deseas.\n\n"
        "_O escribe 'Menu' para ver las opciones nuevamente._"
    )
    
    # Menu
    MENU_GREETING = (
        "👋 *¡Hola! Bienvenido a Revitek* 🚗✨\n\n"
        "Soy tu asistente virtual y estoy aquí para ayudarte. "
        "Puedo ayudarte a agendar servicios, consultar tus reservas o conectarte con nuestro equipo.\n\n"
        "*¿Qué te gustaría hacer hoy?*\n\n"
        "1️⃣  Agendar un nuevo servicio\n"
        "2️⃣  Consultar mis reservas activas\n"
        "3️⃣  Hablar con un ejecutivo\n\n"
        "_💡 Escribe el número de tu opción o escribe *'Menu'* en cualquier momento para volver aquí._"
    )
    MENU_RESET = "🔄 Perfecto, volvamos al inicio.\n\n"
    MENU_HUMAN_HANDOFF = (
        "👨‍💻 *Perfecto, entendido.*\n\n"
        "Un miembro de nuestro equipo revisará tu consulta y se pondrá en contacto contigo a la brevedad.\n\n"
        "📞 Si tu consulta es urgente, puedes llamarnos directamente al *+56 9 XXXX XXXX*.\n\n"
        "_Gracias por confiar en Revitek._"
    )

    # Service Selection
    SERVICE_LIST_HEADER = (
        "🛠️ *Nuestros Servicios Disponibles*\n\n"
        "_Contamos con servicios de alta calidad para el cuidado de tu vehículo:_\n\n"
    )
    SERVICE_LIST_FOOTER = (
        "\n━━━━━━━━━━━━━━━\n"
        "👇 *¿Cuál servicio te interesa?*\n"
        "Responde con el número correspondiente.\n\n"
        "_Escribe 'Menu' para volver al inicio._"
    )
    SERVICE_SELECTED = (
        "✅ *Excelente elección*\n\n"
        "Has seleccionado: *{service_name}*\n"
        "💰 Valor: ${price}\n\n"
        "📅 *¿Para qué fecha deseas agendar?*\n\n"
        "Por favor, escribe la fecha en el siguiente formato:\n"
        "*DD/MM/AAAA* (Ejemplo: 15/12/2025)\n\n"
        "_💡 Tip: Asegúrate de agendar con al menos 24 horas de anticipación._"
    )
    SERVICE_INVALID_OPTION = (
        "⚠️ *Ups*, ese número no corresponde a ningún servicio de la lista.\n\n"
        "Por favor, verifica e intenta nuevamente con un número del 1 al {count}."
    )
    SERVICE_FORMAT_ERROR = (
        "❌ *Formato incorrecto*\n\n"
        "Por favor, responde solo con el *número* del servicio que deseas (por ejemplo: 1, 2, 3...).\n\n"
        "_Si necesitas ver la lista nuevamente, escribe 'Menu'._"
    )
    SERVICE_NONE_SELECTED = "⚠️ No se ha seleccionado un servicio. Escribe 'Menu' para reiniciar."

    # Date Selection
    DATE_PAST_ERROR = (
        "⚠️ *Fecha no válida*\n\n"
        "La fecha que ingresaste ya pasó. \n\n"
        "Por favor, ingresa una fecha *futura* en formato DD/MM/AAAA.\n"
        "Ejemplo: {next_day}"
    )
    DATE_TOO_FAR_ERROR = (
        "⚠️ *Fecha muy lejana*\n\n"
        "Por el momento solo aceptamos reservas hasta 3 meses en adelante.\n\n"
        "Por favor, elige una fecha antes del {max_date}."
    )
    DATE_FORMAT_ERROR = (
        "❌ *Formato de fecha incorrecto*\n\n"
        "No pude entender la fecha que ingresaste.\n\n"
        "Por favor, usa exactamente este formato: *DD/MM/AAAA*\n\n"
        "*Ejemplos válidos:*\n"
        "• 03/12/2025\n"
        "• 15/01/2026\n\n"
        "_Intenta nuevamente._"
    )
    DATE_NO_SLOTS = (
        "😔 *Lo sentimos*\n\n"
        "No hay horarios disponibles para el {date}.\n\n"
        "Por favor, intenta con otra fecha escribiendo 'Menu' y seleccionando nuevamente."
    )

    # Time Selection
    TIME_SLOTS_HEADER = (
        "🕒 *Horarios Disponibles*\n"
        "📅 {date}\n\n"
        "_Estos son los bloques horarios que tenemos disponibles:_\n\n"
    )
    TIME_SLOTS_FOOTER = (
        "\n━━━━━━━━━━━━━━━\n"
        "👇 *¿Qué horario prefieres?*\n"
        "Responde con el número de tu preferencia.\n\n"
        "_Si ninguno te acomoda, escribe 'Menu' para elegir otra fecha._"
    )
    TIME_SELECTED = (
        "⏰ *Horario seleccionado: {time_label}*\n\n"
        "Un momento por favor, estoy verificando la disponibilidad y procesando tu reserva...\n\n"
        "_Esto tomará solo unos segundos._ ⚙️"
    )
    TIME_INVALID_OPTION = (
        "⚠️ *Opción no válida*\n\n"
        "Por favor, elige un número del 1 al {count} según los horarios mostrados.\n\n"
        "_O escribe 'Menu' si deseas cambiar la fecha._"
    )
    TIME_FORMAT_ERROR = (
        "❌ *Formato incorrecto*\n\n"
        "Por favor, responde solo con el *número* del horario."
    )
    TIME_SESSION_EXPIRED = (
        "⚠️ *Sesión expirada o inválida*\n\n"
        "Por favor, escribe 'Menu' para comenzar de nuevo."
    )

    # Email / Registration
    EMAIL_REQUEST = (
        "👋 *¡Hola!*\n\n"
        "Veo que es tu primera vez usando nuestro asistente virtual (o quizás cambiaste de número).\n\n"
        "📧 *Para continuar con tu reserva, necesito que me proporciones tu correo electrónico:*\n\n"
        "Esto nos permitirá:\n"
        "• Enviarte confirmaciones\n"
        "• Mantener un historial de tus servicios\n"
        "• Comunicarnos contigo si hay algún cambio\n\n"
        "_Por favor, escribe tu correo electrónico._"
    )
    EMAIL_INVALID = (
        "❌ *Correo no válido*\n\n"
        "El formato del correo electrónico no es correcto.\n\n"
        "*Ejemplos válidos:*\n"
        "• juan.perez@gmail.com\n"
        "• maria@empresa.cl\n\n"
        "Por favor, verifica e intenta nuevamente."
    )
    EMAIL_LINKED = (
        "✅ *¡Cuenta vinculada exitosamente!*\n\n"
        "Bienvenido de vuelta, *{name}*. 👋\n\n"
        "Continuemos con tu reserva..."
    )
    EMAIL_CREATED = (
        "✅ *¡Cuenta creada exitosamente!*\n\n"
        "Hemos registrado tu correo: {email}\n\n"
        "Ahora formas parte de la familia Revitek. 🎉\n\n"
        "Continuemos con tu reserva..."
    )

    # Address
    ADDRESS_REQUEST = (
        "📍 *¿A qué dirección debemos ir?*\n\n"
        "Por favor, escribe la dirección exacta donde realizaremos el servicio (Calle, Número, Comuna).\n\n"
        "_Ejemplo: Av. Providencia 1234, Depto 505, Providencia_"
    )

    # Confirmation
    CONFIRMATION_LINK_MSG = (
        "✅ *¡Tu reserva ha sido aprobada!*\n\n"
        "📋 *Detalles:*\n"
        "• Servicio: {service_names}\n"
        "• Fecha: {date}\n"
        "• Hora: {time}\n\n"
        "⚠️ *Importante:* Para confirmar tu asistencia, haz clic en el siguiente enlace:\n\n"
        "{url}\n\n"
        "⏰ Este enlace expira en 2 horas.\n"
        "Si no confirmas, tu reserva será cancelada."
    )
    CONFIRMATION_INTERACTIVE_BODY = (
        "👋 Hola {name},\n\n"
        "Te recordamos que tienes una reserva programada con *Revitek*.\n\n"
        "🔧 *Servicio:* {service_names}\n"
        "📅 *Fecha:* {date}\n"
        "⏰ *Hora:* {time}\n\n"
        "Nuestro equipo acudirá a tu dirección (o ubicación acordada) para realizar el servicio o retiro del vehículo.\n\n"
        "Por favor, confirma que podremos ser recibidos en el horario agendado."
    )
    CONFIRMATION_SUCCESS = "¡Excelente! Tu reserva ha sido re-confirmada. Nuestro equipo estará en tu dirección en el horario acordado."
    CONFIRMATION_CANCELLED = "Entendido, tu reserva ha sido cancelada. Esperamos poder atenderte en otra oportunidad."
    CONFIRMATION_ALREADY_CANCELLED = "Lo sentimos, esta reserva ya estaba cancelada."
    CONFIRMATION_NOT_FOUND = "No pudimos encontrar la reserva asociada a esta acción."

    # Final Booking Confirmation
    BOOKING_CONFIRMED = (
        "🎉 *¡RESERVA CONFIRMADA!*\n\n"
        "━━━━━━━━━━━━━━━\n"
        "📋 *DETALLES DE TU RESERVA*\n\n"
        "🆔 Código: *#{id}*\n"
        "👤 Cliente: *{client_name}*\n\n"
        "🔧 Servicio: *{service_name}*\n"
        "💰 Valor: ${price}\n"
        "⏱ Duración aprox: {duration} minutos\n\n"
        "📅 Fecha: *{date}*\n"
        "⏰ Hora: *{time}*\n"
        "👨‍🔧 Profesional: {pro_name}\n\n"
        "━━━━━━━━━━━━━━━\n\n"
        "📍 *Ubicación del Servicio:*\n"
        "{address}\n\n"
        "🚚 Nuestro equipo irá a buscar tu vehículo a esta dirección.\n\n"
        "*📝 Recomendaciones:*\n"
        "• Ten tu vehículo listo 5-10 minutos antes\n"
        "• Ten a mano tu cédula de identidad\n"
        "• Si tienes algún documento del vehículo, facilítalo al profesional\n\n"
        "*¿Necesitas hacer cambios?*\n"
        "Escríbenos o llama al +56 9 XXXX XXXX\n\n"
        "_¡Gracias por confiar en Revitek! Nos vemos pronto._ 🚗✨"
    )
