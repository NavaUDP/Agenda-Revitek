from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    UserViewSet,
    RegionViewSet,
    CommuneViewSet,
    AddressViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("regions", RegionViewSet, basename="regions")
router.register("communes", CommuneViewSet, basename="communes")
router.register("addresses", AddressViewSet, basename="addresses")
router.register("vehicles", VehicleViewSet, basename="vehicles")

urlpatterns = [
    path("", include(router.urls)),
]
