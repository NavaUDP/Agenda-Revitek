
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView # Solo el de refresh
from apps.usuarios.views import MyTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/catalogo/', include('apps.catalogo.urls')),
    path('api/agenda/', include('apps.agenda.urls')),
    path('api/profesionales/', include('apps.profesionales.urls')),
    path('api/chatbot/', include('apps.chatbot.urls')),
    path('api/notificaciones/', include('apps.notificaciones.urls')),
# Tus endpoints de login JWT
    path('api/auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Conecta todas las URLs de tu app 'usuarios' bajo el prefijo 'api/usuarios/'
    path('api/usuarios/', include('apps.usuarios.urls')),
]
