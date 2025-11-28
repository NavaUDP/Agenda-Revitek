from django.db import models
from django.conf import settings

class ChatSession(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    state = models.CharField(max_length=120, default="start")
    data = models.JSONField(default=dict)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.phone} – {self.state}"
