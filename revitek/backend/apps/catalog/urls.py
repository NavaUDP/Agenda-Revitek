from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, CategoryViewSet, ServiceTimeRuleViewSet

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="services")
router.register("categories", CategoryViewSet, basename="categories")
router.register("service-time-rules", ServiceTimeRuleViewSet, basename="service-time-rules")


urlpatterns = [
    path("", include(router.urls)),
]
