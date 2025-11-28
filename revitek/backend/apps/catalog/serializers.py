from rest_framework import serializers
from .models import Category, Service, ServiceTimeRule


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class ServiceSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="name", queryset=Category.objects.all())

    class Meta:
        model = Service
        fields = ["id", "name", "category", "duration_min", "price", "active"]

class ServiceTimeRuleSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = ServiceTimeRule
        fields = ["id", "service", "service_name", "weekday", "allowed_times"]

