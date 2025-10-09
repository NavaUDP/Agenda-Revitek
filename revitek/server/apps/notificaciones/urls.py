from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MensajeTemplateViewSet, ProgramacionRecordatorioViewSet, LogEnvioViewSet

router = DefaultRouter()
router.register(r'templates', MensajeTemplateViewSet)
router.register(r'recordatorios', ProgramacionRecordatorioViewSet)
router.register(r'logs', LogEnvioViewSet)

urlpatterns = [
	path('', include(router.urls)),
]
