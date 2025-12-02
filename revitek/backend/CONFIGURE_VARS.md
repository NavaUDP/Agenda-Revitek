# 🔥 CONFIGURAR VARIABLES DE ENTORNO EN RAILWAY

El backend está desplegado pero necesita variables de entorno configuradas.

## Opción 1: Desde el Dashboard Web (MÁS FÁCIL)

1. Ejecuta:
   ```bash
   railway open
   ```

2. En Railway Dashboard:
   - Click en el servicio desplegado (debería aparecer automáticamente)
   - Click en pestaña **"Variables"**
   - Click en **"RAW Editor"** (arriba a la derecha)

3. Pega este bloque completo:

```
DATABASE_URL=postgresql://postgres:gFKhuWWALYGsVwdvfVtwtTTcXonwmyaK@maglev.proxy.rlwy.net:57992/railway
DEBUG=False
SECRET_KEY=8@j&dpns1zddui#eous9*3p5azl7g)7t=f3^3svvi8@^9t#5)w
WHATSAPP_VERIFY_TOKEN=revitek_secret_token
```

4. **IMPORTANTE**: También agrega tus claves de WhatsApp y reCAPTCHA

   Abre tu `.env` local y copia los valores:
   ```bash
   cat .env
   ```

   Luego agregalos al editor de variables en Railway:
   ```
   WHATSAPP_ACCESS_TOKEN=<copia_tu_valor_aqui>
   WHATSAPP_PHONE_NUMBER_ID=<copia_tu_valor_aqui>
   RECAPTCHA_SECRET_KEY=<copia_tu_valor_aqui>
   ```

5. Click **"Save"** - Railway redesplegará automáticamente

## Verificar el Despliegue

Después de que Railway redespliegue (toma 1-2 minutos):

1. Abre: https://revitek-backend-production.up.railway.app/admin/
2. Deberías ver la página de login de Django ✅
3. Login con `revitek@gmail.com` ✅

## Si hay problemas

Ver logs en tiempo real:
```bash
railway logs
```
