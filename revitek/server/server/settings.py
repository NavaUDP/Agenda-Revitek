import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-nq_qng$kwh=u!tqu8e2cmennda7i(3)ry%abwd6sy48*i*1z)v'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "zeroth-proctodaeal-hattie.ngrok-free.dev",  # dominio ngrok actual
]

WHATSAPP_TOKEN = "EAAMFZATlZCJKUBPwyEF7CaydB65xdyzmvxNpZCkBTmyQBrTsqSMYrzh6Em7yY6SQANW1xHpKwFRIebW9Q7YaOtdG9JyFptOYMQzIrxGodeZAuYCsACfyzhf3jYSJrf38ZA7WD3BvENfl5cZAIZCOUVIMfavF3NEVZCVGwQM8AhhVonzGX7lZB82JejL0T1Dlb5ZCMZASJIg9CFMqobiqWI4cZAp3oisYFsjUCaYwdVFtWnIxu7PTnvMv7xV3Tw2ZAy9JXZC63hUXDCKBSjjv0KpuT6b3tu"       # Token de acceso permanente o temporal
WHATSAPP_PHONE_ID = "890108140850018"  # ID del número de WhatsApp
BACKEND_URL = "http://localhost:8000/api/agenda"


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # --- Aplicaciones de Terceros ---
    'rest_framework',
    'rest_framework_simplejwt', # <--- AÑADIDA: Necesaria para el login
    'django_filters',
    'corsheaders',

    # --- Mis Aplicaciones ---
    'apps.agenda',
    'apps.catalogo',
    'apps.chatbot',
    'apps.estados',
    'apps.notificaciones',
    'apps.profesionales', # <--- ELIMINADA: Redundante con 'catalogo'
    'apps.usuarios'
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware", # <--- CORS debe ir lo más alto posible
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# Tu configuración de MySQL se ve perfecta.
if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("MYSQL_DB","revitek"),
            "USER": os.getenv("MYSQL_USER","revitek"),
            "PASSWORD": os.getenv("MYSQL_PASSWORD",""),
            "HOST": os.getenv("MYSQL_HOST","127.0.0.1"),
            "PORT": os.getenv("MYSQL_PORT","3306"),
            "OPTIONS": {"charset": "utf8mb4", "init_command": "SET sql_mode='STRICT_TRANS_TABLES'"},
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'es-cl'

TIME_ZONE = "America/Santiago"

USE_I18N = True

USE_TZ = True


# Configuración de CORS (Comunicación con el Frontend)
# -----------------------------------------------------------------
# Has especificado localhost:8080, por lo que usamos esta lista.
# Es más seguro que CORS_ALLOW_ALL_ORIGINS = True.

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server (puerto por defecto)
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",

]

# Si tu frontend necesita enviar cookies (para futuros logins de sesión)
# CORS_ALLOW_CREDENTIALS = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- Configuración de Autenticación Personalizada ---
# -----------------------------------------------------------------
# ¡CRÍTICO! Esto le dice a Django que use tu modelo 'usuarios.User'.
AUTH_USER_MODEL = 'usuarios.User'


# --- Configuración de Django REST Framework (DRF) ---
# -----------------------------------------------------------------
# He fusionado la configuración de tus dos archivos.
REST_FRAMEWORK = {
    # 1. Le dice a DRF que use JWT para la autenticación
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    
    # 2. Hace que todas tus vistas estén protegidas por defecto
    # (Puedes desactivar esto si prefieres configurar cada vista manualmente)
    'DEFAULT_PERMISSION_CLASSES': (
       'rest_framework.permissions.IsAuthenticated',
    ),

    # 3. Mantiene tu configuración de filtros
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend"
    ],
}

# In test runs we prefer open endpoints to make unit tests simpler and avoid
# having to acquire JWT tokens for simple API tests. When running tests,
# override the default permission class to AllowAny.
if 'test' in sys.argv:
    REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'] = ('rest_framework.permissions.AllowAny',)