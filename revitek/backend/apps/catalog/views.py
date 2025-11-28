from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Service, Category, ServiceTimeRule
from .serializers import ServiceSerializer, CategorySerializer, ServiceTimeRuleSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Service.objects.all()
        # Solo staff puede ver inactivos, y solo si lo piden explícitamente
        if self.request.user.is_staff and self.request.query_params.get('include_inactive') == 'true':
            return queryset
        return queryset.filter(active=True)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ServiceTimeRuleViewSet(viewsets.ModelViewSet):
    queryset = ServiceTimeRule.objects.all()
    serializer_class = ServiceTimeRuleSerializer
    permission_classes = [IsAdminUser]   # Solo admin

