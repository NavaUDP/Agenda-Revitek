# Copilot Instructions for Agenda-Revitek

## Project Overview
- **Monorepo** with two main components:
  - **Frontend** (`revitek/front/`): Vite + React + TypeScript, Tailwind CSS, shadcn-ui. Contains reusable UI, pages, hooks, and API clients for Django backend.
  - **Backend** (`revitek/server/`): Django + Django REST Framework (DRF). Modular apps for agenda, catalogo, estados, notificaciones, usuarios, chatbot, etc.

## Architecture & Data Flow
- **Frontend** calls backend via REST endpoints (see `src/api/` for agenda, profesionales, servicios, estados, recordatorios, chatbot).
- **Backend** exposes `/api/` endpoints, organized by app (see `server/apps/*/views.py`, `urls.py`).
- **Chatbot**: Binary decision tree, editable in admin UI, engine in `server/apps/chatbot/engine.py`.
- **Notifications**: WhatsApp Business integration via `server/integrations/whatsapp/client.py` and message templates in `server/notifications/templates/`.
- **Admin**: CRUD and assignment flows for professionals/services, multi-professional calendar, chatbot builder.

## Developer Workflows
- **Frontend**
  - Install: `cd revitek/front && npm i`
  - Dev server: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Main entry: `src/main.tsx`, routes in `src/routes/AppRoutes.tsx`
- **Backend**
  - Install: `cd revitek/server && pip install -r requirements.txt`
  - Run: `python manage.py runserver`
  - Migrate: `python manage.py migrate`
  - Test: `python manage.py test`
  - Seed demo data: `python scripts/seed_demo_data.py`
  - Main entry: `server/server/settings.py`, URLs in `server/server/urls.py`

## Conventions & Patterns
- **Frontend**
  - API calls: Use hooks in `src/hooks/` and clients in `src/api/`.
  - Context: Auth, booking, chatbot state in `src/context/`.
  - UI: Reusable components in `src/components/`, forms in `src/components/forms/`, tables in `src/components/tables/`.
  - Routing: Centralized in `src/routes/`.
- **Backend**
  - Apps are modular, each with `models.py`, `serializers.py`, `views.py`, `urls.py`, `tests.py`.
  - Shared logic/utilities in `server/common/`.
  - Integrations (WhatsApp, email) in `server/integrations/`.
  - Message templates in `server/notifications/templates/`.
  - Overbooking/block logic in `server/apps/agenda/services.py`.
  - Signals for notifications/state updates in `server/apps/agenda/signals.py`.

## Integration Points
- **WhatsApp Business**: `server/integrations/whatsapp/client.py` (API integration, rate limiting, retries).
- **Celery** (optional): For scheduled notifications (`server/apps/notificaciones/tasks.py`).
- **OpenAPI**: Optional spec in `server/schema/openapi.yaml`.
- **Docker**: Compose and Dockerfiles in `server/docker/` for web/worker orchestration.

## Examples
- To add a new agenda feature: Update `server/apps/agenda/` (models, views, serializers, urls), expose endpoint, update frontend API client in `src/api/agenda.ts`, and UI in `src/pages/Reservas/`.
- To add a notification template: Add file to `server/notifications/templates/`, update logic in `server/apps/notificaciones/`.

## References


## Functional Requirements

### Client (User) Side
| ID      | Name                        | Description                                                                                  | Status      |
|---------|-----------------------------|----------------------------------------------------------------------------------------------|-------------|
| RF-C01  | Lista de servicios          | View all services offered. Endpoint: `/api/servicios/`, UI: `src/pages/Index.tsx`            | Obligatorio |
| RF-C02  | Seleccionar servicio        | Select service and view available slots. `/api/agenda/`, UI: `src/pages/Reservas/`           | Obligatorio |
| RF-C03  | Agendamiento                | Book appointment, fill form. `/api/agenda/`, UI: `src/pages/Reservas/`                       | Obligatorio |
| RF-C04  | Confirmación de reserva     | Show confirmation, send email. `/api/agenda/`, `/api/notificaciones/`, UI: confirmation modal| Deseable    |
| RF-C05  | Cancelar cita               | Cancel appointment by ID. `/api/agenda/`, UI: `src/pages/Reservas/`                          | Opcional    |
| RF-C06  | Seguimiento de servicio     | Check real-time status. `/api/estados/`, UI: `src/pages/Estado/`                             | Obligatorio |
| RF-C07  | Interacción con Chatbot     | Chatbot for queries and booking. `/api/chatbot/`, UI: `src/components/Chatbot/`              | Deseable    |

### Admin Side
| ID      | Name                        | Description                                                                                  | Status      |
|---------|-----------------------------|----------------------------------------------------------------------------------------------|-------------|
| RF-A01  | Visualización de citas      | View all appointments (day/week/month). `/api/agenda/`, UI: `src/pages/Admin/Panel.tsx`      | Obligatorio |
| RF-A02  | Gestión de citas            | Admin can book, modify, cancel appointments. `/api/agenda/`, UI: `src/pages/Admin/Panel.tsx` | Obligatorio |
| RF-A03  | Crear Servicio              | Create new service. `/api/servicios/`, UI: `src/pages/Admin/Servicios.tsx`                   | Obligatorio |
| RF-A04  | Editar/Eliminar servicio    | Edit/delete service. `/api/servicios/`, UI: `src/pages/Admin/Servicios.tsx`                  | Obligatorio |
| RF-A05  | Registrar cliente           | Manually register client. `/api/usuarios/`, UI: `src/pages/Admin/Profesionales.tsx`          | Obligatorio |
| RF-A06  | Consultar info de clientes  | Search/view client info/history. `/api/usuarios/`, UI: `src/pages/Admin/Profesionales.tsx`   | Deseable    |
| RF-A07  | Gestión de trabajadores     | Manage worker profiles. `/api/profesionales/`, UI: `src/pages/Admin/Profesionales.tsx`       | Obligatorio |
| RF-A08  | Actualizar Estado de Servicio| Change service status. `/api/estados/`, UI: `src/pages/Admin/Panel.tsx`                      | Obligatorio |
| RF-A09  | Envío de Recordatorios      | WhatsApp reminders 24h before. `/api/recordatorios/`, integration: `server/integrations/whatsapp/` | Obligatorio |

**Feedback:** If any section is unclear or missing, please specify what needs improvement or what additional context is needed.
