# 📖 Guía de Setup para Colaboradores

## 🎯 Objetivo
Esta guía te ayudará a configurar el proyecto **Agenda Revitek** después de hacer `git pull`. El proyecto migró de MySQL a PostgreSQL.

## 🚀 Inicio Rápido

### 1. Actualizar el repositorio
```bash
git pull origin main
```

### 2. Instalar PostgreSQL (si no lo tienes)
- **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib`
- **macOS:** `brew install postgresql`
- **Windows:** Descarga desde [postgresql.org](https://www.postgresql.org/download/)

### 3. Crear la base de datos
```bash
sudo -u postgres psql
```

En el prompt de PostgreSQL:
```sql
CREATE USER tu_usuario WITH PASSWORD 'tu_password';
CREATE DATABASE revitek_db OWNER tu_usuario;
GRANT ALL PRIVILEGES ON DATABASE revitek_db TO tu_usuario;
\q
```

### 4. Copiar archivos de ejemplo
```bash
cd revitek

# Copiar archivos de configuración
cp .pg_service.conf.example .pg_service.conf
cp .my_pgpass.example .my_pgpass
cp backend/.env.example backend/.env

# Editar con tus credenciales
nano .pg_service.conf    # Cambia TU_NOMBRE_USUARIO
nano .my_pgpass          # Cambia TU_NOMBRE_USUARIO y TU_CONTRASEÑA
nano backend/.env        # Pide las claves a Lucas

# Permisos del archivo de contraseña
chmod 600 .my_pgpass
```

### 5. Backend
```bash
cd revitek
python3 -m venv serverenv
source serverenv/bin/activate
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 6. Frontend (en otra terminal)
```bash
cd revitek/front
npm install
npm run dev
```

## ✅ Verificación
- Backend: http://localhost:8000/admin
- Frontend: http://localhost:5173

## 📝 Archivos que DEBES crear (no están en git)
- `revitek/.pg_service.conf` (configuración de PostgreSQL)
- `revitek/.my_pgpass` (contraseña de PostgreSQL)
- `revitek/backend/.env` (variables de entorno)

## 🆘 Problemas comunes
Ver el archivo completo de instrucciones: **INSTRUCCIONES_SETUP.md** (pídelo a Lucas)

## 📞 Contacto
Si tienes problemas, contacta a Lucas para:
- Tokens de WhatsApp
- reCAPTCHA Secret Key
- Ayuda con PostgreSQL
