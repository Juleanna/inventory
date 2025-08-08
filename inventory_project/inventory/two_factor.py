# inventory/two_factor.py
import pyotp
import qrcode
from io import BytesIO
import base64
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import secrets
import string

User = get_user_model()

class TwoFactorAuthService:
    """Сервіс для двофакторної аутентифікації"""
    
    @classmethod
    def generate_secret(cls):
        """Генерувати секретний ключ для TOTP"""
        return pyotp.random_base32()
    
    @classmethod
    def get_user_secret(cls, user):
        """Отримати секретний ключ користувача"""
        # Перевірити чи є секрет у профілі користувача
        if hasattr(user, 'profile') and hasattr(user.profile, 'totp_secret'):
            return user.profile.totp_secret
        
        # Якщо немає профілю, створити новий секрет
        secret = cls.generate_secret()
        cls.save_user_secret(user, secret)
        return secret
    
    @classmethod
    def save_user_secret(cls, user, secret):
        """Зберегти секретний ключ користувача"""
        from .models import UserPreferences
        
        # Отримати або створити налаштування користувача
        preferences, created = UserPreferences.objects.get_or_create(user=user)
        
        # Додати TOTP секрет до дефолтних фільтрів (як тимчасове рішення)
        if not preferences.default_filters:
            preferences.default_filters = {}
        
        preferences.default_filters['totp_secret'] = secret
        preferences.save()
    
    @classmethod
    def get_provisioning_uri(cls, user, secret=None):
        """Отримати URI для налаштування в додатку аутентифікації"""
        if not secret:
            secret = cls.get_user_secret(user)
        
        # Назва сервісу
        service_name = getattr(settings, 'SITE_NAME', 'IT Inventory')
        
        # Створити TOTP об'єкт
        totp = pyotp.TOTP(secret)
        
        # Генерувати URI
        return totp.provisioning_uri(
            name=user.email or user.username,
            issuer_name=service_name
        )
    
    @classmethod
    def generate_qr_code(cls, user, secret=None):
        """Згенерувати QR код для налаштування 2FA"""
        provisioning_uri = cls.get_provisioning_uri(user, secret)
        
        # Створити QR код
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Генерувати зображення
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Конвертувати в base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @classmethod
    def verify_token(cls, user, token):
        """Перевірити TOTP токен"""
        secret = cls.get_user_secret(user)
        
        if not secret:
            return False
        
        # Створити TOTP об'єкт
        totp = pyotp.TOTP(secret)
        
        # Перевірити токен (з допустимим відхиленням в 30 секунд)
        return totp.verify(token, valid_window=1)
    
    @classmethod
    def is_2fa_enabled(cls, user):
        """Перевірити чи увімкнена 2FA для користувача"""
        try:
            from .models import UserPreferences
            preferences = UserPreferences.objects.get(user=user)
            return preferences.default_filters.get('totp_enabled', False)
        except:
            return False
    
    @classmethod
    def enable_2fa(cls, user):
        """Увімкнути 2FA для користувача"""
        from .models import UserPreferences
        
        preferences, created = UserPreferences.objects.get_or_create(user=user)
        
        if not preferences.default_filters:
            preferences.default_filters = {}
        
        preferences.default_filters['totp_enabled'] = True
        preferences.save()
        
        # Створити резервні коди
        cls.generate_backup_codes(user)
    
    @classmethod
    def disable_2fa(cls, user):
        """Вимкнути 2FA для користувача"""
        from .models import UserPreferences
        
        try:
            preferences = UserPreferences.objects.get(user=user)
            
            if preferences.default_filters:
                preferences.default_filters['totp_enabled'] = False
                preferences.default_filters.pop('totp_secret', None)
                preferences.default_filters.pop('backup_codes', None)
                preferences.save()
        except UserPreferences.DoesNotExist:
            pass
    
    @classmethod
    def generate_backup_codes(cls, user, count=10):
        """Генерувати резервні коди для доступу"""
        codes = []
        
        for _ in range(count):
            # Генерувати код з 8 символів
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            # Додати дефіс посередині для читабельності
            formatted_code = f"{code[:4]}-{code[4:]}"
            codes.append(formatted_code)
        
        # Зберегти коди
        from .models import UserPreferences
        preferences, created = UserPreferences.objects.get_or_create(user=user)
        
        if not preferences.default_filters:
            preferences.default_filters = {}
        
        preferences.default_filters['backup_codes'] = codes
        preferences.save()
        
        return codes
    
    @classmethod
    def get_backup_codes(cls, user):
        """Отримати резервні коди користувача"""
        try:
            from .models import UserPreferences
            preferences = UserPreferences.objects.get(user=user)
            return preferences.default_filters.get('backup_codes', [])
        except:
            return []
    
    @classmethod
    def verify_backup_code(cls, user, code):
        """Перевірити та використати резервний код"""
        backup_codes = cls.get_backup_codes(user)
        
        if code in backup_codes:
            # Видалити використаний код
            backup_codes.remove(code)
            
            # Зберегти оновлений список
            from .models import UserPreferences
            preferences = UserPreferences.objects.get(user=user)
            preferences.default_filters['backup_codes'] = backup_codes
            preferences.save()
            
            return True
        
        return False
    
    @classmethod
    def create_2fa_session(cls, user, duration_minutes=15):
        """Створити тимчасову сесію після успішної 2FA"""
        session_token = secrets.token_urlsafe(32)
        cache_key = f"2fa_session_{session_token}"
        
        cache.set(cache_key, {
            'user_id': user.id,
            'authenticated_at': timezone.now().isoformat(),
            'expires_at': (timezone.now() + timedelta(minutes=duration_minutes)).isoformat()
        }, timeout=duration_minutes * 60)
        
        return session_token
    
    @classmethod
    def verify_2fa_session(cls, session_token):
        """Перевірити 2FA сесію"""
        cache_key = f"2fa_session_{session_token}"
        session_data = cache.get(cache_key)
        
        if not session_data:
            return None
        
        # Перевірити чи не закінчилася сесія
        expires_at = timezone.datetime.fromisoformat(session_data['expires_at']).replace(tzinfo=timezone.utc)
        if timezone.now() > expires_at:
            cache.delete(cache_key)
            return None
        
        return session_data
    
    @classmethod
    def invalidate_2fa_session(cls, session_token):
        """Інвалідувати 2FA сесію"""
        cache_key = f"2fa_session_{session_token}"
        cache.delete(cache_key)


class TwoFactorMiddleware:
    """Middleware для перевірки 2FA"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # URLs що не потребують 2FA
        self.exempt_urls = [
            '/admin/login/',
            '/api/auth/login/',
            '/api/auth/2fa/',
            '/api/auth/2fa-setup/',
            '/api/auth/logout/',
            '/static/',
            '/media/',
        ]
    
    def __call__(self, request):
        # Пропустити якщо користувач не автентифікований
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Пропустити для виключених URLs
        if any(request.path.startswith(url) for url in self.exempt_urls):
            return self.get_response(request)
        
        # Перевірити чи увімкнена 2FA для користувача
        if not TwoFactorAuthService.is_2fa_enabled(request.user):
            return self.get_response(request)
        
        # Перевірити чи є валідна 2FA сесія
        session_token = request.session.get('2fa_session_token')
        if session_token and TwoFactorAuthService.verify_2fa_session(session_token):
            return self.get_response(request)
        
        # Якщо немає валідної сесії 2FA - перенаправити на аутентифікацію
        if request.path.startswith('/api/'):
            from django.http import JsonResponse
            return JsonResponse({
                'error': 'Потрібна двофакторна аутентифікація',
                '2fa_required': True
            }, status=401)
        else:
            from django.shortcuts import redirect
            return redirect('/auth/2fa-required/')
        
        return self.get_response(request)