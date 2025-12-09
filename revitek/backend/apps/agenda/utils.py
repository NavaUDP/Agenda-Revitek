import requests
from django.conf import settings

def verify_recaptcha(token: str) -> bool:
    """
    Verificar token de reCAPTCHA v3 con Google.
    Devuelve True si la verificación es exitosa y el puntaje > 0.5
    """
    print(f"🔍 Verificando reCAPTCHA... Token recibido: {token[:20] if token else 'None'}...")
    
    if not token:
        print("❌ No se recibió token de reCAPTCHA")
        return False
    
    secret_key = getattr(settings, 'RECAPTCHA_SECRET_KEY', None)
    if not secret_key:
        # Si no está configurado, permitir (para desarrollo)
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
        
        # Verificar si la verificación fue exitosa y el puntaje es aceptable
        success = result.get('success', False)
        score = result.get('score', 0.0)
        
        # Registrar para depuración
        if not success:
            print(f"❌ reCAPTCHA verification failed: {result.get('error-codes')}")
        elif score < 0.5:
            print(f"⚠️  reCAPTCHA score too low: {score}")
        else:
            print(f"✅ reCAPTCHA verified - Score: {score}")
        
        return success and score >= 0.5
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        # En caso de error de API, permitir (fail-open para mejor UX)
        return True
