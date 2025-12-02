# 🚀 Despliegue Rápido a Railway

## ✅ Paso 1: Código Preparado

Ya hice commit de todos los archivos necesarios para Railway.

## 📋 Paso 2: Subir a GitHub

```bash
git push origin main
```

## 🌐 Paso 3: Desplegar en Railway

### Opción A: Desde la Web de Railway (MÁS FÁCIL)

1. **Ve a** https://railway.app/
2. **Login** con tu cuenta de GitHub
3. **Clic en** "New Project"
4. **Selecciona** "Deploy from GitHub repo"  
5. **Busca y selecciona** tu repositorio `Agenda-Revitek`
6. Railway detectará automáticamente que es un proyecto Python

### Después del despliegue:

7. **Ve a Variables** (pestaña superior)
8. **Agrega estas variables:**

```bash
DATABASE_URL
postgresql://postgres:gFKhuWWALYGsVwdvfVtwtTTcXonwmyaK@maglev.proxy.rlwy.net:57992/railway

DEBUG
False

SECRET_KEY
<GENERA_UNA_NUEVA_ABAJO>

WHATSAPP_ACCESS_TOKEN
<tu_token_actual_del_.env>

WHATSAPP_PHONE_NUMBER_ID
<tu_phone_id_actual_del_.env>

WHATSAPP_VERIFY_TOKEN
revitek_secret_token

RECAPTCHA_SECRET_KEY
<tu_recaptcha_key_del_.env>
```

## 🔑 Generar SECRET_KEY

Ejecuta este comando en tu terminal local:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copia el resultado y úsalo como SECRET_KEY en Railway.

## 🎯 Paso 4: Obtener URL y Actualizar ALLOWED_HOSTS

1. Railway te dará una URL  como: `https://web-production-XXXX.up.railway.app`
2. Copia esa URL (sin el `https://`)
3. Actualiza `revitek/backend/core/settings.py`:

```python
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "web-production-XXXX.up.railway.app",  # ← Agrega esto
]
```

4. Haz commit y push:

```bash
git add revitek/backend/core/settings.py
git commit -m "Agregar dominio de Railway a ALLOWED_HOSTS"
git push origin main
```

Railway se redespliegará automáticamente.

## ✅ Verificación

1. Abre `https://tu-url-railway.app/admin/`
2. Deberías ver la página de login de Django
3. Login con: `revitek@gmail.com`

## 📝 Notas Importantes

- ✅ La base de datos ya tiene todos los datos
- ✅ NO ejecutes fixtures de nuevo
- ✅ Verifica los logs en Railway si hay errores
- ✅ Railway puede tardar 2-3 minutos en el primer despliegue

## 🐛 Si hay problemas

Revisa los logs en Railway (pestaña "Deployments" → Click en el deployment → Ver logs)
