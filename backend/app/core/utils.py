from decimal import Decimal, ROUND_HALF_UP

def round_decimal(value, decimals=2) -> Decimal:
    """Redondea un valor numérico a la cantidad de decimales especificados de forma segura."""
    if value is None:
        return Decimal('0.00')
    
    # Si ya es un Decimal, lo usamos. Si no, lo convertimos a string primero para evitar problemas de precisión en floats en python
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
        
    exp = Decimal('10') ** -decimals
    return value.quantize(exp, rounding=ROUND_HALF_UP)
