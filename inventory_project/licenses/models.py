from simple_history.models import HistoricalRecords

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class License(models.Model):
    LICENSE_TYPE_CHOICES = [
        ("COMMERCIAL", "Комерційна"),
        ("FREEWARE", "Freeware"),
        ("SHAREWARE", "Shareware"),
        ("OPEN_SOURCE", "Open Source"),
        ("TRIAL", "Trial (пробна)"),
        ("OEM", "OEM"),
        ("VOLUME", "Volume License (корпоративна)"),
    ]

    OPEN_SOURCE_LICENSE_CHOICES = [
        ("GPL", "GPL"),
        ("MIT", "MIT"),
        ("APACHE", "Apache 2.0"),
        ("BSD", "BSD"),
        ("LGPL", "LGPL"),
        ("MPL", "MPL"),
        ("AGPL", "AGPL"),
        ("OTHER", "Інша"),
    ]

    license_type = models.CharField(
        max_length=100, choices=LICENSE_TYPE_CHOICES, verbose_name="Тип ліцензії"
    )
    open_source_type = models.CharField(
        max_length=50,
        choices=OPEN_SOURCE_LICENSE_CHOICES,
        blank=True,
        verbose_name="Тип Open Source ліцензії",
    )
    key = models.CharField(max_length=200, blank=True, verbose_name="Ліцензійний ключ")
    description = models.TextField(blank=True, verbose_name="Опис")
    activations = models.IntegerField(default=1, verbose_name="Кількість активацій")
    start_date = models.DateField(null=True, blank=True, verbose_name="Початок дії")
    end_date = models.DateField(null=True, blank=True, verbose_name="Кінець дії")
    is_perpetual = models.BooleanField(default=False, verbose_name="Безстрокова")
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Вартість (грн)",
    )
    trial_days = models.IntegerField(
        null=True, blank=True, verbose_name="Пробний період (днів)"
    )
    oem_device = models.ForeignKey(
        "inventory.Equipment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Прив'язаний пристрій (OEM)",
        related_name="oem_licenses",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Користувач",
    )
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Ліцензія"
        verbose_name_plural = "Ліцензії"

    def __str__(self):
        type_display = dict(self.LICENSE_TYPE_CHOICES).get(
            self.license_type, self.license_type
        )
        if self.key:
            return f"{type_display} ({self.key[:20]})"
        return type_display
