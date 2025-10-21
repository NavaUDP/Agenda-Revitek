from django.shortcuts import render
from django.http import HttpResponse
from apps.profesionales.models import Profesional

def get_profesionales(request):
    jsonResponse = []
    for profesional in Profesional.objects.all():
        jsonResponse.append({
            "id": profesional.id,
            "nombre": profesional.nombre,
            "email": profesional.email,
            "telefono": profesional.telefono,
            "acepta_reservas": profesional.acepta_reservas,
            "activo": profesional.activo,
            "color_calendario": profesional.color_calendario,
            "biografia": profesional.biografia,
            "foto": profesional.foto.url if profesional.foto else None,
        })

    return HttpResponse(jsonResponse, content_type="application/json")

def get_profesional_by_id(request, id):
    return HttpResponse(f"<h1>Profesional {id}</h1>")
