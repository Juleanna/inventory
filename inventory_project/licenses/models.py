from django.db import models
from simple_history.models import HistoricalRecords 
from django.contrib.auth import get_user_model

User = get_user_model()

class License(models.Model):
    license_type = models.CharField(max_length=100, verbose_name="Тип лицензии")
    key = models.CharField(max_length=200, unique=True, verbose_name="Ключ")
    description = models.TextField(blank=True, verbose_name="Описание продукта")
    activations = models.IntegerField(default=1, verbose_name="Доступно активаций")
    start_date = models.DateField(verbose_name="Начало действия")
    end_date = models.DateField(verbose_name="Окончание действия")
    device = models.ForeignKey('inventory.Equipment', on_delete=models.SET_NULL,
                               null=True, blank=True, verbose_name="Устройство")
    user = models.ForeignKey(User, on_delete=models.SET_NULL,
                               null=True, blank=True, verbose_name="Пользователь (по желанию)")
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.license_type} (ключ: {self.key})"
