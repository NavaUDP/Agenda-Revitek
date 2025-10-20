# revitek/server/apps/profesionales/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProfesionalViewSet

router = DefaultRouter()
router.register(r'profesionales', ProfesionalViewSet, basename='profesional')

urlpatterns = [
    path('', include(router.urls)),
]