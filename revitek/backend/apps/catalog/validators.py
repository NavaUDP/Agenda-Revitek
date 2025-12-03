from django.core.exceptions import ValidationError
import re

def validate_time_list(value):
    """
    Validates that the input is a list of strings in "HH:MM" format.
    """
    if not isinstance(value, list):
        raise ValidationError("El valor debe ser una lista.")
    
    time_pattern = re.compile(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    
    for item in value:
        if not isinstance(item, str):
            raise ValidationError(f"Elemento inválido: {item}. Debe ser un string.")
        
        if not time_pattern.match(item):
            raise ValidationError(f"Formato de hora inválido: {item}. Use HH:MM.")
