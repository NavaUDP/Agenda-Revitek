from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.clients.views import MyTokenObtainPairView  # YA EXISTE EN TU BACKEND

urlpatterns = [
    # Panel admin de Django
    path('admin/', admin.site.urls),

    # JWT Auth
    path("api/auth/token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Apps SIN prefijo /api — TAL COMO TU FRONT LO NECESITA
    path('agenda/', include('apps.agenda.urls')),
    path('catalog/', include('apps.catalog.urls')),
    path('clients/', include('apps.clients.urls')),
    path('whatsapp/', include('apps.whatsapp.urls')),
]
