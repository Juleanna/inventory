from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Equipment, Notification

User = get_user_model()


class AuthTests(TestCase):
    """Тести авторизації"""

    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'username': 'testuser',
            'password': 'testpass123',
        }

    def test_register(self):
        response = self.client.post('/api/register/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_login(self):
        User.objects.create_user(**self.user_data)
        response = self.client.post('/api/login/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        User.objects.create_user(**self.user_data)
        response = self.client.post('/api/login/', {
            'username': 'testuser',
            'password': 'wrongpass',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_protected_endpoint_without_auth(self):
        response = self.client.get('/api/equipment/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EquipmentCRUDTests(TestCase):
    """Тести CRUD для обладнання"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin', password='adminpass123'
        )
        self.client.force_authenticate(user=self.user)
        self.equipment_data = {
            'name': 'Тестовий ПК',
            'category': 'PC',
            'serial_number': 'SN-TEST-001',
            'location': 'Офіс 101',
            'status': 'WORKING',
        }

    def test_create_equipment(self):
        response = self.client.post('/api/equipment/', self.equipment_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Тестовий ПК')
        self.assertEqual(Equipment.objects.count(), 1)

    def test_list_equipment(self):
        Equipment.objects.create(**self.equipment_data)
        response = self.client.get('/api/equipment/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_get_equipment(self):
        eq = Equipment.objects.create(**self.equipment_data)
        response = self.client.get(f'/api/equipment/{eq.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['serial_number'], 'SN-TEST-001')

    def test_update_equipment(self):
        eq = Equipment.objects.create(**self.equipment_data)
        response = self.client.patch(f'/api/equipment/{eq.id}/', {
            'name': 'Оновлений ПК',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        eq.refresh_from_db()
        self.assertEqual(eq.name, 'Оновлений ПК')

    def test_delete_equipment(self):
        eq = Equipment.objects.create(**self.equipment_data)
        response = self.client.delete(f'/api/equipment/{eq.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Equipment.objects.count(), 0)

    def test_search_equipment(self):
        Equipment.objects.create(**self.equipment_data)
        Equipment.objects.create(
            name='Ноутбук Dell',
            category='LAPTOP',
            serial_number='SN-TEST-002',
            location='Офіс 102',
        )
        response = self.client.get('/api/equipment/', {'search': 'Dell'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Ноутбук Dell')

    def test_filter_by_category(self):
        Equipment.objects.create(**self.equipment_data)
        Equipment.objects.create(
            name='Ноутбук',
            category='LAPTOP',
            serial_number='SN-TEST-003',
            location='Офіс 103',
        )
        response = self.client.get('/api/equipment/', {'category': 'LAPTOP'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_filter_by_status(self):
        Equipment.objects.create(**self.equipment_data)
        Equipment.objects.create(
            name='Принтер',
            category='PRN',
            serial_number='SN-TEST-004',
            location='Офіс 104',
            status='REPAIR',
        )
        response = self.client.get('/api/equipment/', {'status': 'REPAIR'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Принтер')


class HealthCheckTests(TestCase):
    """Тести health check"""

    def setUp(self):
        self.client = APIClient()

    def test_health_check(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        import json
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database'], 'ok')


class ChangePasswordTests(TestCase):
    """Тести зміни пароля"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='oldpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'oldpass123',
            'new_password': 'newpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass123'))

    def test_change_password_wrong_old(self):
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'wrongpass',
            'new_password': 'newpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_too_short(self):
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'oldpass123',
            'new_password': 'short',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileTests(TestCase):
    """Тести профілю"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com',
            first_name='Тест',
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_update_profile(self):
        response = self.client.patch('/api/profile/', {
            'first_name': 'Нове Ім\'я',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Нове Ім\'я')
