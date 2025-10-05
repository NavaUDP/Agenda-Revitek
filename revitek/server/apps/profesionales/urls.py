from django.urls import path
from .views import ProfesionalListView, ProfesionalDetailView

urlpatterns = [
    path("", ProfesionalListView.as_view(), name="profesional-list"),
    path("<int:pk>", ProfesionalDetailView.as_view(), name="profesional-detail"),
]
