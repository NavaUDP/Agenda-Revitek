from django.contrib import admin
from .models import Slot, Reserva, ReservaSlot, ReservaServicio, HistorialEstado, SlotBlock, AdminAudit

@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ['profesional', 'fecha', 'inicio', 'fin', 'estado']
    list_filter = ['estado', 'fecha', 'profesional']
    search_fields = ['profesional__nombre']

@admin.register(SlotBlock)
class SlotBlockAdmin(admin.ModelAdmin):
    list_display = ['profesional', 'fecha', 'inicio', 'fin', 'razon', 'created_at']
    list_filter = ['fecha', 'profesional']
    search_fields = ['profesional__nombre', 'razon']

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ['id', 'cliente', 'estado', 'total_min', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['cliente__nombre', 'cliente__email']

admin.site.register(ReservaSlot)
admin.site.register(ReservaServicio)
admin.site.register(HistorialEstado)
admin.site.register(AdminAudit)
