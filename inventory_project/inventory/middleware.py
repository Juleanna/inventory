# inventory/middleware.py
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
import time
import hashlib

class RateLimitMiddleware:
    """Middleware для обмеження швидкості запитів"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Конфігурація лімітів
        self.limits = {
            # Ліміти для API endpoints
            'api_auth': {'requests': 10, 'window': 60},  # 10 запитів на хвилину для аутентифікації
            'api_general': {'requests': 1000, 'window': 3600},  # 1000 запитів на годину для загального API
            'api_search': {'requests': 100, 'window': 300},  # 100 пошукових запитів на 5 хвилин
            
            # Ліміти по IP
            'ip_global': {'requests': 5000, 'window': 3600},  # 5000 запитів на годину з одного IP
            'ip_auth': {'requests': 20, 'window': 300},  # 20 спроб аутентифікації на 5 хвилин з одного IP
            
            # Ліміти по користувачах
            'user_api': {'requests': 2000, 'window': 3600},  # 2000 API запитів на годину для користувача
            'user_export': {'requests': 10, 'window': 300},  # 10 експортів на 5 хвилин
        }
    
    def __call__(self, request):
        # Визначити тип запиту та відповідні ліміти
        rate_limit_rules = self.get_rate_limit_rules(request)
        
        # Перевірити кожне правило
        for rule in rate_limit_rules:
            if not self.check_rate_limit(request, rule):
                return self.rate_limit_response(rule)
        
        # Запит дозволений, продовжити обробку
        response = self.get_response(request)
        
        # Зафіксувати запит в лічильниках
        for rule in rate_limit_rules:
            self.record_request(request, rule)
        
        # Додати заголовки з інформацією про ліміти
        self.add_rate_limit_headers(response, request, rate_limit_rules)
        
        return response
    
    def get_rate_limit_rules(self, request):
        """Визначити правила rate limiting для запиту"""
        rules = []
        path = request.path
        
        # Глобальний ліміт по IP
        rules.append({
            'key_type': 'ip',
            'identifier': self.get_client_ip(request),
            'limit': self.limits['ip_global'],
            'scope': 'global'
        })
        
        # API запити
        if path.startswith('/api/'):
            # Аутентифікація
            if any(auth_path in path for auth_path in ['/auth/', '/login/', '/2fa/']):
                rules.append({
                    'key_type': 'ip',
                    'identifier': self.get_client_ip(request),
                    'limit': self.limits['ip_auth'],
                    'scope': 'auth'
                })
                
                rules.append({
                    'key_type': 'endpoint',
                    'identifier': f"auth_{self.get_client_ip(request)}",
                    'limit': self.limits['api_auth'],
                    'scope': 'auth_endpoint'
                })
            
            # Пошук
            elif 'search' in path:
                if request.user.is_authenticated:
                    rules.append({
                        'key_type': 'user',
                        'identifier': request.user.id,
                        'limit': self.limits['api_search'],
                        'scope': 'search'
                    })
            
            # Експорт
            elif 'export' in path:
                if request.user.is_authenticated:
                    rules.append({
                        'key_type': 'user',
                        'identifier': request.user.id,
                        'limit': self.limits['user_export'],
                        'scope': 'export'
                    })
            
            # Загальний API ліміт для аутентифікованих користувачів
            if request.user.is_authenticated:
                rules.append({
                    'key_type': 'user',
                    'identifier': request.user.id,
                    'limit': self.limits['user_api'],
                    'scope': 'api'
                })
            else:
                rules.append({
                    'key_type': 'endpoint',
                    'identifier': f"api_{self.get_client_ip(request)}",
                    'limit': self.limits['api_general'],
                    'scope': 'api'
                })
        
        return rules
    
    def check_rate_limit(self, request, rule):
        """Перевірити чи не перевищено ліміт"""
        cache_key = self.get_cache_key(rule)
        current_requests = cache.get(cache_key, 0)
        
        return current_requests < rule['limit']['requests']
    
    def record_request(self, request, rule):
        """Зафіксувати запит в лічильнику"""
        cache_key = self.get_cache_key(rule)
        current_requests = cache.get(cache_key, 0)
        
        # Збільшити лічильник
        cache.set(cache_key, current_requests + 1, rule['limit']['window'])
        
        # Також зберегти час першого запиту для точного розрахунку
        first_request_key = f"{cache_key}_first"
        if not cache.get(first_request_key):
            cache.set(first_request_key, time.time(), rule['limit']['window'])
    
    def get_cache_key(self, rule):
        """Згенерувати ключ кешу для правила"""
        window_start = int(time.time() // rule['limit']['window'])
        return f"rate_limit_{rule['key_type']}_{rule['identifier']}_{rule['scope']}_{window_start}"
    
    def get_client_ip(self, request):
        """Отримати IP адресу клієнта"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def rate_limit_response(self, rule):
        """Повернути відповідь про перевищення ліміту"""
        return JsonResponse({
            'error': 'Перевищено ліміт запитів',
            'limit': rule['limit']['requests'],
            'window': rule['limit']['window'],
            'scope': rule['scope'],
            'retry_after': rule['limit']['window']
        }, status=429)
    
    def add_rate_limit_headers(self, response, request, rules):
        """Додати заголовки з інформацією про ліміти"""
        if not rules:
            return
        
        # Взяти найбільш обмежувальне правило
        main_rule = min(rules, key=lambda r: r['limit']['requests'])
        cache_key = self.get_cache_key(main_rule)
        current_requests = cache.get(cache_key, 0)
        
        response['X-RateLimit-Limit'] = main_rule['limit']['requests']
        response['X-RateLimit-Remaining'] = max(0, main_rule['limit']['requests'] - current_requests)
        response['X-RateLimit-Reset'] = int(time.time() + main_rule['limit']['window'])


class SecurityHeadersMiddleware:
    """Middleware для додавання заголовків безпеки"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Заголовки безпеки
        response['X-Frame-Options'] = 'DENY'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Content Security Policy
        if not response.get('Content-Security-Policy'):
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
                "img-src 'self' data: https:",
                "font-src 'self' https://cdnjs.cloudflare.com",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ]
            response['Content-Security-Policy'] = '; '.join(csp_directives)
        
        # HSTS для HTTPS
        if request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class RequestLoggingMiddleware:
    """Middleware для логування запитів (для безпеки та моніторингу)"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        process_time = time.time() - start_time
        
        # Логувати тільки важливі запити
        if self.should_log_request(request, response):
            self.log_request(request, response, process_time)
        
        return response
    
    def should_log_request(self, request, response):
        """Визначити чи потрібно логувати запит"""
        # Логувати помилки
        if response.status_code >= 400:
            return True
        
        # Логувати аутентифікацію
        if '/auth/' in request.path or '/login/' in request.path:
            return True
        
        # Логувати адміністративні дії
        if request.user.is_authenticated and request.user.is_staff:
            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                return True
        
        # Логувати API запити з великою тривалістю
        if request.path.startswith('/api/') and time.time() - getattr(request, '_start_time', time.time()) > 2:
            return True
        
        return False
    
    def log_request(self, request, response, process_time):
        """Записати лог запиту"""
        import logging
        
        logger = logging.getLogger('inventory.requests')
        
        log_data = {
            'user': request.user.username if request.user.is_authenticated else 'anonymous',
            'ip': self.get_client_ip(request),
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration': round(process_time, 3),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        
        if response.status_code >= 400:
            logger.warning(f"HTTP {response.status_code}: {log_data}")
        else:
            logger.info(f"Request: {log_data}")
    
    def get_client_ip(self, request):
        """Отримати IP адресу клієнта"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip