import json
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .engine import process_message

VERIFY_TOKEN = "EAAMFZATlZCJKUBPwyEF7CaydB65xdyzmvxNpZCkBTmyQBrTsqSMYrzh6Em7yY6SQANW1xHpKwFRIebW9Q7YaOtdG9JyFptOYMQzIrxGodeZAuYCsACfyzhf3jYSJrf38ZA7WD3BvENfl5cZAIZCOUVIMfavF3NEVZCVGwQM8AhhVonzGX7lZB82JejL0T1Dlb5ZCMZASJIg9CFMqobiqWI4cZAp3oisYFsjUCaYwdVFtWnIxu7PTnvMv7xV3Tw2ZAy9JXZC63hUXDCKBSjjv0KpuT6b3tu"
@csrf_exempt
def whatsapp_webhook(request):
    if request.method == "GET":
        if request.GET.get("hub.verify_token") == VERIFY_TOKEN:
            return HttpResponse(request.GET.get("hub.challenge"))
        return HttpResponse("Invalid Token", status=403)

    if request.method == "POST":
        data = json.loads(request.body)
        try:
            data = json.loads(request.body)
            print("RAW WEBHOOK DATA:", data, "\n\n")
            msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
            phone = msg["from"]
            text = msg.get("text", {}).get("body", "")
            process_message(phone, text)
        except:
            pass

        return HttpResponse(status=200)
