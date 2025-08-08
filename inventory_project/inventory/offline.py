# inventory/offline.py
import json
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Equipment, Notification

User = get_user_model()

class OfflineDataManager:
    """Менеджер для роботи з офлайн даними"""
    
    CACHE_PREFIX = 'offline_data'
    CACHE_TIMEOUT = 3600 * 24  # 24 години
    
    @classmethod
    def get_cache_key(cls, user_id, data_type):
        """Генерувати ключ кешу"""
        return f"{cls.CACHE_PREFIX}:{user_id}:{data_type}"
    
    @classmethod
    def cache_user_data(cls, user_id):
        """Кешувати дані користувача для офлайн роботи"""
        try:
            user = User.objects.get(id=user_id)
            
            # Обладнання користувача
            equipment_data = cls._get_user_equipment(user)
            equipment_key = cls.get_cache_key(user_id, 'equipment')
            cache.set(equipment_key, equipment_data, cls.CACHE_TIMEOUT)
            
            # Сповіщення користувача
            notifications_data = cls._get_user_notifications(user)
            notifications_key = cls.get_cache_key(user_id, 'notifications')
            cache.set(notifications_key, notifications_data, cls.CACHE_TIMEOUT)
            
            # Довідкова інформація
            reference_data = cls._get_reference_data()
            reference_key = cls.get_cache_key(user_id, 'reference')
            cache.set(reference_key, reference_data, cls.CACHE_TIMEOUT)
            
            # Метадані
            metadata = {
                'cached_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(seconds=cls.CACHE_TIMEOUT)).isoformat(),
                'user_permissions': cls._get_user_permissions(user)
            }
            metadata_key = cls.get_cache_key(user_id, 'metadata')
            cache.set(metadata_key, metadata, cls.CACHE_TIMEOUT)
            
            return True
            
        except Exception as e:
            print(f"Offline: Error caching user data: {e}")
            return False
    
    @classmethod
    def get_cached_data(cls, user_id, data_type):
        """Отримати кешовані дані"""
        cache_key = cls.get_cache_key(user_id, data_type)
        return cache.get(cache_key)
    
    @classmethod
    def _get_user_equipment(cls, user):
        """Отримати обладнання користувача"""
        # Обладнання що призначено користувачу або під його відповідальністю
        equipment_qs = Equipment.objects.filter(
            models.Q(current_user=user) | models.Q(responsible_person=user)
        ).select_related('manufacturer', 'category', 'department')
        
        equipment_data = []
        for eq in equipment_qs:
            equipment_data.append({
                'id': eq.id,
                'name': eq.name,
                'serial_number': eq.serial_number,
                'inventory_number': eq.inventory_number,
                'status': eq.status,
                'status_display': eq.get_status_display(),
                'manufacturer': eq.manufacturer.name if eq.manufacturer else None,
                'model': eq.model,
                'category': eq.category.name if eq.category else None,
                'location': eq.location,
                'department': eq.department.name if eq.department else None,
                'purchase_date': eq.purchase_date.isoformat() if eq.purchase_date else None,
                'warranty_until': eq.warranty_until.isoformat() if eq.warranty_until else None,
                'last_maintenance_date': eq.last_maintenance_date.isoformat() if eq.last_maintenance_date else None,
                'next_maintenance_date': eq.next_maintenance_date.isoformat() if eq.next_maintenance_date else None,
                'qr_code': eq.qr_code,
                'barcode': eq.barcode,
                'notes': eq.notes,
                'is_current_user': eq.current_user == user,
                'is_responsible': eq.responsible_person == user,
                'updated_at': eq.updated_at.isoformat()
            })
        
        return equipment_data
    
    @classmethod
    def _get_user_notifications(cls, user):
        """Отримати сповіщення користувача"""
        notifications_qs = Notification.objects.filter(
            user=user
        ).select_related('equipment').order_by('-created_at')[:100]  # Останні 100 сповіщень
        
        notifications_data = []
        for notif in notifications_qs:
            notifications_data.append({
                'id': notif.id,
                'title': notif.title,
                'message': notif.message,
                'notification_type': notif.notification_type,
                'notification_type_display': notif.get_notification_type_display(),
                'priority': notif.priority,
                'priority_display': notif.get_priority_display(),
                'read': notif.read,
                'created_at': notif.created_at.isoformat(),
                'equipment': {
                    'id': notif.equipment.id,
                    'name': notif.equipment.name,
                    'serial_number': notif.equipment.serial_number
                } if notif.equipment else None
            })
        
        return notifications_data
    
    @classmethod
    def _get_reference_data(cls):
        """Отримати довідкову інформацію"""
        from .models import Manufacturer, Category, Department
        
        return {
            'manufacturers': [
                {'id': m.id, 'name': m.name, 'code': m.code}
                for m in Manufacturer.objects.all()
            ],
            'categories': [
                {'id': c.id, 'name': c.name, 'code': c.code}
                for c in Category.objects.all()
            ],
            'departments': [
                {'id': d.id, 'name': d.name, 'code': d.code}
                for d in Department.objects.all()
            ],
            'equipment_statuses': Equipment.STATUS_CHOICES,
            'notification_types': Notification.NOTIFICATION_TYPES,
            'priorities': Notification.PRIORITY_CHOICES
        }
    
    @classmethod
    def _get_user_permissions(cls, user):
        """Отримати права доступу користувача"""
        return {
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'can_add_equipment': user.has_perm('inventory.add_equipment'),
            'can_change_equipment': user.has_perm('inventory.change_equipment'),
            'can_delete_equipment': user.has_perm('inventory.delete_equipment'),
            'can_view_reports': user.has_perm('inventory.view_reports'),
            'department': user.profile.department.name if hasattr(user, 'profile') and user.profile.department else None,
            'position': user.profile.position if hasattr(user, 'profile') else None
        }
    
    @classmethod
    def store_offline_action(cls, user_id, action_type, action_data):
        """Зберегти офлайн дію для подальшої синхронізації"""
        action_key = f"offline_actions:{user_id}"
        actions = cache.get(action_key, [])
        
        action = {
            'id': f"{user_id}_{len(actions)}_{int(timezone.now().timestamp())}",
            'type': action_type,
            'data': action_data,
            'timestamp': timezone.now().isoformat(),
            'user_id': user_id
        }
        
        actions.append(action)
        
        # Зберегти на 7 днів
        cache.set(action_key, actions, 3600 * 24 * 7)
        
        return action['id']
    
    @classmethod
    def get_offline_actions(cls, user_id):
        """Отримати збережені офлайн дії"""
        action_key = f"offline_actions:{user_id}"
        return cache.get(action_key, [])
    
    @classmethod
    def clear_offline_actions(cls, user_id, action_ids=None):
        """Очистити офлайн дії після синхронізації"""
        action_key = f"offline_actions:{user_id}"
        actions = cache.get(action_key, [])
        
        if action_ids:
            # Видалити тільки вказані дії
            actions = [a for a in actions if a['id'] not in action_ids]
        else:
            # Очистити всі дії
            actions = []
        
        cache.set(action_key, actions, 3600 * 24 * 7)
    
    @classmethod
    def sync_offline_actions(cls, user_id):
        """Синхронізувати офлайн дії з сервером"""
        actions = cls.get_offline_actions(user_id)
        synced_actions = []
        
        for action in actions:
            try:
                success = cls._process_offline_action(action)
                if success:
                    synced_actions.append(action['id'])
            except Exception as e:
                print(f"Offline: Error syncing action {action['id']}: {e}")
        
        # Видалити успішно синхронізовані дії
        if synced_actions:
            cls.clear_offline_actions(user_id, synced_actions)
        
        return len(synced_actions)
    
    @classmethod
    def _process_offline_action(cls, action):
        """Обробити офлайн дію"""
        action_type = action['type']
        action_data = action['data']
        user_id = action['user_id']
        
        try:
            user = User.objects.get(id=user_id)
            
            if action_type == 'mark_notification_read':
                notification_id = action_data.get('notification_id')
                Notification.objects.filter(id=notification_id, user=user).update(read=True)
                return True
                
            elif action_type == 'update_equipment_status':
                equipment_id = action_data.get('equipment_id')
                new_status = action_data.get('status')
                Equipment.objects.filter(id=equipment_id).update(
                    status=new_status,
                    updated_at=timezone.now()
                )
                return True
                
            elif action_type == 'add_equipment_note':
                equipment_id = action_data.get('equipment_id')
                note = action_data.get('note')
                equipment = Equipment.objects.get(id=equipment_id)
                current_notes = equipment.notes or ""
                timestamp = datetime.fromisoformat(action['timestamp']).strftime('%Y-%m-%d %H:%M')
                new_note = f"[{timestamp}] {note}"
                equipment.notes = f"{current_notes}\n{new_note}".strip()
                equipment.save()
                return True
                
            elif action_type == 'create_maintenance_request':
                # Створити запит на обслуговування
                equipment_id = action_data.get('equipment_id')
                description = action_data.get('description')
                
                # Це буде реалізовано в модулі обслуговування
                return True
                
        except Exception as e:
            print(f"Offline: Error processing action {action['id']}: {e}")
            return False
        
        return False
    
    @classmethod
    def get_offline_stats(cls, user_id):
        """Отримати статистику офлайн даних"""
        equipment_data = cls.get_cached_data(user_id, 'equipment')
        notifications_data = cls.get_cached_data(user_id, 'notifications')
        metadata = cls.get_cached_data(user_id, 'metadata')
        actions = cls.get_offline_actions(user_id)
        
        stats = {
            'cached_equipment': len(equipment_data) if equipment_data else 0,
            'cached_notifications': len(notifications_data) if notifications_data else 0,
            'pending_actions': len(actions),
            'cache_valid': False,
            'cached_at': None,
            'expires_at': None
        }
        
        if metadata:
            try:
                expires_at = datetime.fromisoformat(metadata['expires_at'])
                stats['cache_valid'] = timezone.now() < expires_at.replace(tzinfo=timezone.utc)
                stats['cached_at'] = metadata['cached_at']
                stats['expires_at'] = metadata['expires_at']
            except:
                pass
        
        return stats


class OfflineSearchHelper:
    """Помічник для офлайн пошуку"""
    
    @classmethod
    def search_equipment(cls, user_id, query, limit=20):
        """Пошук обладнання в кешованих даних"""
        equipment_data = OfflineDataManager.get_cached_data(user_id, 'equipment')
        
        if not equipment_data:
            return []
        
        query = query.lower()
        results = []
        
        for equipment in equipment_data:
            # Пошук по назві, серійному номеру, моделі
            searchable_fields = [
                equipment.get('name', ''),
                equipment.get('serial_number', ''),
                equipment.get('model', ''),
                equipment.get('inventory_number', ''),
                equipment.get('location', ''),
                equipment.get('manufacturer', ''),
                equipment.get('category', '')
            ]
            
            search_text = ' '.join(str(field) for field in searchable_fields if field).lower()
            
            if query in search_text:
                results.append({
                    'type': 'equipment',
                    'id': equipment['id'],
                    'title': equipment['name'],
                    'subtitle': f"{equipment['manufacturer']} {equipment['model']}".strip(),
                    'url': f"/equipment/{equipment['id']}/",
                    'status': equipment['status_display'],
                    'location': equipment['location'],
                    'match_score': cls._calculate_match_score(query, search_text)
                })
        
        # Сортувати за релевантністю
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return results[:limit]
    
    @classmethod
    def search_notifications(cls, user_id, query, limit=10):
        """Пошук сповіщень в кешованих даних"""
        notifications_data = OfflineDataManager.get_cached_data(user_id, 'notifications')
        
        if not notifications_data:
            return []
        
        query = query.lower()
        results = []
        
        for notification in notifications_data:
            search_text = f"{notification['title']} {notification['message']}".lower()
            
            if query in search_text:
                results.append({
                    'type': 'notification',
                    'id': notification['id'],
                    'title': notification['title'],
                    'subtitle': notification['message'][:100] + '...' if len(notification['message']) > 100 else notification['message'],
                    'url': f"/notifications/#{notification['id']}",
                    'priority': notification['priority_display'],
                    'read': notification['read'],
                    'match_score': cls._calculate_match_score(query, search_text)
                })
        
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return results[:limit]
    
    @classmethod
    def _calculate_match_score(cls, query, text):
        """Розрахувати релевантність пошуку"""
        text = text.lower()
        query = query.lower()
        
        score = 0
        
        # Точне співпадіння
        if query == text:
            score += 100
        
        # Співпадіння на початку
        if text.startswith(query):
            score += 50
        
        # Кількість входжень
        score += text.count(query) * 10
        
        # Довжина тексту (коротші тексти більш релевантні)
        score -= len(text) * 0.1
        
        return score