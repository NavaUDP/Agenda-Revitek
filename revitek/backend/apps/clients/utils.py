import re

def normalize_phone(phone):
    """
    Normaliza un número de teléfono al formato 56XXXXXXXX.
    - Elimina caracteres no numéricos.
    - Agrega prefijo '56' si falta (asumiendo entrada de 9 dígitos).
    """
    if not phone:
        return ""
    
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    
    # Forzar prefijo 56 para números chilenos
    # Caso: Usuario ingresa 9XXXXXXXX (9 dígitos) -> Anteponer 56
    if len(clean_phone) == 9 and clean_phone.startswith('9'):
        clean_phone = '56' + clean_phone
        
    return clean_phone
