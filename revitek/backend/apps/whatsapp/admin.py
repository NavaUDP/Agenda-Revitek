from django.contrib import admin
from .models import WhatsAppLog

@admin.register(WhatsAppLog)
class WhatsAppLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'direction', 'phone_number', 'message_type', 'status', 'created_at')
    list_filter = ('direction', 'status', 'message_type', 'created_at')
    search_fields = ('phone_number', 'whatsapp_id', 'content')
    readonly_fields = ('created_at', 'updated_at')
