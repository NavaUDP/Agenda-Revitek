from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArbolViewSet, NodoViewSet, SesionChatViewSet

router = DefaultRouter()
router.register(r'arboles', ArbolViewSet)
router.register(r'nodos', NodoViewSet)
router.register(r'sesiones', SesionChatViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
