from django.db import models

class EmailLog(models.Model):
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('ERROR', 'Error'),
    ]

    type = models.CharField(max_length=50, help_text="Tipo de correo (ej: confirmacion, marketing)")
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} -> {self.recipient} ({self.status})"
