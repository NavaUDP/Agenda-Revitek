from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/profesionales/", include("apps.profesionales.urls")),
    path("api/servicios/", include("apps.catalogo.urls")),
    path("api/agenda/", include("apps.agenda.urls")),
    path("api/estados/", include("apps.estados.urls")),
]
