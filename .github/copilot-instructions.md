# Copilot Instructions for Agenda-Revitek

## Project Overview
  - **Frontend** (`revitek/front/`): Vite + React + TypeScript, Tailwind CSS, shadcn-ui. Contains reusable UI, pages, hooks, and API clients for Django backend.
  - **Backend** (`revitek/server/`): Django + Django REST Framework (DRF). Modular apps for agenda, catalogo, estados, notificaciones, usuarios, chatbot, etc.

## Architecture & Data Flow

## Developer Workflows
  - Install: `cd revitek/front && npm i`
  - Dev server: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Main entry: `src/main.tsx`, routes in `src/routes/AppRoutes.tsx`
  - Install: `cd revitek/server && pip install -r requirements.txt`
  - Run: `python manage.py runserver`
  - Migrate: `python manage.py migrate`
  - Test: `python manage.py test`
  - Seed demo data: `python scripts/seed_demo_data.py`
  - Main entry: `server/server/settings.py`, URLs in `server/server/urls.py`

## Conventions & Patterns
  - API calls: Use hooks in `src/hooks/` and clients in `src/api/`.
  - Context: Auth, booking, chatbot state in `src/context/`.
  - UI: Reusable components in `src/components/`, forms in `src/components/forms/`, tables in `src/components/tables/`.
  - Routing: Centralized in `src/routes/`.
  - Apps are modular, each with `models.py`, `serializers.py`, `views.py`, `urls.py`, `tests.py`.
  - Shared logic/utilities in `server/common/`.
  - Integrations (WhatsApp, email) in `server/integrations/`.
  - Message templates in `server/notifications/templates/`.
  - Overbooking/block logic in `server/apps/agenda/services.py`.
  - Signals for notifications/state updates in `server/apps/agenda/signals.py`.

## Integration Points

## Examples

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

## Requirements & Implementation (focus: admin + client)

Below are the project's concrete requirements (RFs) with where to change code, acceptance criteria, and implementation notes. Use these as the single-source mapping for work tickets and PRs.

- RF-C01 — Lista de servicios
  - Backend: `server/apps/catalogo/` or `server/apps/servicios/` (check `models.py`, `views.py`, `serializers.py`).
  - Frontend: `revitek/front/src/api/servicios.ts`, UI: `revitek/front/src/pages/Index.tsx`, component `ServiceCard.tsx`.
  - Acceptance: GET `/api/servicios/` returns list with fields (id, name, duration, price, description). Frontend displays cards with link to booking.
  - Notes: Ensure serializer exposes duration (minutes) and price (number). Add pagination if >50 services.

- RF-C02 — Seleccionar servicio y ver disponibilidad
  - Backend: availability endpoint in `server/apps/agenda/views.py` (filter by servicio and professional), helper logic in `server/apps/agenda/services.py`.
  - Frontend: booking calendar in `revitek/front/src/pages/ClientBookingPage.tsx` and `AppointmentModal.tsx`.
  - Acceptance: Given `service_id` and optional `professional_id`, endpoint returns available time slots for next 30 days in ISO datetime array.
  - Notes: Availability must respect professional working hours and existing bookings (see `overbooking` logic in `services.py`).

- RF-C03 — Agendamiento
  - Backend: POST `/api/agenda/` handled by `server/apps/agenda/serializers.py` and `views.py` (create appointment). Validate conflicts and create notification signal in `server/apps/agenda/signals.py`.
  - Frontend: booking form in `ClientBookingPage.tsx` posts to `src/api/agenda.ts` and shows confirmation modal.
  - Acceptance: Successful create returns 201 with appointment id, service, datetime, professional, client info; no overlap allowed (atomic DB transaction).

- RF-C04 — Confirmación de reserva (deseable)
  - Backend: Notification/email in `server/apps/notificaciones/` triggered by signals. Templates: `server/notifications/templates/`.
  - Frontend: Confirmation UI in booking flow; show printable details and reservation identifier.
  - Acceptance: On create, email send job scheduled (or mocked in dev). Frontend shows reservation id and confirmation message.

- RF-C05 — Cancelar cita (opcional)
  - Backend: PATCH/DELETE `/api/agenda/{id}/` in `views.py`. Enforce 24h rule in view/serializer validation.
  - Frontend: Cancel action in reservation view; require reservation id and confirmation.
  - Acceptance: Cancels only if >24 hours before appointment start; returns 200 and schedules cancellation notifications.

- RF-C06 — Seguimiento de servicio
  - Backend: `server/apps/estados/` exposes state lookup by reservation id.
  - Frontend: `src/pages/Estado/` lookup form uses `src/api/estados.ts`.
  - Acceptance: Given reservation id, returns current status (Reserved, In Workshop, In Progress, Ready) and changelog.

- RF-C07 — Chatbot
  - Backend: `server/apps/chatbot/` (engine, serializers, views). Provide endpoints `/api/chatbot/` to fetch tree and to progress conversation.
  - Frontend: `revitek/front/src/components/Chatbot/` — lightweight widget that can request services and start booking.
  - Acceptance: Chatbot can list services and open booking modal with service preselected.

- RF-A01..RF-A08 — Admin features
  - Backend: Admin APIs live across `server/apps/agenda/`, `server/apps/profesionales/`, `server/apps/usuarios/`, and `server/apps/catalogo/`.
  - Frontend: Admin UI under `revitek/front/src/pages/Admin/` and layout `AdminLayout.tsx`.
  - Key files: appointment views in `server/apps/agenda/views.py`, professionals in `server/apps/profesionales/views.py`, users in `server/apps/usuarios/`.
  - Acceptance (sample):
    - RF-A01: Admin calendar returns appointments filtered by day/week/month with pagination and optional professional filter.
    - RF-A02: Admin can create/modify/cancel appointments via API and UI; operations must be audited (created_by, modified_by).
    - RF-A03/A04: Service CRUD endpoints and admin UI; deleting a service should prevent deletion if future appointments exist (return 400).
    - RF-A05/A06: Admin can create users and view their booking history via `/api/usuarios/` and `/api/agenda/?user_id=`.
    - RF-A07: Professionals CRUD with working schedule fields used by availability logic.
    - RF-A08: Admin can update appointment/service state; changes propagate to `estados` and trigger notifications.

- RF-A09 — WhatsApp reminders (24h)
  - Backend: Integration code in `server/integrations/whatsapp/`. Use Celery scheduled task `server/apps/notificaciones/tasks.py` or Django management command `scripts/send_reminders.py` for cron.
  - Acceptance: Reminders are scheduled and a message (template id + variables) is sent 24 hours before appointment; log send attempts and failures.

Implementation notes and quick commands
- Run backend locally

```bash
cd revitek/server
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

- Run frontend

```bash
cd revitek/front
npm i
npm run dev
```

- Tests
  - Backend: `python manage.py test server.apps.agenda` (or specific app)
  - Frontend: `npm run test` (if configured) or add vitest/jest tests in `revitek/front/src/__tests__`.

Quick PR checklist for RF work
- Add/modify API endpoints in correct app; add serializer and view tests.
- Update `revitek/front/src/api/*` to match new endpoints.
- Add front page/component for the flow and link from nav.
- Seed demo data or add fixtures for new models.
- Update `.github/copilot-instructions.md` mapping if you add new apps or change boundaries.

If you'd like, I can now:
- generate endpoint stubs for any RF you pick (backend views, serializers, minimal tests), or
- scaffold corresponding frontend pages/components and API client methods.

