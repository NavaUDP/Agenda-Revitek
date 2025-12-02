# Guía de Despliegue a Railway - Paso a Paso

## ✅ Archivos Preparados

Ya se crearon todos los archivos necesarios para Railway:

- ✅ `Procfile` - Le dice a Railway cómo ejecutar tu app
- ✅ `railway.json` - Configuración de Railway
- ✅ `runtime.txt` - Versión de Python
- ✅ `requirements.txt` - Actualizado con gunicorn
- ✅ `settings.py` - Configurado para producción

## 🚀 Pasos para Desplegar

### Paso 1: Crear cuenta en Railway (si no la tienes)

1. Ve a https://railway.app/
2. Haz clic en "Start a New Project"
3. Conecta tu cuenta de GitHub

### Paso 2: Crear Proyecto en Railway

Tienes 2 opciones:

#### Opción A: Desde GitHub (Recomendado)

1. **Sube tu código a GitHub:**
   ```bash
   cd /home/lucas/universidad/2025-2/TICS2/Agenda-Revitek
   git add .
   git commit -m "Preparar backend para Railway"
   git push origin main
   ```

2. **En Railway:**
   - Clic en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Busca y selecciona tu repositorio
   - Selecciona la carpeta `revitek/backend`

#### Opción B: Desde Railway CLI

1. **Instalar Railway CLI:**
   ```bash
   npm install -g @railway/cli
   # o
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Login y desplegar:**
   ```bash
   cd /home/lucas/universidad/2025-2/TICS2/Agenda-Revitek/revitek/backend
   railway login
   railway init
   railway up
   ```

### Paso 3: Configurar Variables de Entorno en Railway

Una vez creado el proyecto, ve a la pestaña "Variables" y agrega:

```bash
DATABASE_URL=postgresql://postgres:gFKhuWWALYGsVwdvfVtwtTTcXonwmyaK@maglev.proxy.rlwy.net:57992/railway

DEBUG=False

SECRET_KEY=<GENERAR_NUEVA_KEY>

WHATSAPP_ACCESS_TOKEN=<tu_token>
WHATSAPP_PHONE_NUMBER_ID=<tu_phone_id>
WHATSAPP_VERIFY_TOKEN=revitek_secret_token

RECAPTCHA_SECRET_KEY=<tu_recaptcha_key>
```

#### Generar SECRET_KEY nueva:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Paso 4: Verificar Despliegue

1. Railway te dará una URL como: `https://revitek-backend-production.up.railway.app`
2. Verifica que funciona: `https://tu-url/admin/`
3. Deberías ver la página de login de Django

### Paso 5: Actualizar ALLOWED_HOSTS

Una vez que tengas la URL de Railway:

1. Edita `settings.py`:
   ```python
   ALLOWED_HOSTS = [
       "localhost",
       "127.0.0.1",
       "revitek-backend-production.up.railway.app",  # Agregar tu URL
   ]
   ```

2. Haz commit y push:
   ```bash
   git add core/settings.py
   git commit -m "Agregar dominio de Railway a ALLOWED_HOSTS"
   git push
   ```

3. Railway se redespliegará automáticamente

### Paso 6: Ejecutar Migraciones (Solo si es necesario)

Si Railway no las ejecuta automáticamente:

```bash
railway run python manage.py migrate
railway run python manage.py collectstatic --noinput
```

## 🎯 Siguiente Paso: Frontend

Una vez que el backend esté funcionando:

1. Copia la URL del backend de Railway
2. Despliega el frontend en Vercel
3. Configura `VITE_API_URL` en Vercel

## ⚠️ Importante

- ✅ La base de datos ya está poblada con datos
- ✅ NO necesitas volver a importar fixtures
- ✅ Usa `DEBUG=False` en producción
- ✅ Genera una nueva `SECRET_KEY` diferente a la de desarrollo

## 📝 Notas

Si tienes problemas, Railway muestra logs en tiempo real en la pestaña "Deployments".
