from django.urls import path
from .views import ProfesionalListView

urlpatterns = [
    path("", ProfesionalListView.as_view(), name="profesional-list"),
]
