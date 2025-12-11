import requests
from django.conf import settings

def verify_recaptcha(token: str) -> bool:
    """
    Verificar token de reCAPTCHA v3 con Google.
    Devuelve True si la verificación es exitosa y el puntaje > 0.5
    En desarrollo (sin RECAPTCHA_SECRET_KEY configurado), siempre retorna True.
    """
    print(f"🔍 Verificando reCAPTCHA... Token recibido: {token[:20] if token else 'None'}...")
    
    secret_key = getattr(settings, 'RECAPTCHA_SECRET_KEY', None)
    
    # Si no hay secret_key configurado o es el valor de desarrollo, permitir siempre
    if not secret_key or secret_key == '6LfVjiYsAAAAAGPNqrlXI8KlFfzrFv8oS7iDb2dU':
        print("✅ reCAPTCHA deshabilitado (modo desarrollo) - permitiendo acceso")
        return True
    
    # Si reCAPTCHA está habilitado pero no hay token, rechazar
    if not token:
        print("❌ No se recibió token de reCAPTCHA")
        return False
    
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
