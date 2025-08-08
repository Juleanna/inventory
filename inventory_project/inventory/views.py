from rest_framework import status, permissions
from rest_framework.viewsets import ModelViewSet
from django.db import models
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import Serializer, CharField
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()
from django.http import HttpResponse
from django.template.loader import render_to_string
from datetime import datetime, timedelta
from django.utils import timezone
import json
import io
import xlsxwriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from .models import Equipment, Notification, License, Software, PeripheralDevice
from .serializers import (
    EquipmentSerializer, NotificationSerializer,
    LicenseSerializer, SoftwareSerializer, PeripheralDeviceSerializer
)
from .filters import EquipmentFilter
from .dashboard import DashboardService, ReportService
from .offline import OfflineDataManager, OfflineSearchHelper
from .personalization import PersonalizationService
from .two_factor import TwoFactorAuthService
from .maintenance import MaintenanceService, MaintenanceRequest, MaintenanceSchedule, MaintenanceTask
from .spare_parts import (
    SparePartsService, SparePart, SparePartCategory, SparePartMovement, 
    Supplier, PurchaseOrder, PurchaseOrderItem
)

# Простий home view
@api_view(['GET'])
@permission_classes([])
def home(request):
    """Головна сторінка API"""
    return Response({
        'message': 'IT Inventory Management System API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'equipment': '/api/equipment/',
            'notifications': '/api/notifications/',
            'dashboard': '/api/dashboard/',
            'maintenance': '/api/maintenance/',
            'spare_parts': '/api/spare-parts/',
        }
    })

class EquipmentViewSet(ModelViewSet):
    """
    ViewSet для модели Equipment.
    Позволяет выполнять CRUD операции, фильтрацию, сортировку и поиск.
    """
    queryset = Equipment.objects.all()  # Получаем все записи из модели Equipment
    serializer_class = EquipmentSerializer  # Сериализатор для обработки данных
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]  # Подключаем фильтры, поиск и сортировку
    filterset_class = EquipmentFilter  # Кастомный фильтр. Если не используется, замените на filterset_fields
    search_fields = ['name', 'serial_number', 'location']  # Поля для поиска
    ordering_fields = ['name', 'purchase_date', 'last_maintenance_date']  # Поля для сортировки
    ordering = ['name']  # Сортировка по умолчанию
    permission_classes = [permissions.IsAuthenticated]  # Доступ только для авторизованных пользователей
    

# Сериализатор для регистрации пользователя
class RegisterSerializer(Serializer):
    username = CharField(max_length=100)
    password = CharField(max_length=100)

class NotificationViewSet(ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer


class LicenseViewSet(ModelViewSet):
    queryset = License.objects.all()
    serializer_class = LicenseSerializer


class SoftwareViewSet(ModelViewSet):
    queryset = Software.objects.all()
    serializer_class = SoftwareSerializer


class PeripheralDeviceViewSet(ModelViewSet):
    queryset = PeripheralDevice.objects.all()
    serializer_class = PeripheralDeviceSerializer


# Регистрация нового пользователя
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    if request.method == 'POST':
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            user = User.objects.create_user(username=username, password=password)
            return Response({"message": "Пользователь создан"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Логин пользователя и получение JWT токена
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    from rest_framework_simplejwt.tokens import RefreshToken

    if request.method == 'POST':
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response({"message": "Неверное имя пользователя или пароль"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    user = request.user
    notifications = Notification.objects.filter(user=user, read=False).order_by('-created_at')
    notifications_data = [{"message": n.message, "created_at": n.created_at} for n in notifications]
    return Response(notifications_data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    user = request.user
    Notification.objects.filter(user=user, read=False).update(read=True)
    return Response({"message": "Все уведомления помечены как прочитанные"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_equipment(request):
    serializer = EquipmentSerializer(data=request.data)
    if serializer.is_valid():
        equipment = serializer.save()
        Notification.objects.create(
            user=request.user,
            message="Новый предмет добавлен в инвентарь",
        )
        return Response({"message": "Оборудование добавлено", "equipment": serializer.data})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def check_expired_equipment():
    expired_equipment = Equipment.objects.filter(expiry_date__lt=datetime.now())
    for item in expired_equipment:
        Notification.objects.create(
            user=item.owner,
            message=f"Срок службы оборудования {item.name} истек.",
        )


# ============ НОВІ КЛАСИ ДЛЯ АНАЛІТИКИ ТА ДАШБОРДУ ============

class DashboardView(APIView):
    """API для отримання даних дашборду"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати всі дані дашборду"""
        try:
            dashboard_data = {
                'equipment_overview': DashboardService.get_equipment_overview(),
                'financial_overview': DashboardService.get_financial_overview(),
                'department_statistics': DashboardService.get_department_statistics(),
                'location_statistics': DashboardService.get_location_statistics(),
                'maintenance_alerts': DashboardService.get_maintenance_alerts(),
                'notification_summary': DashboardService.get_notification_summary(),
                'equipment_age_distribution': DashboardService.get_equipment_age_distribution(),
                'last_updated': datetime.now().isoformat()
            }
            return Response(dashboard_data)
        except Exception as e:
            return Response(
                {'error': f'Помилка отримання даних дашборду: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyticsView(APIView):
    """API для аналітичних даних"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати аналітичні дані з трендами"""
        months = int(request.query_params.get('months', 12))
        
        try:
            analytics_data = {
                'monthly_trends': DashboardService.get_monthly_trends(months),
                'equipment_overview': DashboardService.get_equipment_overview(),
                'financial_overview': DashboardService.get_financial_overview(),
                'age_distribution': DashboardService.get_equipment_age_distribution(),
            }
            return Response(analytics_data)
        except Exception as e:
            return Response(
                {'error': f'Помилка отримання аналітичних даних: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportsView(APIView):
    """API для генерації звітів"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати дані для звітів"""
        report_type = request.query_params.get('type', 'inventory')
        
        try:
            if report_type == 'inventory':
                filters = {
                    'department': request.query_params.get('department'),
                    'location': request.query_params.get('location'),
                    'category': request.query_params.get('category'),
                    'status': request.query_params.get('status'),
                }
                # Видаляємо None значення
                filters = {k: v for k, v in filters.items() if v}
                
                data = ReportService.generate_inventory_report(filters)
                return Response({
                    'type': 'inventory',
                    'data': data,
                    'count': len(data)
                })
            
            elif report_type == 'financial':
                data = ReportService.generate_financial_report()
                return Response({
                    'type': 'financial',
                    'data': data
                })
            
            elif report_type == 'maintenance':
                data = ReportService.generate_maintenance_report()
                return Response({
                    'type': 'maintenance',
                    'data': data,
                    'count': len(data)
                })
            
            else:
                return Response(
                    {'error': 'Невідомий тип звіту'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Помилка генерації звіту: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExportView(APIView):
    """API для експорту звітів у Excel/PDF"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Експорт звітів"""
        export_format = request.query_params.get('format', 'excel')  # excel або pdf
        report_type = request.query_params.get('type', 'inventory')
        
        try:
            if export_format == 'excel':
                return self._export_excel(request, report_type)
            elif export_format == 'pdf':
                return self._export_pdf(request, report_type)
            else:
                return Response(
                    {'error': 'Підтримуються тільки формати: excel, pdf'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Помилка експорту: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _export_excel(self, request, report_type):
        """Експорт в Excel"""
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        
        if report_type == 'inventory':
            self._create_inventory_excel(workbook, request)
        elif report_type == 'financial':
            self._create_financial_excel(workbook)
        elif report_type == 'maintenance':
            self._create_maintenance_excel(workbook)
        
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="inventory_report_{report_type}.xlsx"'
        return response
    
    def _create_inventory_excel(self, workbook, request):
        """Створити інвентарний звіт в Excel"""
        worksheet = workbook.add_worksheet('Інвентарний звіт')
        
        # Заголовки
        headers = [
            'Назва', 'Серійний номер', 'Категорія', 'Виробник', 'Модель',
            'Локація', 'Статус', 'Користувач', 'Дата покупки', 'Вартість', 'Гарантія до'
        ]
        
        # Формат заголовків
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D7E4BC',
            'border': 1
        })
        
        # Записати заголовки
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Отримати дані
        filters = {
            'department': request.query_params.get('department'),
            'location': request.query_params.get('location'),
            'category': request.query_params.get('category'),
            'status': request.query_params.get('status'),
        }
        filters = {k: v for k, v in filters.items() if v}
        
        data = ReportService.generate_inventory_report(filters)
        
        # Записати дані
        for row, item in enumerate(data, 1):
            worksheet.write(row, 0, item.get('name', ''))
            worksheet.write(row, 1, item.get('serial_number', ''))
            worksheet.write(row, 2, item.get('category', ''))
            worksheet.write(row, 3, item.get('manufacturer', ''))
            worksheet.write(row, 4, item.get('model', ''))
            worksheet.write(row, 5, item.get('location', ''))
            worksheet.write(row, 6, item.get('status', ''))
            worksheet.write(row, 7, item.get('current_user__username', ''))
            worksheet.write(row, 8, str(item.get('purchase_date', '')))
            worksheet.write(row, 9, item.get('purchase_price', ''))
            worksheet.write(row, 10, str(item.get('warranty_until', '')))
        
        # Автопідбір ширини колонок
        worksheet.autofilter(0, 0, len(data), len(headers) - 1)
    
    def _create_financial_excel(self, workbook):
        """Створити фінансовий звіт в Excel"""
        worksheet = workbook.add_worksheet('Фінансовий звіт')
        
        data = ReportService.generate_financial_report()
        
        # Заголовки
        headers = [
            'Назва', 'Серійний номер', 'Категорія', 'Дата покупки',
            'Вартість покупки', 'Поточна вартість', 'Амортизація', 'Вік (роки)'
        ]
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D7E4BC',
            'border': 1
        })
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Дані
        for row, item in enumerate(data['equipment'], 1):
            worksheet.write(row, 0, item['name'])
            worksheet.write(row, 1, item['serial_number'])
            worksheet.write(row, 2, item['category'])
            worksheet.write(row, 3, str(item['purchase_date']) if item['purchase_date'] else '')
            worksheet.write(row, 4, item['purchase_price'])
            worksheet.write(row, 5, item['current_value'])
            worksheet.write(row, 6, item['depreciation'])
            worksheet.write(row, 7, round(item['age_years'], 1) if item['age_years'] else '')
        
        # Сводка
        summary_row = len(data['equipment']) + 3
        worksheet.write(summary_row, 0, 'СВОДКА:', header_format)
        worksheet.write(summary_row + 1, 0, 'Загальна вартість покупки:')
        worksheet.write(summary_row + 1, 1, data['summary']['total_purchase_value'])
        worksheet.write(summary_row + 2, 0, 'Поточна вартість:')
        worksheet.write(summary_row + 2, 1, data['summary']['total_current_value'])
        worksheet.write(summary_row + 3, 0, 'Загальна амортизація:')
        worksheet.write(summary_row + 3, 1, data['summary']['total_depreciation'])
    
    def _create_maintenance_excel(self, workbook):
        """Створити звіт по технічному обслуговуванню"""
        worksheet = workbook.add_worksheet('Технічне обслуговування')
        
        data = ReportService.generate_maintenance_report()
        
        headers = [
            'Назва', 'Серійний номер', 'Локація', 'Останнє ТО',
            'Наступне ТО', 'Потребує ТО', 'Днів з ТО', 'Користувач'
        ]
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D7E4BC',
            'border': 1
        })
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        for row, item in enumerate(data, 1):
            worksheet.write(row, 0, item['name'])
            worksheet.write(row, 1, item['serial_number'])
            worksheet.write(row, 2, item['location'])
            worksheet.write(row, 3, str(item['last_maintenance']) if item['last_maintenance'] else '')
            worksheet.write(row, 4, str(item['next_maintenance']) if item['next_maintenance'] else '')
            worksheet.write(row, 5, 'Так' if item['needs_maintenance'] else 'Ні')
            worksheet.write(row, 6, item['days_since_maintenance'] or '')
            worksheet.write(row, 7, item['current_user'] or '')
    
    def _export_pdf(self, request, report_type):
        """Експорт в PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        if report_type == 'inventory':
            elements = self._create_inventory_pdf_elements(request, styles)
        elif report_type == 'financial':
            elements = self._create_financial_pdf_elements(styles)
        elif report_type == 'maintenance':
            elements = self._create_maintenance_pdf_elements(styles)
        
        doc.build(elements)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="inventory_report_{report_type}.pdf"'
        return response
    
    def _create_inventory_pdf_elements(self, request, styles):
        """Створити PDF елементи для інвентарного звіту"""
        elements = []
        
        # Заголовок
        title = Paragraph("Інвентарний звіт", styles['Title'])
        elements.append(title)
        
        # Отримати дані
        filters = {k: v for k, v in {
            'department': request.query_params.get('department'),
            'location': request.query_params.get('location'),
            'category': request.query_params.get('category'),
            'status': request.query_params.get('status'),
        }.items() if v}
        
        data = ReportService.generate_inventory_report(filters)
        
        # Таблиця
        table_data = [['Назва', 'Серійний номер', 'Категорія', 'Статус', 'Локація']]
        
        for item in data[:50]:  # Обмежимо до 50 записів для PDF
            table_data.append([
                item.get('name', '')[:30],  # Обрізаємо довгі назви
                item.get('serial_number', ''),
                item.get('category', ''),
                item.get('status', ''),
                item.get('location', '')[:25],
            ])
        
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        return elements
    
    def _create_financial_pdf_elements(self, styles):
        """Створити PDF для фінансового звіту"""
        elements = []
        
        title = Paragraph("Фінансовий звіт", styles['Title'])
        elements.append(title)
        
        data = ReportService.generate_financial_report()
        
        # Сводка
        summary_text = f"""
        <b>Сводка:</b><br/>
        Загальна вартість покупки: {data['summary']['total_purchase_value']:,.2f} грн<br/>
        Поточна вартість: {data['summary']['total_current_value']:,.2f} грн<br/>
        Загальна амортизація: {data['summary']['total_depreciation']:,.2f} грн<br/>
        Відсоток амортизації: {data['summary']['depreciation_percentage']:.1f}%
        """
        
        summary_para = Paragraph(summary_text, styles['Normal'])
        elements.append(summary_para)
        
        return elements
    
    def _create_maintenance_pdf_elements(self, styles):
        """Створити PDF для звіту по ТО"""
        elements = []
        
        title = Paragraph("Звіт по технічному обслуговуванню", styles['Title'])
        elements.append(title)
        
        data = ReportService.generate_maintenance_report()
        needs_maintenance = [item for item in data if item['needs_maintenance']]
        
        if needs_maintenance:
            subtitle = Paragraph(f"Обладнання що потребує ТО ({len(needs_maintenance)} одиниць):", styles['Heading2'])
            elements.append(subtitle)
            
            table_data = [['Назва', 'Серійний номер', 'Локація', 'Днів з ТО']]
            
            for item in needs_maintenance[:20]:  # Топ 20
                table_data.append([
                    item['name'][:30],
                    item['serial_number'],
                    item['location'][:25],
                    str(item['days_since_maintenance'] or 'Невідомо')
                ])
            
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.red),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
        
        return elements


# ========== OFFLINE AND PWA VIEWS ==========

class OfflineDataView(APIView):
    """API для керування офлайн даними"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати кешовані дані для офлайн роботи"""
        user_id = request.user.id
        data_type = request.GET.get('type', 'all')
        
        if data_type == 'all':
            # Повернути всі кешовані дані
            data = {
                'equipment': OfflineDataManager.get_cached_data(user_id, 'equipment'),
                'notifications': OfflineDataManager.get_cached_data(user_id, 'notifications'),
                'reference': OfflineDataManager.get_cached_data(user_id, 'reference'),
                'metadata': OfflineDataManager.get_cached_data(user_id, 'metadata'),
                'stats': OfflineDataManager.get_offline_stats(user_id)
            }
        else:
            # Повернути дані певного типу
            data = OfflineDataManager.get_cached_data(user_id, data_type)
        
        return Response({
            'success': True,
            'data': data
        })
    
    def post(self, request):
        """Кешувати дані для офлайн роботи"""
        user_id = request.user.id
        
        success = OfflineDataManager.cache_user_data(user_id)
        
        return Response({
            'success': success,
            'message': 'Дані кешовані для офлайн роботи' if success else 'Помилка кешування даних'
        })


class OfflineActionsView(APIView):
    """API для керування офлайн діями"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати збережені офлайн дії"""
        user_id = request.user.id
        actions = OfflineDataManager.get_offline_actions(user_id)
        
        return Response({
            'success': True,
            'actions': actions,
            'count': len(actions)
        })
    
    def post(self, request):
        """Зберегти офлайн дію"""
        user_id = request.user.id
        action_type = request.data.get('type')
        action_data = request.data.get('data', {})
        
        if not action_type:
            return Response({
                'success': False,
                'error': 'Не вказано тип дії'
            }, status=400)
        
        action_id = OfflineDataManager.store_offline_action(user_id, action_type, action_data)
        
        return Response({
            'success': True,
            'action_id': action_id
        })
    
    def put(self, request):
        """Синхронізувати офлайн дії"""
        user_id = request.user.id
        
        synced_count = OfflineDataManager.sync_offline_actions(user_id)
        
        return Response({
            'success': True,
            'synced_count': synced_count,
            'message': f'Синхронізовано {synced_count} дій'
        })
    
    def delete(self, request):
        """Очистити офлайн дії"""
        user_id = request.user.id
        action_ids = request.data.get('action_ids')
        
        OfflineDataManager.clear_offline_actions(user_id, action_ids)
        
        return Response({
            'success': True,
            'message': 'Дії очищено'
        })


class OfflineSearchView(APIView):
    """API для офлайн пошуку"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Виконати пошук в кешованих даних"""
        user_id = request.user.id
        query = request.GET.get('q', '').strip()
        search_type = request.GET.get('type', 'all')
        limit = int(request.GET.get('limit', 20))
        
        if len(query) < 2:
            return Response({
                'success': False,
                'error': 'Запит повинен містити мінімум 2 символи'
            })
        
        results = []
        
        if search_type in ['all', 'equipment']:
            equipment_results = OfflineSearchHelper.search_equipment(user_id, query, limit)
            results.extend(equipment_results)
        
        if search_type in ['all', 'notifications']:
            notification_results = OfflineSearchHelper.search_notifications(user_id, query, limit)
            results.extend(notification_results)
        
        # Сортувати за релевантністю
        results.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        
        return Response({
            'success': True,
            'results': results[:limit],
            'total_found': len(results),
            'query': query
        })


class PWAManifestView(APIView):
    """API для динамічного manifest.json"""
    permission_classes = []
    
    def get(self, request):
        """Повернути PWA manifest"""
        manifest = {
            "name": "IT Equipment Inventory",
            "short_name": "Inventory",
            "description": "Система інвентаризації IT обладнання",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#28a745",
            "orientation": "portrait-primary",
            "scope": "/",
            "lang": "uk",
            "icons": [
                {
                    "src": "/static/icons/icon-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/static/icons/icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        }
        
        return Response(manifest)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """Перевірка стану сервера для PWA"""
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'user': request.user.username
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_notifications_count(request):
    """Отримати кількість непрочитаних сповіщень"""
    count = Notification.objects.filter(user=request.user, read=False).count()
    
    return Response({
        'count': count,
        'has_notifications': count > 0
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """Позначити сповіщення як прочитані"""
    notification_ids = request.data.get('ids', [])
    
    if notification_ids:
        updated = Notification.objects.filter(
            id__in=notification_ids,
            user=request.user
        ).update(read=True)
        
        return Response({
            'success': True,
            'updated_count': updated
        })
    else:
        # Позначити всі сповіщення як прочитані
        updated = Notification.objects.filter(
            user=request.user,
            read=False
        ).update(read=True)
        
        return Response({
            'success': True,
            'updated_count': updated
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_report(request):
    """Швидкий звіт про проблему"""
    report_type = request.data.get('type')
    description = request.data.get('description')
    location = request.data.get('location')
    
    if not description:
        return Response({
            'success': False,
            'error': 'Опис проблеми обов\'язковий'
        }, status=400)
    
    # Створити сповіщення адміністраторам
    admins = User.objects.filter(is_staff=True, is_active=True)
    
    report_message = f"""
    Швидкий звіт про проблему від {request.user.get_full_name() or request.user.username}:
    
    Тип: {dict([
        ('hardware', 'Проблема з обладнанням'),
        ('software', 'Проблема з ПЗ'),
        ('network', 'Мережева проблема'),
        ('other', 'Інше')
    ]).get(report_type, 'Невідомо')}
    
    Опис: {description}
    
    Локація: {location or 'Не вказано'}
    
    Час: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    """
    
    created_count = 0
    for admin in admins:
        notification = Notification.objects.create(
            user=admin,
            title=f"Швидкий звіт: {dict([
                ('hardware', 'Обладнання'),
                ('software', 'ПЗ'),
                ('network', 'Мережа'),
                ('other', 'Проблема')
            ]).get(report_type, 'Проблема')}",
            message=report_message,
            notification_type='WARNING',
            priority='MEDIUM'
        )
        created_count += 1
    
    return Response({
        'success': True,
        'message': f'Звіт відправлено {created_count} адміністраторам'
    })


@api_view(['GET'])
@permission_classes([])
def csrf_token(request):
    """Отримати CSRF токен для PWA"""
    from django.middleware.csrf import get_token
    
    return Response({
        'token': get_token(request)
    })


# ========== PERSONALIZATION AND UI/UX VIEWS ==========

class PersonalizedDashboardView(APIView):
    """API для персоналізованого дашборду"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати персоналізований дашборд користувача"""
        dashboard_data = PersonalizationService.get_personalized_dashboard(request.user)
        
        return Response({
            'success': True,
            'data': dashboard_data
        })


class UserPreferencesView(APIView):
    """API для налаштувань користувача"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати налаштування користувача"""
        preferences = PersonalizationService.get_user_preferences(request.user)
        
        preferences_data = {
            'theme': preferences.theme,
            'dashboard_layout': preferences.dashboard_layout,
            'default_view': preferences.default_view,
            'language': preferences.language,
            'items_per_page': preferences.items_per_page,
            'notifications_email': preferences.notifications_email,
            'notifications_push': preferences.notifications_push,
            'notifications_daily_digest': preferences.notifications_daily_digest,
            'notifications_maintenance': preferences.notifications_maintenance,
            'notifications_warranty': preferences.notifications_warranty,
            'dashboard_shortcuts': preferences.dashboard_shortcuts,
            'dashboard_widgets': preferences.get_dashboard_widgets(),
            'default_filters': preferences.default_filters,
        }
        
        return Response({
            'success': True,
            'preferences': preferences_data
        })
    
    def post(self, request):
        """Оновити налаштування користувача"""
        preferences_data = request.data.get('preferences', {})
        
        # Фільтрувати дозволені поля
        allowed_fields = [
            'theme', 'dashboard_layout', 'default_view', 'language', 'items_per_page',
            'notifications_email', 'notifications_push', 'notifications_daily_digest',
            'notifications_maintenance', 'notifications_warranty', 'dashboard_shortcuts',
            'dashboard_widgets', 'default_filters'
        ]
        
        filtered_data = {k: v for k, v in preferences_data.items() if k in allowed_fields}
        
        try:
            preferences = PersonalizationService.update_user_preferences(request.user, filtered_data)
            
            return Response({
                'success': True,
                'message': 'Налаштування оновлено успішно'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=400)


class DashboardWidgetsView(APIView):
    """API для керування віджетами дашборду"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Оновити налаштування віджету"""
        widget_type = request.data.get('widget_type')
        enabled = request.data.get('enabled', True)
        order = request.data.get('order')
        
        if not widget_type:
            return Response({
                'success': False,
                'error': 'Не вказано тип віджету'
            }, status=400)
        
        try:
            preferences = PersonalizationService.get_user_preferences(request.user)
            preferences.set_dashboard_widget(widget_type, enabled, order)
            
            return Response({
                'success': True,
                'message': 'Налаштування віджету оновлено'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=400)


class FavoriteEquipmentView(APIView):
    """API для улюбленого обладнання"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати улюблене обладнання користувача"""
        preferences = PersonalizationService.get_user_preferences(request.user)
        favorite_equipment = preferences.favorite_equipment.all().values(
            'id', 'name', 'serial_number', 'status', 'location'
        )
        
        return Response({
            'success': True,
            'favorites': list(favorite_equipment)
        })
    
    def post(self, request):
        """Додати обладнання до улюбленого"""
        equipment_id = request.data.get('equipment_id')
        
        if not equipment_id:
            return Response({
                'success': False,
                'error': 'Не вказано ID обладнання'
            }, status=400)
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
            preferences = PersonalizationService.get_user_preferences(request.user)
            preferences.favorite_equipment.add(equipment)
            
            return Response({
                'success': True,
                'message': f'Обладнання "{equipment.name}" додано до улюбленого'
            })
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)
    
    def delete(self, request):
        """Видалити обладнання з улюбленого"""
        equipment_id = request.data.get('equipment_id')
        
        if not equipment_id:
            return Response({
                'success': False,
                'error': 'Не вказано ID обладнання'
            }, status=400)
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
            preferences = PersonalizationService.get_user_preferences(request.user)
            preferences.favorite_equipment.remove(equipment)
            
            return Response({
                'success': True,
                'message': f'Обладнання "{equipment.name}" видалено з улюбленого'
            })
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)


class AdvancedSearchView(APIView):
    """API для розширеного пошуку"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Виконати розширений пошук"""
        query = request.data.get('query', '').strip()
        filters = request.data.get('filters', {})
        sort_by = request.data.get('sort_by', 'name')
        sort_order = request.data.get('sort_order', 'asc')
        page_size = request.data.get('page_size', 25)
        page = request.data.get('page', 1)
        
        # Базовий queryset
        equipment_qs = Equipment.objects.all()
        
        # Текстовий пошук
        if query:
            from django.db.models import Q
            equipment_qs = equipment_qs.filter(
                Q(name__icontains=query) |
                Q(serial_number__icontains=query) |
                Q(inventory_number__icontains=query) |
                Q(model__icontains=query) |
                Q(manufacturer__name__icontains=query) |
                Q(location__icontains=query) |
                Q(notes__icontains=query)
            )
        
        # Фільтри
        if filters.get('status'):
            equipment_qs = equipment_qs.filter(status__in=filters['status'])
        
        if filters.get('category'):
            equipment_qs = equipment_qs.filter(category__in=filters['category'])
        
        if filters.get('manufacturer'):
            equipment_qs = equipment_qs.filter(manufacturer__in=filters['manufacturer'])
        
        if filters.get('department'):
            equipment_qs = equipment_qs.filter(department__in=filters['department'])
        
        if filters.get('current_user'):
            equipment_qs = equipment_qs.filter(current_user__in=filters['current_user'])
        
        if filters.get('location'):
            equipment_qs = equipment_qs.filter(location__icontains=filters['location'])
        
        # Фільтри дат
        if filters.get('purchase_date_from'):
            equipment_qs = equipment_qs.filter(purchase_date__gte=filters['purchase_date_from'])
        
        if filters.get('purchase_date_to'):
            equipment_qs = equipment_qs.filter(purchase_date__lte=filters['purchase_date_to'])
        
        if filters.get('warranty_expiring_days'):
            from datetime import timedelta
            cutoff_date = timezone.now().date() + timedelta(days=int(filters['warranty_expiring_days']))
            equipment_qs = equipment_qs.filter(
                warranty_until__lte=cutoff_date,
                warranty_until__gte=timezone.now().date()
            )
        
        if filters.get('needs_maintenance'):
            equipment_qs = equipment_qs.filter(
                next_maintenance_date__lte=timezone.now().date()
            )
        
        # Фільтри вартості
        if filters.get('price_from'):
            equipment_qs = equipment_qs.filter(purchase_price__gte=filters['price_from'])
        
        if filters.get('price_to'):
            equipment_qs = equipment_qs.filter(purchase_price__lte=filters['price_to'])
        
        # Тільки улюблене обладнання користувача
        if filters.get('favorites_only'):
            preferences = PersonalizationService.get_user_preferences(request.user)
            favorite_ids = preferences.favorite_equipment.values_list('id', flat=True)
            equipment_qs = equipment_qs.filter(id__in=favorite_ids)
        
        # Сортування
        sort_field = sort_by
        if sort_order == 'desc':
            sort_field = f'-{sort_field}'
        
        equipment_qs = equipment_qs.select_related(
            'manufacturer', 'category', 'department', 'current_user', 'responsible_person'
        ).order_by(sort_field)
        
        # Пагінація
        from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
        
        paginator = Paginator(equipment_qs, page_size)
        
        try:
            equipment_page = paginator.page(page)
        except PageNotAnInteger:
            equipment_page = paginator.page(1)
        except EmptyPage:
            equipment_page = paginator.page(paginator.num_pages)
        
        # Серіалізувати результати
        results = []
        for eq in equipment_page:
            results.append({
                'id': eq.id,
                'name': eq.name,
                'serial_number': eq.serial_number,
                'inventory_number': eq.inventory_number,
                'model': eq.model,
                'status': eq.status,
                'status_display': eq.get_status_display(),
                'manufacturer': eq.manufacturer.name if eq.manufacturer else None,
                'category': eq.category.name if eq.category else None,
                'department': eq.department.name if eq.department else None,
                'current_user': eq.current_user.get_full_name() if eq.current_user else None,
                'location': eq.location,
                'purchase_date': eq.purchase_date.isoformat() if eq.purchase_date else None,
                'purchase_price': float(eq.purchase_price) if eq.purchase_price else None,
                'warranty_until': eq.warranty_until.isoformat() if eq.warranty_until else None,
                'next_maintenance_date': eq.next_maintenance_date.isoformat() if eq.next_maintenance_date else None,
                'url': f'/equipment/{eq.id}/'
            })
        
        return Response({
            'success': True,
            'results': results,
            'pagination': {
                'total': paginator.count,
                'pages': paginator.num_pages,
                'current_page': equipment_page.number,
                'has_next': equipment_page.has_next(),
                'has_previous': equipment_page.has_previous(),
                'page_size': page_size
            },
            'query': query,
            'filters_applied': len([k for k, v in filters.items() if v])
        })


class SearchSuggestionsView(APIView):
    """API для пропозицій пошуку"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати пропозиції для пошуку"""
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if len(query) < 2:
            return Response({
                'success': True,
                'suggestions': []
            })
        
        suggestions = []
        
        # Пошук по назвах обладнання
        equipment_names = Equipment.objects.filter(
            name__icontains=query
        ).values_list('name', flat=True).distinct()[:limit//2]
        
        for name in equipment_names:
            suggestions.append({
                'text': name,
                'type': 'equipment_name',
                'category': 'Назви обладнання'
            })
        
        # Пошук по серійних номерах
        serial_numbers = Equipment.objects.filter(
            serial_number__icontains=query
        ).values_list('serial_number', flat=True).distinct()[:limit//4]
        
        for serial in serial_numbers:
            suggestions.append({
                'text': serial,
                'type': 'serial_number',
                'category': 'Серійні номери'
            })
        
        # Пошук по локаціях
        locations = Equipment.objects.filter(
            location__icontains=query
        ).values_list('location', flat=True).distinct()[:limit//4]
        
        for location in locations:
            if location:  # Перевірити що локація не пуста
                suggestions.append({
                    'text': location,
                    'type': 'location',
                    'category': 'Локації'
                })
        
        return Response({
            'success': True,
            'suggestions': suggestions[:limit]
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_search_filter(request):
    """Зберегти фільтр пошуку"""
    filter_name = request.data.get('name')
    filter_data = request.data.get('filters')
    
    if not filter_name or not filter_data:
        return Response({
            'success': False,
            'error': 'Не вказано назву або дані фільтру'
        }, status=400)
    
    try:
        preferences = PersonalizationService.get_user_preferences(request.user)
        saved_filters = preferences.default_filters.get('saved_filters', {})
        saved_filters[filter_name] = filter_data
        preferences.default_filters['saved_filters'] = saved_filters
        preferences.save()
        
        return Response({
            'success': True,
            'message': f'Фільтр "{filter_name}" збережено'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_filters(request):
    """Отримати збережені фільтри користувача"""
    preferences = PersonalizationService.get_user_preferences(request.user)
    saved_filters = preferences.default_filters.get('saved_filters', {})
    
    return Response({
        'success': True,
        'filters': saved_filters
    })


# ========== TWO-FACTOR AUTHENTICATION VIEWS ==========

class TwoFactorSetupView(APIView):
    """API для налаштування 2FA"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати QR код для налаштування 2FA"""
        user = request.user
        
        # Перевірити чи вже увімкнена 2FA
        if TwoFactorAuthService.is_2fa_enabled(user):
            return Response({
                'success': False,
                'error': 'Двофакторна аутентифікація вже увімкнена'
            }, status=400)
        
        # Згенерувати новий секрет
        secret = TwoFactorAuthService.generate_secret()
        
        # Згенерувати QR код
        qr_code = TwoFactorAuthService.generate_qr_code(user, secret)
        
        # Зберегти секрет тимчасово (без активації)
        request.session['temp_2fa_secret'] = secret
        
        return Response({
            'success': True,
            'qr_code': qr_code,
            'secret': secret,
            'manual_entry_key': secret
        })
    
    def post(self, request):
        """Підтвердити налаштування 2FA"""
        user = request.user
        token = request.data.get('token')
        
        if not token:
            return Response({
                'success': False,
                'error': 'Не вказано код підтвердження'
            }, status=400)
        
        # Отримати тимчасовий секрет
        temp_secret = request.session.get('temp_2fa_secret')
        if not temp_secret:
            return Response({
                'success': False,
                'error': 'Секрет не знайдено. Спробуйте налаштувати 2FA знову.'
            }, status=400)
        
        # Перевірити токен
        import pyotp
        totp = pyotp.TOTP(temp_secret)
        if not totp.verify(token, valid_window=1):
            return Response({
                'success': False,
                'error': 'Неправильний код підтвердження'
            }, status=400)
        
        # Зберегти секрет та увімкнути 2FA
        TwoFactorAuthService.save_user_secret(user, temp_secret)
        TwoFactorAuthService.enable_2fa(user)
        
        # Згенерувати резервні коди
        backup_codes = TwoFactorAuthService.generate_backup_codes(user)
        
        # Очистити тимчасовий секрет
        request.session.pop('temp_2fa_secret', None)
        
        return Response({
            'success': True,
            'message': 'Двофакторна аутентифікація увімкнена',
            'backup_codes': backup_codes
        })


class TwoFactorDisableView(APIView):
    """API для відключення 2FA"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Відключити 2FA"""
        user = request.user
        password = request.data.get('password')
        token = request.data.get('token')
        
        # Перевірити пароль
        if not user.check_password(password):
            return Response({
                'success': False,
                'error': 'Неправильний пароль'
            }, status=400)
        
        # Перевірити TOTP токен або резервний код
        valid_token = False
        
        if token:
            # Спробувати як TOTP токен
            if TwoFactorAuthService.verify_token(user, token):
                valid_token = True
            # Спробувати як резервний код
            elif TwoFactorAuthService.verify_backup_code(user, token):
                valid_token = True
        
        if not valid_token:
            return Response({
                'success': False,
                'error': 'Неправильний код аутентифікації'
            }, status=400)
        
        # Відключити 2FA
        TwoFactorAuthService.disable_2fa(user)
        
        return Response({
            'success': True,
            'message': 'Двофакторна аутентифікація відключена'
        })


class TwoFactorVerifyView(APIView):
    """API для верифікації 2FA під час входу"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Верифікувати 2FA токен"""
        user = request.user
        token = request.data.get('token')
        
        if not token:
            return Response({
                'success': False,
                'error': 'Не вказано код аутентифікації'
            }, status=400)
        
        # Перевірити чи увімкнена 2FA
        if not TwoFactorAuthService.is_2fa_enabled(user):
            return Response({
                'success': False,
                'error': 'Двофакторна аутентифікація не увімкнена'
            }, status=400)
        
        # Перевірити TOTP токен
        if TwoFactorAuthService.verify_token(user, token):
            # Створити 2FA сесію
            session_token = TwoFactorAuthService.create_2fa_session(user)
            request.session['2fa_session_token'] = session_token
            
            return Response({
                'success': True,
                'message': 'Аутентифікацію пройдено успішно'
            })
        
        # Спробувати як резервний код
        if TwoFactorAuthService.verify_backup_code(user, token):
            # Створити 2FA сесію
            session_token = TwoFactorAuthService.create_2fa_session(user)
            request.session['2fa_session_token'] = session_token
            
            # Попередити про використання резервного коду
            remaining_codes = len(TwoFactorAuthService.get_backup_codes(user))
            
            return Response({
                'success': True,
                'message': 'Аутентифікацію пройдено з використанням резервного коду',
                'warning': f'Залишилось резервних кодів: {remaining_codes}',
                'backup_code_used': True
            })
        
        return Response({
            'success': False,
            'error': 'Неправильний код аутентифікації'
        }, status=400)


class TwoFactorStatusView(APIView):
    """API для отримання статусу 2FA"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати статус 2FA користувача"""
        user = request.user
        
        is_enabled = TwoFactorAuthService.is_2fa_enabled(user)
        backup_codes_count = len(TwoFactorAuthService.get_backup_codes(user)) if is_enabled else 0
        
        # Перевірити наявність валідної 2FA сесії
        session_token = request.session.get('2fa_session_token')
        has_valid_session = False
        
        if session_token:
            session_data = TwoFactorAuthService.verify_2fa_session(session_token)
            has_valid_session = session_data is not None
        
        return Response({
            'success': True,
            'is_2fa_enabled': is_enabled,
            'backup_codes_count': backup_codes_count,
            'has_valid_session': has_valid_session,
            'requires_2fa': is_enabled and not has_valid_session
        })


class BackupCodesView(APIView):
    """API для роботи з резервними кодами"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати резервні коди (тільки після підтвердження паролю)"""
        user = request.user
        password = request.GET.get('password')
        
        if not password or not user.check_password(password):
            return Response({
                'success': False,
                'error': 'Неправильний пароль'
            }, status=400)
        
        backup_codes = TwoFactorAuthService.get_backup_codes(user)
        
        return Response({
            'success': True,
            'backup_codes': backup_codes
        })
    
    def post(self, request):
        """Згенерувати нові резервні коди"""
        user = request.user
        password = request.data.get('password')
        token = request.data.get('token')
        
        # Перевірити пароль
        if not password or not user.check_password(password):
            return Response({
                'success': False,
                'error': 'Неправильний пароль'
            }, status=400)
        
        # Перевірити 2FA токен
        if not TwoFactorAuthService.verify_token(user, token):
            return Response({
                'success': False,
                'error': 'Неправильний код аутентифікації'
            }, status=400)
        
        # Згенерувати нові коди
        backup_codes = TwoFactorAuthService.generate_backup_codes(user)
        
        return Response({
            'success': True,
            'message': 'Згенеровано нові резервні коди',
            'backup_codes': backup_codes
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_2fa(request):
    """Вийти з 2FA сесії"""
    session_token = request.session.get('2fa_session_token')
    
    if session_token:
        TwoFactorAuthService.invalidate_2fa_session(session_token)
        request.session.pop('2fa_session_token', None)
    
    return Response({
        'success': True,
        'message': '2FA сесія завершена'
    })


class RateLimitingView(APIView):
    """API для керування обмеженнями швидкості запитів"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати інформацію про поточні обмеження"""
        user = request.user
        ip_address = request.META.get('REMOTE_ADDR')
        
        # Перевірити поточні лімити
        from django.core.cache import cache
        
        user_key = f"rate_limit_user_{user.id}"
        ip_key = f"rate_limit_ip_{ip_address}"
        
        user_requests = cache.get(user_key, 0)
        ip_requests = cache.get(ip_key, 0)
        
        return Response({
            'success': True,
            'limits': {
                'user_requests': user_requests,
                'ip_requests': ip_requests,
                'user_limit': 1000,  # запитів на годину
                'ip_limit': 500,     # запитів на годину для IP
            }
        })


# ========== MAINTENANCE MODULE VIEWS ==========

class MaintenanceRequestViewSet(ModelViewSet):
    """ViewSet для запитів на ТО"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Фільтрувати запити залежно від ролі користувача"""
        user = self.request.user
        
        if user.is_staff:
            # Адміністратори бачать все
            return MaintenanceRequest.objects.all().select_related(
                'equipment', 'requester', 'assigned_technician'
            ).prefetch_related('tasks')
        else:
            # Звичайні користувачі бачать тільки свої запити
            return MaintenanceRequest.objects.filter(
                models.Q(requester=user) | models.Q(assigned_technician=user)
            ).select_related(
                'equipment', 'requester', 'assigned_technician'
            ).prefetch_related('tasks')
    
    def create(self, request):
        """Створити новий запит на ТО"""
        equipment_id = request.data.get('equipment_id')
        request_type = request.data.get('request_type', 'REPAIR')
        title = request.data.get('title')
        description = request.data.get('description')
        priority = request.data.get('priority', 'MEDIUM')
        scheduled_date = request.data.get('scheduled_date')
        
        if not all([equipment_id, title, description]):
            return Response({
                'success': False,
                'error': 'Не вказано обов\'язкові поля'
            }, status=400)
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
            
            # Конвертувати дату якщо вказана
            scheduled_datetime = None
            if scheduled_date:
                scheduled_datetime = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
            
            maintenance_request = MaintenanceService.create_maintenance_request(
                equipment=equipment,
                request_type=request_type,
                title=title,
                description=description,
                requester=request.user,
                priority=priority,
                scheduled_date=scheduled_datetime
            )
            
            return Response({
                'success': True,
                'request_id': str(maintenance_request.id),
                'message': 'Запит на ТО створено успішно'
            })
            
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=400)
    
    def retrieve(self, request, pk=None):
        """Отримати детальну інформацію про запит"""
        try:
            maintenance_request = self.get_queryset().get(id=pk)
            
            data = {
                'id': str(maintenance_request.id),
                'equipment': {
                    'id': maintenance_request.equipment.id,
                    'name': maintenance_request.equipment.name,
                    'serial_number': maintenance_request.equipment.serial_number,
                    'location': maintenance_request.equipment.location,
                },
                'request_type': maintenance_request.request_type,
                'title': maintenance_request.title,
                'description': maintenance_request.description,
                'priority': maintenance_request.priority,
                'status': maintenance_request.status,
                'requester': {
                    'id': maintenance_request.requester.id,
                    'name': maintenance_request.requester.get_full_name()
                },
                'assigned_technician': {
                    'id': maintenance_request.assigned_technician.id,
                    'name': maintenance_request.assigned_technician.get_full_name()
                } if maintenance_request.assigned_technician else None,
                'dates': {
                    'requested': maintenance_request.requested_date.isoformat(),
                    'scheduled': maintenance_request.scheduled_date.isoformat() if maintenance_request.scheduled_date else None,
                    'started': maintenance_request.started_date.isoformat() if maintenance_request.started_date else None,
                    'completed': maintenance_request.completed_date.isoformat() if maintenance_request.completed_date else None,
                },
                'costs': {
                    'estimated': float(maintenance_request.estimated_cost) if maintenance_request.estimated_cost else None,
                    'actual': float(maintenance_request.actual_cost) if maintenance_request.actual_cost else None,
                },
                'duration': {
                    'estimated': str(maintenance_request.estimated_duration) if maintenance_request.estimated_duration else None,
                    'actual': str(maintenance_request.actual_duration) if maintenance_request.actual_duration else None,
                },
                'parts_needed': maintenance_request.parts_needed,
                'downtime_required': maintenance_request.downtime_required,
                'notes': maintenance_request.notes,
                'tasks': [
                    {
                        'id': task.id,
                        'title': task.title,
                        'description': task.description,
                        'status': task.status,
                        'assigned_to': task.assigned_to.get_full_name() if task.assigned_to else None,
                        'estimated_duration': str(task.estimated_duration) if task.estimated_duration else None,
                        'actual_duration': str(task.actual_duration) if task.actual_duration else None,
                        'started_at': task.started_at.isoformat() if task.started_at else None,
                        'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                        'notes': task.notes,
                        'order': task.order
                    }
                    for task in maintenance_request.tasks.all()
                ]
            }
            
            return Response({
                'success': True,
                'data': data
            })
            
        except MaintenanceRequest.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Запит не знайдено'
            }, status=404)


class MaintenanceDashboardView(APIView):
    """API для дашборду ТО"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати дані дашборду ТО"""
        dashboard_data = MaintenanceService.get_maintenance_dashboard(request.user)
        
        return Response({
            'success': True,
            'data': dashboard_data
        })


class AssignTechnicianView(APIView):
    """API для призначення техніка"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Призначити техніка на запит"""
        request_id = request.data.get('request_id')
        technician_id = request.data.get('technician_id')
        estimated_cost = request.data.get('estimated_cost')
        
        if not request_id or not technician_id:
            return Response({
                'success': False,
                'error': 'Не вказано ID запиту або техніка'
            }, status=400)
        
        try:
            technician = User.objects.get(id=technician_id)
            
            maintenance_request = MaintenanceService.assign_technician(
                request_id=request_id,
                technician=technician,
                estimated_cost=estimated_cost
            )
            
            if maintenance_request:
                return Response({
                    'success': True,
                    'message': f'Техніка {technician.get_full_name()} призначено на запит'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Запит не знайдено'
                }, status=404)
                
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Техніка не знайдено'
            }, status=404)


class StartMaintenanceView(APIView):
    """API для початку ТО"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Розпочати виконання ТО"""
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response({
                'success': False,
                'error': 'Не вказано ID запиту'
            }, status=400)
        
        maintenance_request = MaintenanceService.start_maintenance(
            request_id=request_id,
            technician=request.user
        )
        
        if maintenance_request:
            return Response({
                'success': True,
                'message': 'ТО розпочато'
            })
        else:
            return Response({
                'success': False,
                'error': 'Запит не знайдено або ви не призначені як технік'
            }, status=404)


class CompleteMaintenanceView(APIView):
    """API для завершення ТО"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Завершити ТО"""
        request_id = request.data.get('request_id')
        notes = request.data.get('notes')
        actual_cost = request.data.get('actual_cost')
        parts_used = request.data.get('parts_used')
        
        if not request_id:
            return Response({
                'success': False,
                'error': 'Не вказано ID запиту'
            }, status=400)
        
        maintenance_request = MaintenanceService.complete_maintenance(
            request_id=request_id,
            technician=request.user,
            notes=notes,
            actual_cost=actual_cost,
            parts_used=parts_used
        )
        
        if maintenance_request:
            return Response({
                'success': True,
                'message': 'ТО завершено успішно'
            })
        else:
            return Response({
                'success': False,
                'error': 'Запит не знайдено або ви не призначені як технік'
            }, status=404)


class MaintenanceScheduleView(APIView):
    """API для розкладів ТО"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати розклади ТО"""
        equipment_id = request.GET.get('equipment_id')
        
        schedules_qs = MaintenanceSchedule.objects.filter(is_active=True)
        
        if equipment_id:
            schedules_qs = schedules_qs.filter(equipment_id=equipment_id)
        
        schedules = schedules_qs.select_related('equipment', 'responsible_person')
        
        data = []
        for schedule in schedules:
            data.append({
                'id': schedule.id,
                'equipment': {
                    'id': schedule.equipment.id,
                    'name': schedule.equipment.name,
                },
                'title': schedule.title,
                'description': schedule.description,
                'frequency': schedule.frequency,
                'custom_interval_days': schedule.custom_interval_days,
                'next_maintenance': schedule.next_maintenance.isoformat(),
                'responsible_person': {
                    'id': schedule.responsible_person.id,
                    'name': schedule.responsible_person.get_full_name()
                } if schedule.responsible_person else None,
                'estimated_duration': str(schedule.estimated_duration),
                'checklist': schedule.checklist,
                'days_until': (schedule.next_maintenance.date() - timezone.now().date()).days
            })
        
        return Response({
            'success': True,
            'schedules': data
        })
    
    def post(self, request):
        """Створити новий розклад ТО"""
        if not request.user.is_staff:
            return Response({
                'success': False,
                'error': 'Недостатньо прав'
            }, status=403)
        
        equipment_id = request.data.get('equipment_id')
        title = request.data.get('title')
        description = request.data.get('description')
        frequency = request.data.get('frequency')
        next_maintenance = request.data.get('next_maintenance')
        estimated_duration_hours = request.data.get('estimated_duration_hours', 1)
        
        if not all([equipment_id, title, description, frequency, next_maintenance]):
            return Response({
                'success': False,
                'error': 'Не вказано обов\'язкові поля'
            }, status=400)
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
            
            schedule = MaintenanceSchedule.objects.create(
                equipment=equipment,
                title=title,
                description=description,
                frequency=frequency,
                next_maintenance=datetime.fromisoformat(next_maintenance.replace('Z', '+00:00')),
                responsible_person=request.user,
                estimated_duration=timedelta(hours=estimated_duration_hours),
                custom_interval_days=request.data.get('custom_interval_days'),
                checklist=request.data.get('checklist', [])
            )
            
            return Response({
                'success': True,
                'schedule_id': schedule.id,
                'message': 'Розклад ТО створено'
            })
            
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_technicians(request):
    """Отримати список техніків"""
    # Техніки - користувачі з групою 'Technicians' або staff
    technicians = User.objects.filter(
        models.Q(groups__name='Technicians') | models.Q(is_staff=True),
        is_active=True
    ).distinct()
    
    data = [
        {
            'id': tech.id,
            'name': tech.get_full_name() or tech.username,
            'email': tech.email,
            'active_assignments': MaintenanceRequest.objects.filter(
                assigned_technician=tech,
                status__in=['APPROVED', 'IN_PROGRESS']
            ).count()
        }
        for tech in technicians
    ]
    
    return Response({
        'success': True,
        'technicians': data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_scheduled_maintenance(request):
    """Створити запити на планове ТО (викликається автоматично)"""
    if not request.user.is_staff:
        return Response({
            'success': False,
            'error': 'Недостатньо прав'
        }, status=403)
    
    created_requests = MaintenanceService.create_scheduled_maintenance_requests()
    
    return Response({
        'success': True,
        'created_count': len(created_requests),
        'message': f'Створено {len(created_requests)} запитів на планове ТО'
    })


# ========== SPARE PARTS MANAGEMENT VIEWS ==========

class SparePartsViewSet(ModelViewSet):
    """ViewSet для управління запчастинами"""
    queryset = SparePart.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'part_number', 'manufacturer_part_number', 'description']
    ordering_fields = ['name', 'quantity_in_stock', 'unit_cost', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        """Повернути відповідний сериалізатор"""
        # Для простоти використаємо базовий сериалізатор
        from rest_framework import serializers
        
        class SparePartSerializer(serializers.ModelSerializer):
            total_value = serializers.ReadOnlyField()
            needs_reorder = serializers.ReadOnlyField()
            is_low_stock = serializers.ReadOnlyField()
            
            class Meta:
                model = SparePart
                fields = '__all__'
        
        return SparePartSerializer
    
    def get_queryset(self):
        """Кастомна фільтрація запчастин"""
        queryset = SparePart.objects.select_related('category', 'primary_supplier')
        
        # Фільтр по статусу
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Фільтр по критичності
        is_critical = self.request.query_params.get('is_critical')
        if is_critical == 'true':
            queryset = queryset.filter(is_critical=True)
        
        # Фільтр по низьким запасам
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            queryset = queryset.filter(quantity_in_stock__lte=models.F('minimum_stock_level'))
        
        # Фільтр по категорії
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Отримати дашборд запчастин"""
        dashboard_data = SparePartsService.get_inventory_dashboard()
        return Response({
            'success': True,
            'data': dashboard_data
        })
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Отримати запчастини з низьким рівнем запасів"""
        low_stock_parts = SparePartsService.get_low_stock_parts()
        
        from rest_framework import serializers
        class LowStockSerializer(serializers.ModelSerializer):
            class Meta:
                model = SparePart
                fields = ['id', 'name', 'part_number', 'quantity_in_stock', 'minimum_stock_level', 'is_critical']
        
        serializer = LowStockSerializer(low_stock_parts, many=True)
        return Response({
            'success': True,
            'parts': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def reorder_suggestions(self, request):
        """Отримати пропозиції для перезамовлення"""
        suggestions = SparePartsService.get_reorder_suggestions()
        return Response({
            'success': True,
            'suggestions': suggestions
        })


class SparePartMovementView(APIView):
    """API для руху запчастин"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Отримати історію руху запчастин"""
        spare_part_id = request.GET.get('spare_part_id')
        
        movements_qs = SparePartMovement.objects.select_related(
            'spare_part', 'performed_by', 'equipment'
        ).order_by('-performed_at')
        
        if spare_part_id:
            movements_qs = movements_qs.filter(spare_part_id=spare_part_id)
        
        # Пагінація
        page_size = int(request.GET.get('page_size', 20))
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        movements = movements_qs[start:end]
        total_count = movements_qs.count()
        
        data = []
        for movement in movements:
            data.append({
                'id': str(movement.id),
                'spare_part': {
                    'id': str(movement.spare_part.id),
                    'name': movement.spare_part.name,
                    'part_number': movement.spare_part.part_number
                },
                'movement_type': movement.movement_type,
                'movement_type_display': movement.get_movement_type_display(),
                'quantity': movement.quantity,
                'unit_cost': str(movement.unit_cost),
                'reference_number': movement.reference_number,
                'equipment': {
                    'id': movement.equipment.id,
                    'name': movement.equipment.name
                } if movement.equipment else None,
                'notes': movement.notes,
                'performed_by': movement.performed_by.get_full_name() if movement.performed_by else None,
                'performed_at': movement.performed_at.isoformat()
            })
        
        return Response({
            'success': True,
            'movements': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total_count,
                'has_next': end < total_count
            }
        })
    
    def post(self, request):
        """Створити новий рух запчастини"""
        spare_part_id = request.data.get('spare_part_id')
        movement_type = request.data.get('movement_type')
        quantity = request.data.get('quantity')
        equipment_id = request.data.get('equipment_id')
        maintenance_request_id = request.data.get('maintenance_request_id')
        unit_cost = request.data.get('unit_cost')
        reference_number = request.data.get('reference_number')
        notes = request.data.get('notes')
        
        if not all([spare_part_id, movement_type, quantity]):
            return Response({
                'success': False,
                'error': 'Не вказано обов\'язкові поля'
            }, status=400)
        
        try:
            spare_part = SparePart.objects.get(id=spare_part_id)
            equipment = Equipment.objects.get(id=equipment_id) if equipment_id else None
            maintenance_request = MaintenanceRequest.objects.get(id=maintenance_request_id) if maintenance_request_id else None
            
            # Перевірити наявність для видачі
            if movement_type in ['ISSUE', 'WRITE_OFF'] and spare_part.quantity_in_stock < int(quantity):
                return Response({
                    'success': False,
                    'error': 'Недостатньо запчастин в наявності'
                }, status=400)
            
            movement = SparePartMovement.objects.create(
                spare_part=spare_part,
                movement_type=movement_type,
                quantity=int(quantity),
                unit_cost=unit_cost or spare_part.unit_cost,
                reference_number=reference_number,
                equipment=equipment,
                maintenance_request=maintenance_request,
                notes=notes,
                performed_by=request.user
            )
            
            return Response({
                'success': True,
                'movement_id': str(movement.id),
                'message': f'{movement.get_movement_type_display()} запчастини записано'
            })
            
        except SparePart.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Запчастину не знайдено'
            }, status=404)
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)


class IssueSparePartView(APIView):
    """API для видачі запчастин"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Видати запчастину"""
        spare_part_id = request.data.get('spare_part_id')
        quantity = request.data.get('quantity')
        equipment_id = request.data.get('equipment_id')
        maintenance_request_id = request.data.get('maintenance_request_id')
        notes = request.data.get('notes')
        
        if not all([spare_part_id, quantity]):
            return Response({
                'success': False,
                'error': 'Не вказано обов\'язкові поля'
            }, status=400)
        
        try:
            equipment = Equipment.objects.get(id=equipment_id) if equipment_id else None
            maintenance_request = MaintenanceRequest.objects.get(id=maintenance_request_id) if maintenance_request_id else None
            
            movement, error = SparePartsService.issue_spare_part(
                spare_part_id=spare_part_id,
                quantity=int(quantity),
                equipment=equipment,
                maintenance_request=maintenance_request,
                performed_by=request.user,
                notes=notes
            )
            
            if movement:
                return Response({
                    'success': True,
                    'movement_id': str(movement.id),
                    'message': 'Запчастину видано успішно'
                })
            else:
                return Response({
                    'success': False,
                    'error': error
                }, status=400)
                
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Обладнання не знайдено'
            }, status=404)
        except MaintenanceRequest.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Запит на ТО не знайдено'
            }, status=404)


class ReceiveSparePartView(APIView):
    """API для отримання запчастин"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Отримати запчастину"""
        spare_part_id = request.data.get('spare_part_id')
        quantity = request.data.get('quantity')
        unit_cost = request.data.get('unit_cost')
        reference_number = request.data.get('reference_number')
        
        if not all([spare_part_id, quantity]):
            return Response({
                'success': False,
                'error': 'Не вказано обов\'язкові поля'
            }, status=400)
        
        movement, error = SparePartsService.receive_spare_part(
            spare_part_id=spare_part_id,
            quantity=int(quantity),
            unit_cost=unit_cost,
            reference_number=reference_number,
            performed_by=request.user
        )
        
        if movement:
            return Response({
                'success': True,
                'movement_id': str(movement.id),
                'message': 'Запчастину отримано успішно'
            })
        else:
            return Response({
                'success': False,
                'error': error
            }, status=400)


class SuppliersViewSet(ModelViewSet):
    """ViewSet для управління постачальниками"""
    queryset = Supplier.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'contact_person', 'email']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class SupplierSerializer(serializers.ModelSerializer):
            class Meta:
                model = Supplier
                fields = '__all__'
        
        return SupplierSerializer


class PurchaseOrdersViewSet(ModelViewSet):
    """ViewSet для управління замовленнями"""
    queryset = PurchaseOrder.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['order_number', 'supplier__name']
    ordering_fields = ['order_date', 'total_amount', 'status']
    ordering = ['-order_date']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class PurchaseOrderItemSerializer(serializers.ModelSerializer):
            spare_part_name = serializers.CharField(source='spare_part.name', read_only=True)
            spare_part_number = serializers.CharField(source='spare_part.part_number', read_only=True)
            quantity_pending = serializers.ReadOnlyField()
            is_fully_received = serializers.ReadOnlyField()
            
            class Meta:
                model = PurchaseOrderItem
                fields = '__all__'
        
        class PurchaseOrderSerializer(serializers.ModelSerializer):
            items = PurchaseOrderItemSerializer(many=True, read_only=True)
            supplier_name = serializers.CharField(source='supplier.name', read_only=True)
            created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
            
            class Meta:
                model = PurchaseOrder
                fields = '__all__'
        
        return PurchaseOrderSerializer
    
    def get_queryset(self):
        """Кастомна фільтрація замовлень"""
        queryset = PurchaseOrder.objects.select_related('supplier', 'created_by')
        
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Отримати замовлення"""
        order = self.get_object()
        received_items = request.data.get('received_items', [])
        
        if not received_items:
            return Response({
                'success': False,
                'error': 'Не вказано отримані позиції'
            }, status=400)
        
        purchase_order, error = SparePartsService.receive_purchase_order(
            order_id=order.id,
            received_items=received_items,
            performed_by=request.user
        )
        
        if purchase_order:
            return Response({
                'success': True,
                'message': 'Замовлення отримано успішно',
                'status': purchase_order.status
            })
        else:
            return Response({
                'success': False,
                'error': error
            }, status=400)


class CreatePurchaseOrderView(APIView):
    """API для створення замовлення на закупівлю"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Створити нове замовлення"""
        supplier_id = request.data.get('supplier_id')
        items = request.data.get('items', [])
        
        if not all([supplier_id, items]):
            return Response({
                'success': False,
                'error': 'Не вказано постачальника або позиції замовлення'
            }, status=400)
        
        purchase_order, error = SparePartsService.create_purchase_order(
            supplier_id=supplier_id,
            items=items,
            created_by=request.user
        )
        
        if purchase_order:
            return Response({
                'success': True,
                'order_id': str(purchase_order.id),
                'order_number': purchase_order.order_number,
                'message': 'Замовлення створено успішно'
            })
        else:
            return Response({
                'success': False,
                'error': error
            }, status=400)


class SparePartCategoriesViewSet(ModelViewSet):
    """ViewSet для категорій запчастин"""
    queryset = SparePartCategory.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['name']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class SparePartCategorySerializer(serializers.ModelSerializer):
            class Meta:
                model = SparePartCategory
                fields = '__all__'
        
        return SparePartCategorySerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_spare_parts_for_equipment(request, equipment_id):
    """Отримати сумісні запчастини для обладнання"""
    try:
        equipment = Equipment.objects.get(id=equipment_id)
        spare_parts = equipment.spare_parts.all()
        
        from rest_framework import serializers
        
        class EquipmentSparePartSerializer(serializers.ModelSerializer):
            class Meta:
                model = SparePart
                fields = ['id', 'name', 'part_number', 'quantity_in_stock', 'unit_cost', 'status']
        
        serializer = EquipmentSparePartSerializer(spare_parts, many=True)
        
        return Response({
            'success': True,
            'spare_parts': serializer.data
        })
        
    except Equipment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Обладнання не знайдено'
        }, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spare_parts_analytics(request):
    """Аналітика по запчастинах"""
    from django.db.models import Sum, Count, Avg
    from django.utils import timezone
    from datetime import timedelta
    
    # Базова статистика
    total_parts = SparePart.objects.count()
    total_value = SparePart.objects.aggregate(
        total=Sum(models.F('quantity_in_stock') * models.F('unit_cost'))
    )['total'] or 0
    
    # Статистика по статусам
    status_stats = SparePart.objects.values('status').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Топ дорогих запчастин
    expensive_parts = SparePart.objects.order_by('-unit_cost')[:10].values(
        'name', 'part_number', 'unit_cost', 'quantity_in_stock'
    )
    
    # Статистика руху за місяць
    month_ago = timezone.now() - timedelta(days=30)
    movement_stats = SparePartMovement.objects.filter(
        performed_at__gte=month_ago
    ).values('movement_type').annotate(
        count=Count('id'),
        total_quantity=Sum('quantity')
    ).order_by('-count')
    
    # Топ постачальників
    supplier_stats = Supplier.objects.filter(
        is_active=True
    ).annotate(
        parts_count=Count('primary_parts')
    ).order_by('-parts_count')[:10].values(
        'name', 'parts_count', 'rating'
    )
    
    return Response({
        'success': True,
        'analytics': {
            'overview': {
                'total_parts': total_parts,
                'total_value': str(total_value),
                'low_stock_count': SparePart.objects.filter(status='LOW_STOCK').count(),
                'out_of_stock_count': SparePart.objects.filter(status='OUT_OF_STOCK').count()
            },
            'status_distribution': list(status_stats),
            'expensive_parts': list(expensive_parts),
            'movement_stats': list(movement_stats),
            'top_suppliers': list(supplier_stats)
        }
    })


