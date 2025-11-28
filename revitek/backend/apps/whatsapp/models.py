from django.db import models
from django.utils.translation import gettext_lazy as _

class WhatsAppLog(models.Model):
    """
    Log of WhatsApp messages sent and received via Meta Cloud API.
    """
    DIRECTION_CHOICES = [
        ('OUTBOUND', 'Outbound (Sent)'),
        ('INBOUND', 'Inbound (Received)'),
    ]

    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('READ', 'Read'),
        ('FAILED', 'Failed'),
        ('RECEIVED', 'Received'),
    ]

    MESSAGE_TYPE_CHOICES = [
        ('TEMPLATE', 'Template'),
        ('TEXT', 'Text'),
        ('INTERACTIVE', 'Interactive (Button/List)'),
        ('UNKNOWN', 'Unknown'),
    ]

    reservation = models.ForeignKey(
        'agenda.Reservation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='whatsapp_logs',
        help_text=_("Related reservation if applicable")
    )

    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default='TEXT')
    
    # Meta API ID (wamid.HBg...)
    whatsapp_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    
    # Phone number (recipient or sender)
    phone_number = models.CharField(max_length=32)
    
    # Raw payload or content summary
    content = models.JSONField(default=dict, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SENT')
    
    error_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("WhatsApp Log")
        verbose_name_plural = _("WhatsApp Logs")

    def __str__(self):
        return f"[{self.direction}] {self.phone_number} - {self.status} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class WhatsAppSession(models.Model):
    """
    Tracks the conversation state for a user.
    """
    phone_number = models.CharField(max_length=32, unique=True)
    state = models.CharField(max_length=50, default='MENU')
    data = models.JSONField(default=dict, blank=True)
    last_interaction = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.phone_number} - {self.state}"

