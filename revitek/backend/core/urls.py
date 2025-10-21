from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView # Solo el de refresh
from apps.usuarios.views import MyTokenObtainPairView
urlpatterns = [
    path('admin/', admin.site.urls),  # El admin de Django

    # Tus endpoints de login JWT
    path('api/auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Conecta todas las URLs de tu app 'usuarios' bajo el prefijo 'api/usuarios/'
    path('api/usuarios/', include('apps.usuarios.urls')),
]
