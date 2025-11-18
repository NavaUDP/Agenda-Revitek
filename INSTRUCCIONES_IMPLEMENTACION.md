# Instrucciones de Implementación - Sistema de Bloqueos Editables

## ⚠️ PASOS OBLIGATORIOS

### 1. Instalar Dependencias Backend (SI NO ESTÁN INSTALADAS)
```powershell
cd revitek\server
pip install djangorestframework-simplejwt django-cors-headers django-filter pillow
```

### 2. Crear y Aplicar Migraciones
```powershell
cd revitek\server
python manage.py makemigrations agenda
python manage.py migrate
```

### 3. Verificar Frontend (ya está actualizado)
Los archivos del frontend ya están modificados y listos para usar.

## 📋 CAMBIOS REALIZADOS

### Backend

#### 1. Nuevo Modelo: SlotBlock
**Archivo:** `server/apps/agenda/models.py`
- Modelo independiente para bloqueos editables
- Campos: profesional, fecha, inicio, fin, razon, created_by, created_at
- Los bloqueos ahora se pueden crear, editar y eliminar

#### 2. Serializer para SlotBlock
**Archivo:** `server/apps/agenda/serializers.py`
- `SlotBlockSerializer` agregado con todos los campos necesarios

#### 3. Nuevas Vistas (Views)
**Archivo:** `server/apps/agenda/views.py`
- `list_blocks(request)` - Lista todos los bloqueos (GET /api/agenda/blocks)
- `create_block_view(request)` - Crea bloqueo (POST /api/agenda/blocks/create)
- `update_block_view(request, pk)` - Actualiza bloqueo (PUT /api/agenda/blocks/{id}/update)
- `delete_block_view(request, pk)` - Elimina bloqueo (DELETE /api/agenda/blocks/{id}/delete)

**Funcionalidad:** Estas vistas también actualizan el estado de los Slots relacionados automáticamente.

#### 4. Rutas Actualizadas
**Archivo:** `server/apps/agenda/urls.py`
```python
path('blocks', views.list_blocks, name='blocks-list'),
path('blocks/create', views.create_block_view, name='block-create'),
path('blocks/<int:pk>/update', views.update_block_view, name='block-update'),
path('blocks/<int:pk>/delete', views.delete_block_view, name='block-delete'),
```

#### 5. Admin Panel
**Archivo:** `server/apps/agenda/admin.py`
- Registro de `SlotBlock` en el admin de Django para gestión visual

### Frontend

#### 1. AdminBookingModal Renovado
**Archivo:** `front/src/components/AdminBookingModal.tsx`

**CAMBIOS PRINCIPALES:**
- ✅ **Selectores de hora en intervalos de 1 hora** (8:00 - 19:00)
- ✅ **Formato de formulario igual a ReservaDetailModal**:
  - Cliente: nombre, apellido, email, teléfono
  - Vehículo: patente, marca, modelo
  - Dirección: calle, número, comuna, ciudad, notas_adicionales
  - Servicios con checkboxes
  - Observaciones
- ✅ Soporte para modo edición (`isEditing` prop)
- ✅ Estructura de dirección actualizada (separada en calle/número)

#### 2. API de Bloqueos
**Archivo:** `front/src/api/agenda.ts`

**Nuevas funciones:**
```typescript
listBlocks(params?: { fecha?: string; profesional_id?: number })
createBlock(payload: SlotBlockData)
updateBlock(id: number, payload: Partial<SlotBlockData>)
deleteBlock(id: number)
```

#### 3. AgendaPage (Pendiente de actualización)
**Archivo:** `front/src/pages/AgendaPage.tsx`

**REQUIERE ACTUALIZACIÓN PARA:**
- Cargar bloqueos con `listBlocks()`
- Mostrar bloqueos como eventos editables (no background)
- Permitir hacer clic en bloqueo para editarlo
- Agregar botón de eliminar en modal de edición
- Convertir horarios de selectores a ISO datetime

## 🔄 FLUJO DE USO ACTUALIZADO

### Crear Bloqueo
1. Admin hace clic en horario vacío
2. Selecciona "Bloquear Horario"
3. Selecciona fecha y horas con selectores dropdown
4. Ingresa razón del bloqueo
5. Click en "Bloquear Horario"
6. **Se guarda en tabla `SlotBlock`**
7. **Se marcan slots correspondientes como BLOQUEADO**
8. **Aparece como evento editable en calendario**

### Editar Bloqueo
1. Admin hace clic en bloqueo existente
2. Se abre modal con datos pre-cargados
3. Modifica horarios, razón, etc.
4. Click en "Actualizar Bloqueo"
5. **Se actualiza registro en tabla `SlotBlock`**
6. **Se liberan slots antiguos y bloquean los nuevos**

### Eliminar Bloqueo
1. Admin hace clic en bloqueo
2. Click en botón "Eliminar Bloqueo"
3. Confirma eliminación
4. **Se elimina de tabla `SlotBlock`**
5. **Se liberan slots (DISPONIBLE)**

### Crear Cita
1. Admin hace clic en horario vacío
2. Selecciona "Nueva Cita"
3. **Llena formulario completo (igual a ReservaDetailModal)**:
   - Cliente (4 campos)
   - Vehículo (3 campos)
   - Dirección (calle, número, comuna, ciudad, notas)
   - Servicios (checkboxes)
   - Observaciones
4. Selecciona fecha y horas con selectores
5. Click en "Crear Cita"
6. **Se guarda en tabla `Reserva` con todos los datos**
7. **Aparece en calendario**

## 🗄️ ESTRUCTURA DE DATOS

### SlotBlock (Nuevo)
```python
{
    "id": 1,
    "profesional": 1,
    "profesional_nombre": "Juan Pérez",
    "fecha": "2024-11-20",
    "inicio": "2024-11-20T12:00:00",
    "fin": "2024-11-20T13:00:00",
    "razon": "Almuerzo",
    "created_at": "2024-11-18T10:30:00"
}
```

### AdminBookingData (Frontend)
```typescript
{
    type: 'appointment' | 'blocked',
    // Para citas
    cliente?: {
        nombre: string,
        apellido: string,
        email: string,
        telefono: string
    },
    vehiculo?: {
        patente: string,
        marca: string,
        modelo?: string
    },
    direccion?: {
        calle: string,
        numero: string,
        comuna?: string,
        ciudad?: string,
        notas_adicionales?: string
    },
    servicios?: number[],
    nota?: string,
    // Para bloqueos
    razonBloqueo?: string,
    // Horario (con selectores)
    fecha: string,
    hora_inicio: string, // "09:00"
    hora_fin: string     // "10:00"
}
```

## ⚡ PRÓXIMOS PASOS RECOMENDADOS

### 1. Actualizar AgendaPage.tsx (CRÍTICO)
El archivo actual necesita:

```typescript
// Cargar bloqueos al iniciar
useEffect(() => {
    const fetchBlocks = async () => {
        try {
            const blocks = await listBlocks();
            const blockEvents = blocks.map(block => ({
                id: `block_${block.id}`,
                title: `🚫 ${block.razon}`,
                start: block.inicio,
                end: block.fin,
                resourceId: String(block.profesional),
                backgroundColor: '#6b7280',
                borderColor: '#4b5563',
                extendedProps: {
                    type: 'blocked',
                    blockId: block.id,
                    razon: block.razon
                }
            }));
            setEvents(prev => [...prev, ...blockEvents]);
        } catch (error) {
            console.error('Error loading blocks:', error);
        }
    };
    fetchBlocks();
}, []);

// Manejar click en evento (cita o bloqueo)
const handleEventClick = async (info: any) => {
    if (info.event.extendedProps.type === 'blocked') {
        // Abrir modal de edición de bloqueo
        const blockId = info.event.extendedProps.blockId;
        // Cargar datos y mostrar AdminBookingModal en modo edición
    } else {
        // Abrir ReservaDetailModal (comportamiento actual)
    }
};

// Confirmar creación/edición
const handleConfirmAppointment = async (data: AdminBookingData) => {
    const professionalId = parseInt(selectionInfo.resource.id);
    
    // Construir ISO datetimes desde fecha + hora
    const inicio = `${data.fecha}T${data.hora_inicio}:00`;
    const fin = `${data.fecha}T${data.hora_fin}:00`;
    
    if (data.type === 'blocked') {
        await createBlock({
            profesional: professionalId,
            fecha: data.fecha,
            inicio,
            fin,
            razon: data.razonBloqueo
        });
    } else {
        // Crear reserva con formato direccion separado
        await createReserva({
            profesional_id: professionalId,
            cliente: data.cliente!,
            vehiculo: data.vehiculo,
            direccion: {
                direccion_completa: `${data.direccion?.calle} ${data.direccion?.numero}`,
                alias: data.direccion?.notas_adicionales,
                comuna: data.direccion?.comuna
            },
            servicios: data.servicios!.map(sid => ({
                servicio_id: sid,
                profesional_id: professionalId
            })),
            slot_id: await findMatchingSlotId(professionalId, new Date(inicio)),
            nota: data.nota
        });
    }
};
```

### 2. Agregar Modal de Eliminación
Agregar botón "Eliminar" en AdminBookingModal cuando `isEditing && type === 'blocked'`

### 3. Sincronizar AdminLayout
Actualizar `AdminLayout.tsx` para cargar bloqueos con `listBlocks()` en lugar de leer slots

## 🧪 TESTING

### Backend
```bash
# Crear bloqueo
curl -X POST http://localhost:8000/api/agenda/blocks/create \
  -H "Content-Type: application/json" \
  -d '{
    "profesional": 1,
    "fecha": "2024-11-20",
    "inicio": "2024-11-20T12:00:00",
    "fin": "2024-11-20T13:00:00",
    "razon": "Almuerzo"
  }'

# Listar bloqueos
curl http://localhost:8000/api/agenda/blocks

# Actualizar bloqueo
curl -X PUT http://localhost:8000/api/agenda/blocks/1/update \
  -H "Content-Type: application/json" \
  -d '{"razon": "Reunión Importante"}'

# Eliminar bloqueo
curl -X DELETE http://localhost:8000/api/agenda/blocks/1/delete
```

### Frontend
1. Abrir http://localhost:5173/admin/agenda
2. Hacer clic en horario vacío
3. Probar crear cita con formulario completo
4. Probar crear bloqueo
5. Hacer clic en bloqueo para editarlo
6. Eliminar bloqueo

## 📝 NOTAS TÉCNICAS

- **Direcciones:** La estructura cambió de `direccion_completa` a `calle + numero` separados
- **Horarios:** Los selectores generan strings "HH:00", que se combinan con fecha para crear ISO datetime
- **Bloqueos editables:** Ahora son eventos normales en calendario (no background)
- **Sincronización automática:** Al crear/editar/eliminar bloqueos, los Slots se actualizan automáticamente
- **Validación:** El formulario valida todos los campos obligatorios antes de enviar

## ✅ VERIFICACIÓN FINAL

Antes de usar en producción, verificar:
- [ ] Migraciones aplicadas sin errores
- [ ] SlotBlock aparece en Django Admin
- [ ] API de bloqueos responde correctamente (GET/POST/PUT/DELETE)
- [ ] Modal muestra selectores de hora en lugar de datetime-local
- [ ] Formulario de cita tiene estructura de ReservaDetailModal
- [ ] Bloqueos se pueden editar haciendo clic
- [ ] Bloqueos se pueden eliminar
- [ ] Al eliminar bloqueo, slots quedan disponibles
- [ ] Citas se guardan con todos los datos en BD
