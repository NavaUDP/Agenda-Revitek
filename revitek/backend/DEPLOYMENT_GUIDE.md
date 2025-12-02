# Guía Rápida de Despliegue a Railway

## ✅ Completado

- Base de datos Railway poblada con todos los datos esenciales
- Django configurado para trabajar con Railway
- Fixtures exportados y verificados

## 📋 Próximos Pasos para el Miércoles

### 1. Desplegar Backend en Railway

#### Crear nuevo servicio Railway

```bash
# Desde la carpeta revitek/backend
railway login
railway init
railway link
```

#### Configurar Variables de Entorno en Railway

Ve al dashboard de Railway y agrega estas variables:

```env
DATABASE_URL=postgresql://postgres:gFKhuWWALYGsVwdvfVtwtTTcXonwmyaK@maglev.proxy.rlwy.net:57992/railway
DEBUG=False
SECRET_KEY=<GENERAR_NUEVA_KEY_SECRETA>
WHATSAPP_ACCESS_TOKEN=<tu_token_actual>
WHATSAPP_PHONE_NUMBER_ID=<tu_phone_id_actual>
WHATSAPP_VERIFY_TOKEN=revitek_secret_token
RECAPTCHA_SECRET_KEY=<tu_recaptcha_key>
```

> **Importante:** Genera una nueva SECRET_KEY para producción:
> ```python
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

#### Desplegar

Railway detectará automáticamente tu `requirements.txt` y desplegará Django.

### 2. Configurar CORS para Frontend

Una vez desplegado el backend, agrega el dominio de tu frontend a CORS:

Edita `settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://tu-frontend.vercel.app",  # Agregar tu dominio de Vercel
]
```

### 3. Desplegar Frontend en Vercel

#### Configurar Variable de Entorno

En Vercel, agrega:
```env
VITE_API_URL=https://tu-backend.railway.app
```

## 🔍 Verificación Post-Despliegue

1. ✅ Acceder a `https://tu-backend.railway.app/admin/`
2. ✅ Login con `revitek@gmail.com`
3. ✅ Verificar que aparecen los **11 servicios**
4. ✅ Verificar que aparecen las **346 comunas**
5. ✅ Desde el frontend, hacer una reserva de prueba

## 📦 Datos Importados

| Tipo | Cantidad |
|------|----------|
| Servicios | 11 |
| Categorías | 5 |
| Reglas de tiempo | 66 |
| Regiones | 16 |
| Comunas | 346 |
| Profesionales | 1 (Felipe Cuevas) |
| Usuarios Admin | 1 (revitek@gmail.com) |

## 🚨 Recordatorios

- ✅ La base de datos Railway ya está poblada - **NO volver a importar**
- ✅ Asegúrate de usar `DEBUG=False` en producción
- ✅ Genera una nueva `SECRET_KEY` para Railway
- ✅ Actualiza CORS origins cuando tengas el dominio de Vercel
- ✅ Las credenciales de WhatsApp deben ser las mismas que usas localmente
