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

# Copilot Instructions — Agenda-Revitek

Purpose: quickly orient an AI coding agent so it can make safe, high-value edits in this monorepo (frontend: React + Vite; backend: Django + DRF).

Core layout (big picture)
- Frontend: `revitek/front/` — Vite + React + TypeScript. Key entry points: `src/main.tsx`, routing at `src/routes/AppRoutes.tsx`, API clients in `src/api/` (e.g. `agenda.ts`, `servicios.ts`). Booking UI: `src/pages/ClientBookingPage.tsx`, `components/AppointmentModal.tsx`, `components/ServiceCard.tsx`.
- Backend: `revitek/server/` — Django + DRF. Root settings: `server/server/settings.py`; URL conf: `server/server/urls.py`. Apps live under `server/apps/` (e.g. `agenda`, `catalogo`, `estados`, `notificaciones`, `profesionales`, `usuarios`, `chatbot`).

Where business logic lives
- Use `services.py` inside an app for non-HTTP business rules (example: `server/apps/agenda/services.py` contains availability & overbooking logic).
- Serializers validate/create API payloads (`server/apps/*/serializers.py`).
- Views are thin: orchestrate auth/serialization and call service functions (`server/apps/agenda/views.py`).
- Signals are used to enqueue notifications and side effects (`server/apps/agenda/signals.py`).

Developer workflows (commands you should run when changing behavior)
- Frontend dev: `cd revitek/front && npm i && npm run dev` (build: `npm run build`, lint: `npm run lint`).
- Backend dev: `cd revitek/server && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`.
- Tests: backend unit tests via `python manage.py test <app>` (e.g. `server.apps.agenda`); run focused tests after edits.
- Seed/demo: `python scripts/seed_demo_data.py` (check `server/` for script path before running).

Project-specific conventions (do these exactly)
- Prefer adding business rules to `services.py`, not views. Views should remain thin.
- Use DRF serializers for full validation and atomic create/update in `create()` or `validate()` methods. When preventing overlaps, enforce DB transaction/locking in serializer or service.
- Notifications are queued from signals — avoid calling integrations (WhatsApp/email) directly inside views/tests; prefer signal handlers and task queues (`server/integrations/` and `server/apps/notificaciones/tasks.py`).
- Frontend: use `src/api/*` clients and `src/hooks/useAgendaApi.ts` for server interactions. Update both client + API when changing endpoints.

Integration points to watch
- WhatsApp/email: `server/integrations/whatsapp/`, `server/apps/notificaciones/` (templates at `server/notifications/templates/`).
- Authentication: check `revitek/front/src/context/AuthContext.tsx` and backend auth settings in `server/server/settings.py`.

Quick examples (copy-paste references)
- Availability logic: `server/apps/agenda/services.py`
- Booking view/serializer: `server/apps/agenda/views.py`, `server/apps/agenda/serializers.py`
- Frontend booking page: `revitek/front/src/pages/ClientBookingPage.tsx`
- API client: `revitek/front/src/api/agenda.ts`
- Admin layout: `revitek/front/src/layouts/AdminLayout.tsx`

Safe edit checklist for AI
1. Run backend tests for the app you modified: `python manage.py test server.apps.<app>`.
2. If you changed an API, update `revitek/front/src/api/*` and run the frontend dev server to smoke-test flows.
3. Keep changes small and modular: add a unit test for new service logic and a serializer test.
4. Do not hardcode secrets or credentials — config lives in Django settings or environment; use settings references.

If something is unclear or you'd like this file to include additional examples (e.g., a short sample PR checklist or test commands), tell me which area to expand and I will iterate.
  - Acceptance: Given `service_id` and optional `professional_id`, endpoint returns available time slots for next 30 days in ISO datetime array.

  - Notes: Availability must respect professional working hours and existing bookings (see `overbooking` logic in `services.py`).
