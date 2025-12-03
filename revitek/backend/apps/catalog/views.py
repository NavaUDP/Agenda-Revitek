from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Service, Category, ServiceTimeRule
from .serializers import ServiceSerializer, CategorySerializer, ServiceTimeRuleSerializer
from .permissions import IsAdminOrReadOnly


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Service.objects.select_related('category')
        # Solo staff puede ver inactivos, y solo si lo piden explícitamente
        if self.request.user.is_staff and self.request.query_params.get('include_inactive') == 'true':
            return queryset
        return queryset.filter(active=True)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

class ServiceTimeRuleViewSet(viewsets.ModelViewSet):
    queryset = ServiceTimeRule.objects.select_related('service')
    serializer_class = ServiceTimeRuleSerializer
    permission_classes = [IsAdminUser]   # Solo admin

