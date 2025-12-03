import requests
from django.conf import settings

def verify_recaptcha(token: str) -> bool:
    """
    Verify reCAPTCHA v3 token with Google.
    Returns True if verification succeeds and score > 0.5
    """
    print(f"🔍 Verificando reCAPTCHA... Token recibido: {token[:20] if token else 'None'}...")
    
    if not token:
        print("❌ No se recibió token de reCAPTCHA")
        return False
    
    secret_key = getattr(settings, 'RECAPTCHA_SECRET_KEY', None)
    if not secret_key:
        # If not configured, allow (for development)
        return True
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': secret_key,
                'response': token
            },
            timeout=5
        )
        result = response.json()
        
        # Check if verification succeeded and score is acceptable
        success = result.get('success', False)
        score = result.get('score', 0.0)
        
        # Log for debugging
        if not success:
            print(f"❌ reCAPTCHA verification failed: {result.get('error-codes')}")
        elif score < 0.5:
            print(f"⚠️  reCAPTCHA score too low: {score}")
        else:
            print(f"✅ reCAPTCHA verified - Score: {score}")
        
        return success and score >= 0.5
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        # In case of API error, allow (fail-open for better UX)
        return True
