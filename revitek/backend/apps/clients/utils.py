import re

def normalize_phone(phone):
    """
    Normalizes a phone number to the format 56XXXXXXXX.
    - Removes non-digits.
    - Adds '56' prefix if missing (assuming 9 digits input).
    """
    if not phone:
        return ""
    
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    
    # Enforce 56 prefix for Chilean numbers
    # Case: User enters 9XXXXXXXX (9 digits) -> Prepend 56
    if len(clean_phone) == 9 and clean_phone.startswith('9'):
        clean_phone = '56' + clean_phone
        
    return clean_phone
