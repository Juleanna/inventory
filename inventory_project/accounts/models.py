from django.db import models
from django.contrib.auth.models import AbstractUser
from simple_history.models import HistoricalRecords

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, verbose_name="Телефон")
    position = models.CharField(max_length=100, blank=True, verbose_name="Должность")
    department = models.CharField(max_length=100, blank=True, verbose_name="Отдел")
    # Связь с устройствами осуществляется через поле Equipment.current_user
    # Для облегчения отображения можно определить связь:
    devices = models.ManyToManyField('inventory.Equipment', blank=True, related_name="assigned_users",
                                     verbose_name="Список устройств")
    history = HistoricalRecords()

    def __str__(self):
        return self.get_full_name() or self.username

