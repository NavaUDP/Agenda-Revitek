from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_profesionales, name='get-profesionales'),
    path('<int:id>', views.get_profesional_by_id, name='get-profesional-by-id')
]