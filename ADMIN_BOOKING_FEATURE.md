# Funcionalidad de Reservas y Bloqueos para Administradores

## Descripción General

Esta funcionalidad permite a los administradores crear citas completas con toda la información del cliente (igual que la vista de cliente) o bloquear franjas horarias para que no estén disponibles para reservas.

## Componentes Creados/Modificados

### 1. AdminBookingModal.tsx (NUEVO)
**Ubicación:** `revitek/front/src/components/AdminBookingModal.tsx`

**Características:**
- Modal completo con dos modos: **Cita** o **Bloqueo**
- Formulario de cita con todos los campos del cliente:
  - Información del Cliente: nombre, apellido, email, teléfono
  - Vehículo: patente, marca, modelo
  - Dirección: dirección completa, comuna
  - Servicios: selección múltiple con checkboxes
  - Observaciones: campo de texto libre
- Formulario de bloqueo:
  - Razón del bloqueo (textarea)
- Horarios editables: inicio y fin con input datetime-local
- Validación completa con mensajes de error
- Diseño responsive con iconos de Lucide

**Props:**
```typescript
interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AdminBookingData) => void;
  selectionInfo: DateSelectArg | null;
  availableServices: Array<{ id: number; nombre: string; duracion_min: number }>;
}
```

### 2. AgendaPage.tsx (MODIFICADO)
**Ubicación:** `revitek/front/src/pages/AgendaPage.tsx`

**Cambios realizados:**
- Reemplazado `AppointmentModal` por `AdminBookingModal`
- Agregado `useEffect` para cargar servicios disponibles desde `/api/catalogo/servicios`
- Función `handleConfirmAppointment` actualizada para manejar:
  - **Tipo Cita**: Crea reserva completa con API `/api/agenda/reservas/`
  - **Tipo Bloqueo**: Bloquea slots con API `/api/agenda/slots/block`
- Implementada función `findMatchingSlotId` para buscar el slot correcto automáticamente
- Agregados eventos visuales al calendario después de crear cita/bloqueo

### 3. AdminLayout.tsx (MODIFICADO)
**Ubicación:** `revitek/front/src/layouts/AdminLayout.tsx`

**Cambios realizados:**
- Agregada función `loadBlockedSlots()` que carga slots bloqueados de los próximos 30 días
- Modificado `useEffect` para cargar profesionales, reservas y slots bloqueados en paralelo
- Los slots bloqueados se muestran como eventos de fondo (gris) en el calendario
- Agregado campo `display?: 'background' | 'auto'` en tipo `CalendarEvent`

## Backend - APIs Creadas

### 1. Block Slots Endpoint
**Endpoint:** `POST /api/agenda/slots/block`
**Permiso:** `IsAdminUser`

**Body:**
```json
{
  "profesional_id": 1,
  "inicio": "2024-01-15T10:00:00",
  "fin": "2024-01-15T12:00:00",
  "razon": "Almuerzo"
}
```

**Response:**
```json
{
  "blocked_count": 4,
  "profesional_id": 1,
  "inicio": "2024-01-15T10:00:00",
  "fin": "2024-01-15T12:00:00",
  "razon": "Almuerzo"
}
```

**Funcionalidad:**
- Busca todos los slots `DISPONIBLE` en el rango especificado
- Los marca como `BLOQUEADO`
- Crea registro de auditoría en `AdminAudit`
- Retorna el número de slots bloqueados

### 2. Unblock Slots Endpoint
**Endpoint:** `POST /api/agenda/slots/unblock`
**Permiso:** `IsAdminUser`

**Body:**
```json
{
  "profesional_id": 1,
  "inicio": "2024-01-15T10:00:00",
  "fin": "2024-01-15T12:00:00"
}
```

**Response:**
```json
{
  "unblocked_count": 4,
  "profesional_id": 1,
  "inicio": "2024-01-15T10:00:00",
  "fin": "2024-01-15T12:00:00"
}
```

**Funcionalidad:**
- Busca slots `BLOQUEADO` en el rango especificado
- Los marca como `DISPONIBLE`
- Retorna el número de slots desbloqueados

### 3. Actualización en availability.py
**Cambio:** La función `aggregated_availability` solo retorna slots con `estado='DISPONIBLE'`, excluyendo automáticamente los bloqueados.

## Frontend - APIs Actualizadas

### agenda.ts
**Ubicación:** `revitek/front/src/api/agenda.ts`

**Funciones agregadas:**
```typescript
export interface BlockSlotsPayload {
  profesional_id: number;
  inicio: string; // ISO datetime
  fin: string;    // ISO datetime
  razon?: string;
}

export async function blockSlots(payload: BlockSlotsPayload): Promise<BlockSlotsResponse>
export async function unblockSlots(payload: Omit<BlockSlotsPayload, 'razon'>)
```

## Flujo de Uso

### Crear una Cita (Admin)
1. Admin hace clic en un bloque horario vacío en FullCalendar
2. Se abre `AdminBookingModal` con horario pre-seleccionado
3. Admin selecciona "Nueva Cita"
4. Rellena formulario completo:
   - Datos del cliente (nombre, apellido, email, teléfono)
   - Datos del vehículo (patente, marca, modelo)
   - Dirección del servicio
   - Servicios a realizar (checkboxes múltiples)
   - Observaciones opcionales
5. Puede modificar horario inicio/fin si es necesario
6. Hace clic en "Crear Cita"
7. Sistema:
   - Busca slot_id correspondiente automáticamente
   - Crea reserva con API `/api/agenda/reservas/`
   - Agrega evento visual al calendario
   - Muestra notificación de éxito

### Bloquear Horario
1. Admin hace clic en un bloque horario vacío
2. Se abre `AdminBookingModal`
3. Admin selecciona "Bloquear Horario"
4. Ingresa razón del bloqueo (ej: "Almuerzo", "Reunión")
5. Puede modificar rango de horas
6. Hace clic en "Bloquear Horario"
7. Sistema:
   - Llama a `/api/agenda/slots/block`
   - Marca múltiples slots como `BLOQUEADO` en DB
   - Agrega evento de fondo gris al calendario
   - Muestra notificación con número de slots bloqueados

### Visualización de Slots Bloqueados
- Los slots bloqueados se cargan al iniciar AdminLayout
- Se muestran como eventos de fondo gris en el calendario
- No se pueden seleccionar ni reservar
- La función `aggregated_availability` los excluye automáticamente para clientes

## Validaciones

### Formulario de Cita
- ✅ Nombre: requerido
- ✅ Apellido: requerido
- ✅ Email: requerido + formato válido (regex)
- ✅ Teléfono: requerido
- ✅ Patente: requerida
- ✅ Marca: requerida
- ✅ Dirección: requerida
- ✅ Servicios: al menos uno seleccionado

### Formulario de Bloqueo
- ✅ Razón: requerida

## Modelos de Datos

### AdminBookingData (TypeScript)
```typescript
export interface AdminBookingData {
  type: 'appointment' | 'blocked';
  cliente?: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
  };
  vehiculo?: {
    patente: string;
    marca: string;
    modelo?: string;
  };
  direccion?: {
    direccion_completa: string;
    comuna?: string;
  };
  servicios?: number[];
  nota?: string;
  razonBloqueo?: string;
  inicio: string;
  fin: string;
}
```

### Slot (Django Model)
```python
class Slot(models.Model):
    ESTADOS = [
        ("DISPONIBLE", "DISPONIBLE"),
        ("BLOQUEADO", "BLOQUEADO"),
        ("RESERVADO", "RESERVADO")
    ]
    profesional = models.ForeignKey(Profesional, ...)
    fecha = models.DateField(db_index=True)
    inicio = models.DateTimeField(db_index=True)
    fin = models.DateTimeField()
    estado = models.CharField(max_length=12, choices=ESTADOS, default="DISPONIBLE")
```

## Archivos Modificados

### Backend
- ✅ `revitek/server/apps/agenda/views.py` - Agregadas funciones `block_slots_view` y `unblock_slots_view`
- ✅ `revitek/server/apps/agenda/urls.py` - Agregadas rutas para bloqueo/desbloqueo
- ✅ `revitek/server/apps/agenda/availability.py` - Comentario actualizado para excluir bloqueados

### Frontend
- ✅ `revitek/front/src/components/AdminBookingModal.tsx` - **NUEVO** componente
- ✅ `revitek/front/src/pages/AgendaPage.tsx` - Integración de AdminBookingModal
- ✅ `revitek/front/src/api/agenda.ts` - Agregadas funciones blockSlots/unblockSlots
- ✅ `revitek/front/src/layouts/AdminLayout.tsx` - Carga de slots bloqueados

## Testing Manual

### Para probar Creación de Cita:
1. Iniciar backend: `cd revitek/server && python manage.py runserver`
2. Iniciar frontend: `cd revitek/front && npm run dev`
3. Acceder como admin a `/admin/agenda`
4. Hacer clic en un horario vacío
5. Seleccionar "Nueva Cita"
6. Llenar todos los campos obligatorios
7. Verificar que se crea correctamente
8. Refrescar página y verificar que aparece la cita

### Para probar Bloqueo de Horario:
1. En `/admin/agenda`, hacer clic en un horario vacío
2. Seleccionar "Bloquear Horario"
3. Ingresar razón del bloqueo
4. Verificar que se bloquea correctamente (área gris)
5. Ir a vista de cliente `/reservar`
6. Verificar que ese horario NO aparece disponible
7. Refrescar admin y verificar que el bloqueo persiste

## Mejoras Futuras

- [ ] Agregar opción para desbloquear desde el calendario (hacer clic en bloqueo)
- [ ] Permitir editar citas existentes desde el modal
- [ ] Agregar filtros de búsqueda de clientes existentes
- [ ] Implementar caché para servicios disponibles
- [ ] Agregar confirmación antes de bloquear horarios largos
- [ ] Permitir bloqueos recurrentes (ej: todos los lunes 12-13h)
- [ ] Exportar citas y bloqueos a CSV/Excel
- [ ] Dashboard con estadísticas de bloqueos por profesional

## Notas Técnicas

- Los slots bloqueados se cargan para los próximos 30 días en AdminLayout
- La búsqueda de slot_id usa tolerancia de 1 minuto para matching
- Los eventos de bloqueo usan `display: 'background'` en FullCalendar
- La auditoría se registra automáticamente en `AdminAudit` para bloqueos
- Los bloqueos no afectan reservas existentes, solo previenen nuevas
