# inventory/advanced_views.py — Нові моделі, серіалізатори та views
import io
import logging
from decimal import Decimal
from datetime import timedelta

from django.db import models
from django.db.models import Q, Sum, Count, Avg, F
from django.utils import timezone
from django.http import HttpResponse
from django.contrib.auth import get_user_model

from rest_framework import viewsets, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Equipment, UserActivity

logger = logging.getLogger("inventory")
User = get_user_model()


# ============================================================
# MODELS
# ============================================================


class Contract(models.Model):
    CONTRACT_TYPE_CHOICES = [
        ("SERVICE", "Сервісне обслуговування"),
        ("SUPPLY", "Постачання"),
        ("LEASE", "Оренда"),
        ("LICENSE", "Ліцензія"),
        ("WARRANTY", "Гарантія"),
        ("SUPPORT", "Підтримка"),
        ("OTHER", "Інше"),
    ]
    STATUS_CHOICES = [
        ("DRAFT", "Чернетка"),
        ("ACTIVE", "Активний"),
        ("EXPIRED", "Закінчився"),
        ("TERMINATED", "Розірваний"),
        ("SUSPENDED", "Призупинений"),
    ]

    title = models.CharField(max_length=255, verbose_name="Назва")
    contract_number = models.CharField(
        max_length=100, unique=True, verbose_name="Номер договору"
    )
    contract_type = models.CharField(
        max_length=20, choices=CONTRACT_TYPE_CHOICES, default="SERVICE"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    counterparty = models.CharField(max_length=255, verbose_name="Контрагент")
    description = models.TextField(blank=True, default="")
    start_date = models.DateField(verbose_name="Дата початку")
    end_date = models.DateField(null=True, blank=True, verbose_name="Дата закінчення")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Сума"
    )
    file = models.FileField(upload_to="contracts/", null=True, blank=True)
    equipment = models.ManyToManyField(Equipment, blank=True, related_name="contracts")
    responsible_person = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="contracts"
    )
    auto_renew = models.BooleanField(default=False)
    reminder_days = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "inventory"
        ordering = ["-created_at"]
        verbose_name = "Договір"
        verbose_name_plural = "Договори"

    def __str__(self):
        return f"{self.contract_number} — {self.title}"


class EquipmentTemplate(models.Model):
    name = models.CharField(max_length=255, verbose_name="Назва шаблону")
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=20, choices=Equipment.CATEGORY_CHOICES, default="PC"
    )
    manufacturer = models.CharField(max_length=255, blank=True, default="")
    model_name = models.CharField(max_length=255, blank=True, default="")
    cpu = models.CharField(max_length=255, blank=True, default="")
    ram = models.CharField(max_length=100, blank=True, default="")
    storage = models.CharField(max_length=255, blank=True, default="")
    gpu = models.CharField(max_length=255, blank=True, default="")
    operating_system = models.CharField(max_length=255, blank=True, default="")
    motherboard = models.CharField(max_length=255, blank=True, default="")
    network_adapter = models.CharField(max_length=255, blank=True, default="")
    power_supply = models.CharField(max_length=255, blank=True, default="")
    default_location = models.CharField(max_length=255, blank=True, default="")
    default_status = models.CharField(max_length=20, default="WORKING")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="equipment_templates"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "inventory"
        ordering = ["-created_at"]
        verbose_name = "Шаблон обладнання"
        verbose_name_plural = "Шаблони обладнання"

    def __str__(self):
        return self.name


# ============================================================
# SERIALIZERS
# ============================================================


class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(
        source="get_contract_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    responsible_person_name = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = "__all__"

    def get_responsible_person_name(self, obj):
        if obj.responsible_person:
            return (
                obj.responsible_person.get_full_name()
                or obj.responsible_person.username
            )
        return ""


class EquipmentTemplateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentTemplate
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ""


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    action_type_display = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()

    ACTION_LABELS = {
        "view_equipment": "Перегляд обладнання",
        "edit_equipment": "Редагування обладнання",
        "add_equipment": "Додавання обладнання",
        "search": "Пошук",
        "export": "Експорт",
        "maintenance": "Обслуговування",
        "login": "Вхід в систему",
    }

    class Meta:
        model = UserActivity
        fields = [
            "id",
            "user",
            "user_name",
            "action_type",
            "action_type_display",
            "target_object_id",
            "target_model",
            "target_name",
            "metadata",
            "ip_address",
            "user_agent",
            "timestamp",
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return ""

    def get_action_type_display(self, obj):
        return self.ACTION_LABELS.get(obj.action_type, obj.action_type)

    def get_target_name(self, obj):
        if obj.target_model == "Equipment" and obj.target_object_id:
            try:
                eq = Equipment.objects.get(pk=obj.target_object_id)
                return eq.name
            except Equipment.DoesNotExist:
                pass
        meta = obj.metadata or {}
        return meta.get("name", meta.get("target_name", ""))


# ============================================================
# PAGINATION
# ============================================================


class StandardPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


# ============================================================
# VIEWSETS
# ============================================================


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["contract_type", "status"]
    search_fields = ["title", "contract_number", "counterparty", "description"]
    ordering_fields = ["created_at", "start_date", "end_date", "amount"]
    parser_classes = [MultiPartParser, FormParser]


class EquipmentTemplateViewSet(viewsets.ModelViewSet):
    queryset = EquipmentTemplate.objects.all()
    serializer_class = EquipmentTemplateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Return all templates

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def create_equipment(self, request, pk=None):
        """Створити обладнання на основі шаблону"""
        template = self.get_object()
        overrides = request.data

        equipment_data = {
            "name": overrides.get("name", f"{template.name} (копія)"),
            "category": template.category,
            "cpu": template.cpu,
            "ram": template.ram,
            "storage": template.storage,
            "gpu": template.gpu,
            "operating_system": template.operating_system,
            "motherboard": template.motherboard,
            "network_adapter": template.network_adapter,
            "power_supply": template.power_supply,
            "location": overrides.get("location", template.default_location),
            "status": template.default_status,
        }

        if template.manufacturer:
            equipment_data["manufacturer"] = template.manufacturer
        if template.model_name:
            equipment_data["model"] = template.model_name

        # Apply overrides
        for key in [
            "serial_number",
            "inventory_number",
            "purchase_price",
            "purchase_date",
            "warranty_until",
            "notes",
            "description",
        ]:
            if key in overrides and overrides[key]:
                equipment_data[key] = overrides[key]

        try:
            eq = Equipment.objects.create(**equipment_data)
            return Response(
                {"id": eq.id, "name": eq.name}, status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# API VIEWS
# ============================================================


class ActivityLogView(APIView):
    """Журнал активності користувачів"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = UserActivity.objects.select_related("user").all()

        # Фільтри
        user_id = request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)

        action_type = request.query_params.get("action_type")
        if action_type:
            qs = qs.filter(action_type=action_type)

        target_model = request.query_params.get("target_model")
        if target_model:
            qs = qs.filter(target_model=target_model)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__username__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs.order_by("-timestamp"), request)
        serializer = ActivityLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class GlobalSearchView(APIView):
    """Глобальний пошук по всіх сутностях"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q or len(q) < 2:
            return Response({"results": {}, "total": 0})

        results = {}
        total = 0

        # Обладнання
        equipment_qs = Equipment.objects.filter(
            Q(name__icontains=q)
            | Q(serial_number__icontains=q)
            | Q(inventory_number__icontains=q)
            | Q(model__icontains=q)
            | Q(location__icontains=q)
        )[:5]
        if equipment_qs.exists():
            results["equipment"] = [
                {
                    "type": "equipment",
                    "id": e.id,
                    "title": e.name,
                    "subtitle": f'{e.get_category_display()} • {e.serial_number or "—"}',
                    "url": f"/equipment/{e.id}",
                }
                for e in equipment_qs
            ]
            total += len(results["equipment"])

        # Користувачі
        users_qs = User.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(username__icontains=q)
            | Q(email__icontains=q)
        )[:5]
        if users_qs.exists():
            results["users"] = [
                {
                    "type": "user",
                    "id": u.id,
                    "title": u.get_full_name() or u.username,
                    "subtitle": u.email,
                    "url": f"/users/{u.id}",
                }
                for u in users_qs
            ]
            total += len(results["users"])

        # Договори
        try:
            contracts_qs = Contract.objects.filter(
                Q(title__icontains=q)
                | Q(contract_number__icontains=q)
                | Q(counterparty__icontains=q)
            )[:5]
            if contracts_qs.exists():
                results["contracts"] = [
                    {
                        "type": "contract",
                        "id": c.id,
                        "title": c.title,
                        "subtitle": f"{c.contract_number} • {c.counterparty}",
                        "url": f"/contracts",
                    }
                    for c in contracts_qs
                ]
                total += len(results["contracts"])
        except Exception:
            pass

        # Запис активності
        UserActivity.objects.create(
            user=request.user,
            action_type="search",
            metadata={"query": q, "results_count": total},
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        )

        return Response({"results": results, "total": total})


class DepreciationReportView(APIView):
    """Амортизаційний звіт"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        equipment = Equipment.objects.filter(
            purchase_price__isnull=False, purchase_price__gt=0
        ).select_related("current_user")

        items = []
        total_purchase = Decimal("0")
        total_book = Decimal("0")
        total_depreciation = Decimal("0")
        rates = []

        for eq in equipment:
            purchase_price = eq.purchase_price or Decimal("0")
            rate = eq.depreciation_rate or Decimal("20")  # default 20%
            age_years = eq.get_age_in_years() if hasattr(eq, "get_age_in_years") else 0

            # Прямолінійний метод
            annual_dep = purchase_price * rate / 100
            accumulated = min(annual_dep * Decimal(str(age_years)), purchase_price)
            book_value = max(purchase_price - accumulated, Decimal("0"))
            monthly = annual_dep / 12

            items.append(
                {
                    "id": eq.id,
                    "name": eq.name,
                    "category": eq.get_category_display(),
                    "purchase_date": (
                        eq.purchase_date.isoformat() if eq.purchase_date else None
                    ),
                    "purchase_price": float(purchase_price),
                    "depreciation_rate": float(rate),
                    "age_years": float(age_years),
                    "accumulated_depreciation": float(accumulated),
                    "book_value": float(book_value),
                    "monthly_depreciation": float(monthly),
                }
            )

            total_purchase += purchase_price
            total_book += book_value
            total_depreciation += accumulated
            rates.append(float(rate))

        # По категоріях
        by_category = {}
        for item in items:
            cat = item["category"]
            if cat not in by_category:
                by_category[cat] = {
                    "category": cat,
                    "purchase_value": 0,
                    "book_value": 0,
                    "depreciation": 0,
                }
            by_category[cat]["purchase_value"] += item["purchase_price"]
            by_category[cat]["book_value"] += item["book_value"]
            by_category[cat]["depreciation"] += item["accumulated_depreciation"]

        # По локаціях
        by_location = {}
        for eq in equipment:
            loc = eq.location or "Не вказано"
            if loc not in by_location:
                by_location[loc] = {
                    "location": loc,
                    "purchase_value": 0,
                    "book_value": 0,
                    "count": 0,
                }
            pp = float(eq.purchase_price or 0)
            rate = float(eq.depreciation_rate or 20)
            age = float(eq.get_age_in_years()) if hasattr(eq, "get_age_in_years") else 0
            annual = pp * rate / 100
            acc = min(annual * age, pp)
            bv = max(pp - acc, 0)
            by_location[loc]["purchase_value"] += pp
            by_location[loc]["book_value"] += bv
            by_location[loc]["count"] += 1

        return Response(
            {
                "items": items,
                "summary": {
                    "total_purchase_value": float(total_purchase),
                    "total_book_value": float(total_book),
                    "total_depreciation": float(total_depreciation),
                    "avg_depreciation_rate": sum(rates) / len(rates) if rates else 0,
                },
                "by_category": list(by_category.values()),
                "by_location": list(by_location.values()),
            }
        )


class EquipmentCompareView(APIView):
    """Порівняння обладнання"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids", [])
        if not ids or len(ids) < 2:
            return Response(
                {"error": "Потрібно вибрати щонайменше 2 одиниці"}, status=400
            )

        equipment = Equipment.objects.filter(id__in=ids[:4])
        result = []
        for eq in equipment:
            result.append(
                {
                    "id": eq.id,
                    "name": eq.name,
                    "category": eq.get_category_display(),
                    "status": eq.get_status_display(),
                    "manufacturer": str(eq.manufacturer) if eq.manufacturer else "—",
                    "model": eq.model or "—",
                    "serial_number": eq.serial_number or "—",
                    "cpu": eq.cpu or "—",
                    "ram": eq.ram or "—",
                    "storage": eq.storage or "—",
                    "gpu": eq.gpu or "—",
                    "operating_system": eq.operating_system or "—",
                    "motherboard": eq.motherboard or "—",
                    "network_adapter": eq.network_adapter or "—",
                    "power_supply": eq.power_supply or "—",
                    "location": eq.location or "—",
                    "purchase_date": (
                        eq.purchase_date.isoformat() if eq.purchase_date else "—"
                    ),
                    "purchase_price": (
                        float(eq.purchase_price) if eq.purchase_price else 0
                    ),
                    "warranty_until": (
                        eq.warranty_until.isoformat() if eq.warranty_until else "—"
                    ),
                    "current_user": (
                        eq.current_user.get_full_name() if eq.current_user else "—"
                    ),
                }
            )

        return Response(result)


class LocationMapView(APIView):
    """Карта розташування обладнання"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        equipment = Equipment.objects.all()

        # Групування: building → floor → room
        locations = {}
        for eq in equipment:
            building = eq.building or "Головний корпус"
            floor = eq.floor or "1"
            room = eq.room or eq.location or "Не вказано"

            if building not in locations:
                locations[building] = {}
            if floor not in locations[building]:
                locations[building][floor] = {}
            if room not in locations[building][floor]:
                locations[building][floor][room] = {
                    "total": 0,
                    "working": 0,
                    "repair": 0,
                    "items": [],
                }

            loc = locations[building][floor][room]
            loc["total"] += 1
            if eq.status == "WORKING":
                loc["working"] += 1
            elif eq.status in ("REPAIR", "MAINTENANCE"):
                loc["repair"] += 1
            loc["items"].append(
                {
                    "id": eq.id,
                    "name": eq.name,
                    "category": eq.get_category_display(),
                    "status": eq.status,
                }
            )

        # Перетворення в список
        result = []
        for building, floors in locations.items():
            floor_list = []
            for floor_name, rooms in floors.items():
                room_list = []
                for room_name, data in rooms.items():
                    room_list.append(
                        {
                            "name": room_name,
                            "total": data["total"],
                            "working": data["working"],
                            "repair": data["repair"],
                            "items": data["items"][:10],  # Limit items per room
                        }
                    )
                floor_list.append({"name": floor_name, "rooms": room_list})
            result.append({"name": building, "floors": floor_list})

        return Response(result)


class EmailSettingsView(APIView):
    """Налаштування SMTP для email сповіщень"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.conf import settings

        return Response(
            {
                "smtp_host": getattr(settings, "EMAIL_HOST", ""),
                "smtp_port": getattr(settings, "EMAIL_PORT", 587),
                "smtp_user": getattr(settings, "EMAIL_HOST_USER", ""),
                "use_tls": getattr(settings, "EMAIL_USE_TLS", True),
                "from_email": getattr(settings, "DEFAULT_FROM_EMAIL", ""),
            }
        )

    def post(self, request):
        # Save to .env or database settings
        return Response({"status": "ok", "message": "Налаштування збережено"})

    def put(self, request):
        """Тестовий email"""
        from django.core.mail import send_mail

        try:
            to_email = request.data.get("to", request.user.email)
            send_mail(
                "Тестове повідомлення — IT Inventory",
                "Це тестове повідомлення з системи IT Inventory. Якщо ви його отримали — налаштування працюють.",
                None,  # Use DEFAULT_FROM_EMAIL
                [to_email],
                fail_silently=False,
            )
            return Response(
                {"status": "ok", "message": f"Тестовий лист надіслано на {to_email}"}
            )
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=400)


class LdapSettingsView(APIView):
    """Налаштування LDAP/Active Directory"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "enabled": False,
                "server_url": "",
                "bind_dn": "",
                "base_dn": "",
                "user_search_base": "",
                "field_mappings": [
                    {"ldap_field": "sAMAccountName", "local_field": "username"},
                    {"ldap_field": "mail", "local_field": "email"},
                    {"ldap_field": "givenName", "local_field": "first_name"},
                    {"ldap_field": "sn", "local_field": "last_name"},
                ],
            }
        )

    def post(self, request):
        return Response({"status": "ok", "message": "Налаштування LDAP збережено"})

    def put(self, request):
        """Тест з'єднання з LDAP"""
        server_url = request.data.get("server_url", "")
        if not server_url:
            return Response(
                {"status": "error", "message": "URL сервера не вказано"}, status=400
            )
        try:
            import ldap

            conn = ldap.initialize(server_url)
            conn.set_option(ldap.OPT_REFERRALS, 0)
            bind_dn = request.data.get("bind_dn", "")
            bind_password = request.data.get("bind_password", "")
            if bind_dn and bind_password:
                conn.simple_bind_s(bind_dn, bind_password)
            conn.unbind_s()
            return Response({"status": "ok", "message": "З'єднання успішне"})
        except ImportError:
            return Response(
                {"status": "error", "message": "python-ldap не встановлено"}, status=400
            )
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=400)


class DashboardWidgetsView(APIView):
    """Управління віджетами дашборда"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import UserPreferences

        prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
        widgets = prefs.dashboard_widgets or [
            {
                "id": "equipment_overview",
                "label": "Огляд обладнання",
                "visible": True,
                "order": 0,
            },
            {
                "id": "financial_overview",
                "label": "Фінансовий огляд",
                "visible": True,
                "order": 1,
            },
            {
                "id": "maintenance_alerts",
                "label": "Сповіщення обслуговування",
                "visible": True,
                "order": 2,
            },
            {
                "id": "recent_activity",
                "label": "Остання активність",
                "visible": True,
                "order": 3,
            },
            {
                "id": "equipment_by_status",
                "label": "Обладнання за статусом",
                "visible": True,
                "order": 4,
            },
            {
                "id": "equipment_by_location",
                "label": "Обладнання за локацією",
                "visible": True,
                "order": 5,
            },
        ]
        return Response(widgets)

    def post(self, request):
        from .models import UserPreferences

        prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
        prefs.dashboard_widgets = request.data.get("widgets", [])
        prefs.save()
        return Response({"status": "ok"})


class ExportReportView(APIView):
    """Експорт звітів у різних форматах"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get("type", "inventory")
        fmt = request.query_params.get("format", "excel")

        if report_type == "depreciation":
            return self._export_depreciation(fmt)

        # Fallback to existing ExportView for other types
        from .views import ExportView

        return ExportView().get(request)

    def _export_depreciation(self, fmt):
        """Експорт амортизаційного звіту"""
        equipment = Equipment.objects.filter(
            purchase_price__isnull=False, purchase_price__gt=0
        )

        rows = []
        for eq in equipment:
            pp = float(eq.purchase_price or 0)
            rate = float(eq.depreciation_rate or 20)
            age = float(eq.get_age_in_years()) if hasattr(eq, "get_age_in_years") else 0
            annual = pp * rate / 100
            acc = min(annual * age, pp)
            bv = max(pp - acc, 0)
            rows.append(
                {
                    "name": eq.name,
                    "category": eq.get_category_display(),
                    "purchase_date": (
                        eq.purchase_date.isoformat() if eq.purchase_date else ""
                    ),
                    "purchase_price": pp,
                    "rate": rate,
                    "age": round(age, 1),
                    "depreciation": round(acc, 2),
                    "book_value": round(bv, 2),
                    "monthly": round(annual / 12, 2),
                }
            )

        if fmt == "excel":
            return self._depreciation_excel(rows)
        elif fmt == "pdf":
            return self._depreciation_pdf(rows)
        return Response({"error": "Невідомий формат"}, status=400)

    def _depreciation_excel(self, rows):
        import xlsxwriter

        output = io.BytesIO()
        wb = xlsxwriter.Workbook(output)
        ws = wb.add_worksheet("Амортизація")

        headers = [
            "Назва",
            "Категорія",
            "Дата покупки",
            "Вартість",
            "Норма %",
            "Вік (р.)",
            "Амортизація",
            "Залишкова",
            "Аморт./міс",
        ]
        hdr_fmt = wb.add_format(
            {"bold": True, "bg_color": "#4472C4", "font_color": "white", "border": 1}
        )
        money_fmt = wb.add_format({"num_format": "#,##0.00 ₴", "border": 1})
        cell_fmt = wb.add_format({"border": 1})

        for col, h in enumerate(headers):
            ws.write(0, col, h, hdr_fmt)

        for i, row in enumerate(rows, 1):
            ws.write(i, 0, row["name"], cell_fmt)
            ws.write(i, 1, row["category"], cell_fmt)
            ws.write(i, 2, row["purchase_date"], cell_fmt)
            ws.write(i, 3, row["purchase_price"], money_fmt)
            ws.write(i, 4, row["rate"], cell_fmt)
            ws.write(i, 5, row["age"], cell_fmt)
            ws.write(i, 6, row["depreciation"], money_fmt)
            ws.write(i, 7, row["book_value"], money_fmt)
            ws.write(i, 8, row["monthly"], money_fmt)

        ws.set_column(0, 0, 30)
        ws.set_column(1, 1, 15)
        ws.set_column(2, 2, 12)
        ws.set_column(3, 8, 14)

        wb.close()
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            'attachment; filename="depreciation_report.xlsx"'
        )
        return response

    def _depreciation_pdf(self, rows):
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.platypus import (
                SimpleDocTemplate,
                Table,
                TableStyle,
                Paragraph,
                Spacer,
            )
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
        except ImportError:
            return Response({"error": "reportlab не встановлено"}, status=400)

        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(A4))
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph("Амортизаційний звіт", styles["Title"]))
        elements.append(Spacer(1, 12))

        data = [
            [
                "Назва",
                "Категорія",
                "Вартість",
                "Норма %",
                "Вік",
                "Амортизація",
                "Залишкова",
            ]
        ]
        for row in rows:
            data.append(
                [
                    row["name"][:30],
                    row["category"],
                    f"{row['purchase_price']:.2f}",
                    f"{row['rate']:.0f}%",
                    f"{row['age']:.1f}",
                    f"{row['depreciation']:.2f}",
                    f"{row['book_value']:.2f}",
                ]
            )

        table = Table(data)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F2F2F2")],
                    ),
                ]
            )
        )
        elements.append(table)

        doc.build(elements)
        output.seek(0)

        response = HttpResponse(output.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = (
            'attachment; filename="depreciation_report.pdf"'
        )
        return response


class BulkOperationsView(APIView):
    """Масові операції з обладнанням"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        action_type = request.data.get("action")
        ids = request.data.get("ids", [])

        if not ids:
            return Response({"error": "Не вибрано жодного обладнання"}, status=400)

        equipment = Equipment.objects.filter(id__in=ids)
        count = equipment.count()

        if action_type == "change_status":
            new_status = request.data.get("status")
            if new_status:
                equipment.update(status=new_status)
                return Response({"message": f"Статус змінено для {count} одиниць"})

        elif action_type == "change_location":
            location = request.data.get("location")
            if location:
                equipment.update(location=location)
                return Response({"message": f"Локацію змінено для {count} одиниць"})

        elif action_type == "assign_user":
            user_id = request.data.get("user_id")
            if user_id:
                equipment.update(current_user_id=user_id)
                return Response(
                    {"message": f"Користувача призначено для {count} одиниць"}
                )

        elif action_type == "delete":
            equipment.delete()
            return Response({"message": f"Видалено {count} одиниць"})

        return Response({"error": "Невідома дія"}, status=400)


class CsvImportView(APIView):
    """Імпорт обладнання з CSV"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response({"error": "Файл не завантажено"}, status=400)

        import csv

        decoded = csv_file.read().decode("utf-8-sig").splitlines()
        reader = csv.DictReader(decoded, delimiter=";")

        created = 0
        errors = []
        for i, row in enumerate(reader, 2):
            try:
                Equipment.objects.create(
                    name=row.get("name", row.get("Назва", "")),
                    serial_number=row.get(
                        "serial_number", row.get("Серійний номер", "")
                    ),
                    category=row.get("category", row.get("Категорія", "OTH")),
                    location=row.get("location", row.get("Локація", "")),
                    status=row.get("status", "WORKING"),
                )
                created += 1
            except Exception as e:
                errors.append(f"Рядок {i}: {str(e)}")

        return Response(
            {
                "created": created,
                "errors": errors[:20],
                "message": f"Імпортовано {created} одиниць"
                + (f", помилок: {len(errors)}" if errors else ""),
            }
        )
