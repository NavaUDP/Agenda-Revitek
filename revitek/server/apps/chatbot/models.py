from django.db import models

class Arbol(models.Model):
	nombre = models.CharField(max_length=120)
	descripcion = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

class Nodo(models.Model):
	arbol = models.ForeignKey(Arbol, on_delete=models.CASCADE, related_name="nodos")
	texto = models.TextField()
	es_hoja = models.BooleanField(default=False)
	izquierda = models.ForeignKey('self', null=True, blank=True, related_name='nodo_izquierda', on_delete=models.SET_NULL)
	derecha = models.ForeignKey('self', null=True, blank=True, related_name='nodo_derecha', on_delete=models.SET_NULL)
	accion = models.CharField(max_length=120, blank=True, default="")  # e.g. trigger notification

class SesionChat(models.Model):
	arbol = models.ForeignKey(Arbol, on_delete=models.CASCADE)
	nodo_actual = models.ForeignKey(Nodo, on_delete=models.SET_NULL, null=True)
	usuario_id = models.CharField(max_length=120, blank=True, default="")
	started_at = models.DateTimeField(auto_now_add=True)
	ended_at = models.DateTimeField(null=True, blank=True)
