from django_filters.rest_framework import FilterSet, CharFilter, ChoiceFilter, DateFilter
from .models import Equipment

class EquipmentFilter(FilterSet):
    category = ChoiceFilter(choices=Equipment.CATEGORY_CHOICES, label="Категория")
    location = CharFilter(lookup_expr='icontains', label="Местоположение")
    status = ChoiceFilter(choices=Equipment.STATUS_CHOICES, label="Стан")
    purchase_date_after = DateFilter(field_name='purchase_date', lookup_expr='gte', label="Дата покупки (с)")
    purchase_date_before = DateFilter(field_name='purchase_date', lookup_expr='lte', label="Дата покупки (по)")

    class Meta:
        model = Equipment
        fields = ['category', 'location', 'status']
