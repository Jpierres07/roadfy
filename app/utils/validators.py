"""
Utilidades de validación compartidas para todos los routers.
"""
import re


def validate_text(text):
    """Validate text - prevent dangerous characters like <, >, &, etc."""
    if not text:
        return True  # Allow empty text
    # Allow letters, numbers, spaces, and common safe characters
    text_regex = r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,;:!?\-()/]+$'
    return bool(re.match(text_regex, text))


def validate_url(url):
    """Validate URL format"""
    if not url:
        return True  # Allow empty URL (optional field)
    url_regex = r'^https?://.+'
    return bool(re.match(url_regex, url))


def validate_number(value, allow_decimal=False):
    """Validate number - only allow positive numbers (or zero)"""
    if value is None:
        return True
    try:
        num = float(value) if allow_decimal else int(value)
        return num >= 0
    except (ValueError, TypeError):
        return False


def validate_phone(phone):
    """Validate phone number - only allow numbers and common phone symbols: +, -, spaces, parentheses"""
    if not phone:
        return True  # Allow empty phone (optional field)
    phone_regex = r'^[0-9+\-() ]+$'
    return bool(re.match(phone_regex, phone))


def validate_email(email):
    """Validate email format"""
    if not email:
        return False  # Email is required
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_regex, email))


def validate_length(text, min_length=0, max_length=None):
    """Validate text length"""
    if text is None:
        return min_length == 0
    text_len = len(text)
    if text_len < min_length:
        return False
    if max_length is not None and text_len > max_length:
        return False
    return True


def validate_rating(rating):
    """Validate rating (1-5)"""
    if rating is None:
        return False
    try:
        rating_int = int(rating)
        return 1 <= rating_int <= 5
    except (ValueError, TypeError):
        return False


def validate_role(role):
    """Validate user role"""
    valid_roles = ['customer', 'business-admin', 'super-admin']
    return role in valid_roles if role else False


def validate_id_format(id_value):
    """Validate ID format (alphanumeric, hyphens, underscores)"""
    if not id_value:
        return False
    import re
    id_regex = r'^[a-zA-Z0-9_-]+$'
    return bool(re.match(id_regex, str(id_value)))


def validate_json_data(data, required_fields=None):
    """Validate that data is a dict and contains required fields"""
    if not isinstance(data, dict):
        return False, 'Data must be a JSON object'
    if required_fields:
        missing = [field for field in required_fields if field not in data or data[field] is None]
        if missing:
            return False, f'Missing required fields: {", ".join(missing)}'
    return True, None
