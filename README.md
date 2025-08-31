# Agenda-Revitek

hay que agregar un .gitignore con node_modules y serverenv

Cómo mapea esto tus historias y endpoints

Landing “/”: client/pages/Home.jsx con DecisionTreeWidget embebido.
Agenda “/reservas”: flujo PasoSeleccion → Confirmacion usando TimeSlotGrid, SelectProfesional y SelectServicios; bloqueo en server/apps/agenda/services.py.
Recordatorios “/recordatorio”: client/pages/Recordatorio/index.jsx consume /api/recordatorios/ (programación/envío inmediato); backend en notificaciones/ con WhatsApp Business.
Admin: CRUD y asignaciones en client/pages/Admin/* (profesionales, servicios, asignaciones, calendario admin con reservas multi-profesional).
Estados: client/pages/Estado/* para que el cliente consulte progreso; backend apps/estados/.
Chatbot binario: editor en Admin/ChatbotBuilder.jsx; motor y persistencia en apps/chatbot/.

tree del proyecto:

├── client/                                  # Frontend: Vite + React + React Router
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   │   └── logo.png
│   └── src/
│       ├── api/                              # Llamadas al backend (DRF)
│       │   ├── auth.jsx
│       │   ├── profesionales.jsx             # CRUD profesionales, disponibilidad
│       │   ├── servicios.jsx                 # CRUD servicios, asignaciones
│       │   ├── reservas.jsx                  # slots, crear/cancelar, calendario
│       │   ├── recordatorios.jsx             # programar/enviar recordatorios
│       │   ├── estados.jsx                   # estado de órdenes/reservas
│       │   └── chatbot.jsx                   # flujos y mensajes del árbol binario
│       ├── components/                       # UI reutilizable
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   ├── Sidebar.jsx
│       │   ├── StatBox.jsx
│       │   ├── Calendar/TimeSlotGrid.jsx     # grilla de bloques, bloqueo visual
│       │   ├── SelectProfesional.jsx
│       │   ├── SelectServicios.jsx
│       │   ├── EstadoBadge.jsx               # Completado/En progreso/Pendiente de pago/Cancelado/Reservado
│       │   ├── ReservaSummaryCard.jsx
│       │   ├── Chatbot/DecisionTreeWidget.jsx# widget embebible (landing y reservas)
│       │   ├── Chatbot/DecisionNodeEditor.jsx# editor de nodos para admin
│       │   ├── Forms/
│       │   │   ├── ReservaForm.jsx
│       │   │   ├── ProfesionalForm.jsx
│       │   │   └── ServicioForm.jsx
│       │   └── Tables/
│       │       ├── ProfesionalesTable.jsx
│       │       ├── ServiciosTable.jsx
│       │       └── ReservasTable.jsx
│       ├── context/
│       │   ├── Theme.jsx
│       │   ├── AuthProvider.jsx
│       │   ├── BookingProvider.jsx           # estado de selección de slots/servicios
│       │   └── ChatbotProvider.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useCalendario.js              # carga/actualiza disponibilidad
│       │   ├── useRecordatorios.js
│       │   └── useChatbot.js
│       ├── layouts/
│       │   ├── PublicLayout.jsx
│       │   └── DashboardLayout.jsx
│       ├── pages/
│       │   ├── Home.jsx                      # endpoint "/": landing + widget chatbot
│       │   ├── Reservas/
│       │   │   ├── index.jsx                 # endpoint "/reservas": agenda tipo AgendaPro
│       │   │   ├── PasoSeleccion.jsx         # profesional → servicios → bloque
│       │   │   └── Confirmacion.jsx
│       │   ├── Recordatorio/
│       │   │   └── index.jsx                 # endpoint "/recordatorio": gestión de notificaciones
│       │   ├── Estado/
│       │   │   ├── index.jsx                 # "/estado": consulta por código/placa/ID
│       │   │   └── Detalle.jsx               # "/estado/:id"
│       │   ├── Admin/
│       │   │   ├── Panel.jsx                 # dashboard admin
│       │   │   ├── Profesionales.jsx         # CRUD + disponibilidad
│       │   │   ├── Servicios.jsx             # CRUD servicios
│       │   │   ├── Asignaciones.jsx          # asignar M servicios a N profesionales
│       │   │   ├── CalendarioAdmin.jsx       # reservar bloque con N profesionales
│       │   │   └── ChatbotBuilder.jsx        # editor visual árbol binario
│       │   ├── Login.jsx
│       │   └── NotFound.jsx
│       ├── router/
│       │   └── routes.jsx                    # define "/", "/reservas", "/recordatorio", etc.
│       ├── utils/
│       │   ├── constants.js                  # estados, roles, etc.
│       │   ├── helpers.js
│       │   └── validators.js
│       ├── styles/
│       │   └── globals.css
│       ├── App.jsx
│       └── main.jsx
│
└── server/                                  # Backend: Django + DRF (+ Celery opcional)
    ├── manage.py
    ├── requirements.txt
    ├── .env.example
    ├── server/                               # Proyecto Django
    │   ├── __init__.py
    │   ├── settings.py
    │   ├── urls.py                           # enruta /api/... y drf-spectacular
    │   ├── wsgi.py
    │   └── asgi.py                           # para websockets si usas channels
    ├── apps/
    │   ├── usuarios/                         # auth y roles
    │   │   ├── __init__.py
    │   │   ├── models.py                     # User (Admin/Cliente), Perfil
    │   │   ├── permissions.py
    │   │   ├── serializers.py
    │   │   ├── views.py
    │   │   ├── urls.py
    │   │   └── tests.py
    │   ├── catalogo/                         # profesionales y servicios
    │   │   ├── __init__.py
    │   │   ├── models.py                     # Profesional, Servicio, AsignacionServicio
    │   │   ├── serializers.py
    │   │   ├── views.py                      # CRUD + búsqueda
    │   │   ├── urls.py
    │   │   └── tests.py
    │   ├── agenda/                           # reservas y disponibilidad
    │   │   ├── __init__.py
    │   │   ├── models.py                     # Disponibilidad, BloqueHorario, Reserva
    │   │   ├── services.py                   # lógica de bloqueo/overbooking
    │   │   ├── signals.py                    # post_save → notificar/actualizar estado
    │   │   ├── serializers.py
    │   │   ├── views.py                      # endpoints /api/reservas/, slots, calendario
    │   │   ├── urls.py
    │   │   └── tests.py
    │   ├── estados/                          # estado del servicio/orden
    │   │   ├── __init__.py
    │   │   ├── models.py                     # OrdenServicio (Completado/En progreso/…)
    │   │   ├── serializers.py
    │   │   ├── views.py                      # consulta por código/ID
    │   │   ├── urls.py
    │   │   └── tests.py
    │   ├── notificaciones/                   # WhatsApp Business + emails/SMS opcional
    │   │   ├── __init__.py
    │   │   ├── providers/
    │   │   │   ├── whatsapp_business.py      # integración API oficial (plantillas/hsm)
    │   │   │   └── email.py
    │   │   ├── models.py                     # ProgramacionRecordatorio, LogEnvio
    │   │   ├── tasks.py                      # Celery: envíos programados
    │   │   ├── serializers.py
    │   │   ├── views.py                      # /api/recordatorios/ programar/enviar
    │   │   ├── urls.py
    │   │   └── tests.py
    │   └── chatbot/                          # árbol de decisiones binario
    │       ├── __init__.py
    │       ├── models.py                     # Nodo, Arbol (binario), SesionChat
    │       ├── serializers.py
    │       ├── engine.py                     # motor de navegación sí/no
    │       ├── views.py                      # /api/chatbot/next, CRUD del árbol (admin)
    │       ├── urls.py
    │       └── tests.py
    ├── common/                               # utilidades compartidas
    │   ├── __init__.py
    │   ├── pagination.py
    │   ├── permissions.py
    │   ├── utils.py
    │   └── validators.py
    ├── integrations/
    │   ├── __init__.py
    │   └── whatsapp/
    │       └── client.py                     # cliente HTTP firmado, rate limiting, retries
    ├── notifications/
    │   ├── __init__.py
    │   └── templates/                        # plantillas de mensajes (WA/email)
    │       ├── reserva_creada.txt
    │       ├── recordatorio_24h.txt
    │       └── reserva_actualizada.txt
    ├── schema/
    │   └── openapi.yaml                      # export de drf-spectacular (opcional)
    ├── static/
    ├── media/
    ├── docker/                               # opcional: orquestación
    │   ├── Dockerfile.web
    │   ├── Dockerfile.worker                 # Celery worker
    │   └── docker-compose.yml
    └── scripts/
        ├── seed_demo_data.py                 # crea profesionales/servicios de ejemplo
        └── crontab.example                   # alternativa a Celery Beat (si aplica)

