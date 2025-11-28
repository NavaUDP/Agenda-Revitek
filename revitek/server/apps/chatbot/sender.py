# apps/chatbot/sender.py

import requests
from django.conf import settings


def send_message(to, text):
    url = f"https://graph.facebook.com/v20.0/{settings.WHATSAPP_PHONE_ID}/messages"

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text}
    }

    print("🚀 ENVIANDO MENSAJE A:", to, text)  # debug

    r = requests.post(url, json=payload, headers=headers)

    print("📨 RESPUESTA WHATSAPP:", r.status_code, r.text)  # debug

    return r
