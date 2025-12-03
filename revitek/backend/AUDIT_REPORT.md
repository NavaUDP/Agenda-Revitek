# 🕵️‍♂️ Informe de Auditoría Backend - Agenda Revitek

**Fecha:** 02 de Diciembre, 2025
**Objetivo:** Inspección profunda de arquitectura, seguridad, calidad de código y rendimiento.

---

## 1. Resumen Ejecutivo

El backend presenta una estructura sólida basada en Django REST Framework, con una buena separación de responsabilidades por módulos (`apps`). La lógica de negocio principal (agendamiento) es robusta, manejando zonas horarias y concurrencia básica.

Sin embargo, existen **vulnerabilidades de seguridad críticas** relacionadas con la configuración (secretos hardcodeados) y **deuda técnica** en el módulo de WhatsApp (lógica mockeada, URLs hardcodeadas) que impiden un despliegue a producción seguro y funcional.

---

## 2. Hallazgos Críticos (Prioridad Alta) 🚨

### 2.1. Seguridad y Configuración
*   **Secretos Hardcodeados:** `SECRET_KEY`, `DEBUG=True`, `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` están definidos directamente en `settings.py`.
    *   *Riesgo:* Exposición de credenciales, ejecución en modo debug en producción (fuga de información), vulnerabilidad a ataques de host header.
*   **Base de Datos No Portable:** La configuración de `DATABASES` depende de un archivo local `.my_pgpass` y un servicio `revitek_service`.
    *   *Problema:* Impide el despliegue en entornos estándar (Railway, Docker) sin modificaciones manuales.

### 2.2. Funcionalidad WhatsApp
*   **URL de Confirmación Hardcodeada:** En `apps/whatsapp/services.py`, la URL se genera como `http://localhost:5173/confirmar/{token}`.
    *   *Problema:* Los usuarios recibirán enlaces rotos en producción.
*   **Lógica Mockeada en Chatbot:** El método `handle_time_selection` y `send_time_slots` en `ChatBot` usa horarios falsos (`["09:00", "10:00", ...]`) en lugar de consultar la disponibilidad real (`get_available_slots`).
    *   *Problema:* El chatbot permite agendar en horarios ocupados o inexistentes.

---

## 3. Análisis Detallado

### 3.1. Arquitectura y Estructura
*   ✅ **Bueno:** Uso correcto de `apps/` para modularizar (agenda, clientes, catalogo, whatsapp).
*   ✅ **Bueno:** Uso de `Services` (`apps/agenda/services.py`) para encapsular lógica compleja de slots.
*   ⚠️ **Mejorable:** `settings.py` monolítico. Se recomienda dividir en `base.py`, `local.py`, `production.py` o usar `django-environ` extensivamente.

### 3.2. Modelos y Base de Datos
*   ✅ **Bueno:** Uso de `UUID` para tokens de confirmación.
*   ✅ **Bueno:** Índices (`db_index=True`) en campos de búsqueda frecuente (`date`, `start`, `status`).
*   ⚠️ **Observación:** La tabla `Slot` crece linealmente. Para 10 profesionales a 30 días con slots de 1h, son ~2,400 registros/mes. Es manejable, pero requiere un job de limpieza para datos históricos antiguos.
*   ⚠️ **Observación:** `Reservation` tiene relaciones `SET_NULL` con `User`, `Vehicle`, `Address`. Esto preserva el historial si se borra el usuario, pero puede dejar datos huérfanos.

### 3.3. Calidad de Código
*   ✅ **Bueno:** Nombres de variables y funciones descriptivos.
*   ❌ **Mala Práctica:** `print()` statements usados para logging (ej: en `verify_recaptcha` y `MetaClient`). En producción estos logs pueden perderse o ensuciar la salida estándar. Usar `logging` module.
*   ❌ **Mala Práctica:** Búsqueda de usuario por teléfono en Chatbot (`find_user_by_phone`) es ineficiente (itera sobre todos los usuarios y compara strings).

### 3.4. Rendimiento
*   ⚠️ **N+1 Query Potential:** En `compute_aggregated_availability`, aunque se filtra bien, la lógica de intersección se hace en Python. Para alto volumen, esto debería moverse a consultas SQL/ORM más avanzadas.
*   ✅ **Bueno:** `generate_daily_slots` usa `bulk_create` (indirectamente vía lógica) y maneja transacciones atómicas.

---

## 4. Propuesta de Mejoras 🛠️

### Fase 1: Seguridad y Configuración (Inmediato)
1.  **Implementar `django-environ`:**
    *   Reemplazar `SECRET_KEY`, `DEBUG`, `DB_CONFIG` por `env('VARIABLE')`.
    *   Crear `.env.example` actualizado.
2.  **Configurar Base de Datos Dinámica:**
    *   Usar `dj-database-url` para leer `DATABASE_URL` en producción.
3.  **Externalizar URL Frontend:**
    *   Agregar `FRONTEND_URL` a `settings.py` y usarla en `apps/whatsapp/services.py`.

### Fase 2: Corrección Funcional (Corto Plazo)
1.  **Conectar Chatbot a Disponibilidad Real:**
    *   Refactorizar `ChatBot.send_time_slots` para llamar a `apps.agenda.services.get_available_slots`.
    *   Asegurar que el chatbot respete las reglas de negocio (duración de servicio).
2.  **Logging Estándar:**
    *   Reemplazar `print(f"...")` por `logger.info(...)` o `logger.error(...)`.

### Fase 3: Optimización y Refactor (Mediano Plazo)
1.  **Optimizar Búsqueda de Usuario:**
    *   Normalizar teléfonos al guardar en `User` (ej: guardar siempre `56912345678`).
    *   Hacer la búsqueda por query directa: `User.objects.get(phone=normalized_phone)`.
2.  **Job de Limpieza:**
    *   Crear comando `cleanup_old_slots` para borrar slots de fechas pasadas (> 3 meses) y mantener la tabla ligera.

---

## 5. Conclusión

El backend está en un estado de **"Prototipo Funcional Avanzado"**. La lógica core es sólida, pero la capa de configuración y la integración con WhatsApp necesitan trabajo profesional para ser viables en producción. Aplicando las mejoras de la Fase 1 y 2, el sistema será seguro y funcional.
