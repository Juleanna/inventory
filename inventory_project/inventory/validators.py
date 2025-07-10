# inventory/validators.py
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_serial_number(value):
    """Валідація серійного номера"""
    if not value:
        raise ValidationError(_('Серійний номер не може бути порожнім'))
    
    if len(value) < 5:
        raise ValidationError(_('Серійний номер повинен бути не менше 5 символів'))
    
    if len(value) > 50:
        raise ValidationError(_('Серійний номер не може бути довше 50 символів'))
    
    # Перевірка на допустимі символи
    if not re.match(r'^[A-Za-z0-9\-_]+$', value):
        raise ValidationError(_('Серійний номер може містити тільки літери, цифри, дефіси та підкреслення'))

def validate_mac_address(value):
    """Валідація MAC-адреси"""
    if not value:
        return  # MAC-адреса не обов'язкова
    
    # Різні формати MAC-адрес
    patterns = [
        r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',  # 00:11:22:33:44:55 або 00-11-22-33-44-55
        r'^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$',    # 0011.2233.4455
        r'^([0-9A-Fa-f]{12})$'                          # 001122334455
    ]
    
    if not any(re.match(pattern, value) for pattern in patterns):
        raise ValidationError(_('Невірний формат MAC-адреси. Використовуйте формат: 00:11:22:33:44:55'))

def validate_ip_address(value):
    """Додаткова валідація IP-адреси"""
    if not value:
        return  # IP-адреса не обов'язкова
    
    # Перевірка на приватні мережі (опціонально)
    import ipaddress
    try:
        ip = ipaddress.ip_address(value)
        # Можна додати перевірку на приватні мережі
        # if ip.is_private:
        #     pass  # Дозволити приватні IP
    except ValueError:
        raise ValidationError(_('Невірний формат IP-адреси'))

def validate_price(value):
    """Валідація ціни"""
    if value is not None and value < 0:
        raise ValidationError(_('Ціна не може бути від\'ємною'))
    
    if value is not None and value > 999999.99:
        raise ValidationError(_('Ціна занадто велика'))

def validate_future_date(value):
    """Перевірка що дата не в майбутньому (для дати покупки)"""
    from django.utils import timezone
    
    if value and value > timezone.now().date():
        raise ValidationError(_('Дата покупки не може бути в майбутньому'))

def validate_warranty_date(value):
    """Перевірка дати гарантії"""
    from django.utils import timezone
    from datetime import timedelta
    
    if value:
        # Гарантія не може бути більше 10 років
        max_warranty = timezone.now().date() + timedelta(days=10*365)
        if value > max_warranty:
            raise ValidationError(_('Гарантія не може бути більше 10 років'))

def validate_phone_number(value):
    """Валідація номера телефону"""
    if not value:
        return
    
    # Українські номери телефонів
    pattern = r'^(\+38)?(0\d{9}|\d{9})$'
    if not re.match(pattern, value):
        raise ValidationError(_('Невірний формат номера телефону. Використовуйте формат: +380501234567 або 0501234567'))

def validate_equipment_name(value):
    """Валідація назви обладнання"""
    if not value or not value.strip():
        raise ValidationError(_('Назва обладнання не може бути порожньою'))
    
    if len(value.strip()) < 2:
        raise ValidationError(_('Назва обладнання повинна бути не менше 2 символів'))
    
    # Перевірка на небажані символи
    forbidden_chars = ['<', '>', '"', "'", '&']
    if any(char in value for char in forbidden_chars):
        raise ValidationError(_('Назва містить заборонені символи'))

def validate_location(value):
    """Валідація місцезнаходження"""
    if not value or not value.strip():
        raise ValidationError(_('Місцезнаходження не може бути порожнім'))
    
    if len(value.strip()) < 2:
        raise ValidationError(_('Місцезнаходження повинно бути не менше 2 символів'))