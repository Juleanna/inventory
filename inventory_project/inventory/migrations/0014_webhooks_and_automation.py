from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0013_add_contract_and_equipment_template'),
    ]

    operations = [
        # WebhookConfig
        migrations.CreateModel(
            name='WebhookConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Назва')),
                ('url', models.URLField(verbose_name='URL')),
                ('events', models.JSONField(default=list, verbose_name='Події')),
                ('secret', models.CharField(blank=True, default='', max_length=255, verbose_name='Секретний ключ')),
                ('active', models.BooleanField(default=True, verbose_name='Активний')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Створив')),
            ],
            options={
                'verbose_name': 'Webhook',
                'verbose_name_plural': 'Webhooks',
            },
        ),
        # WebhookLog
        migrations.CreateModel(
            name='WebhookLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event', models.CharField(max_length=100)),
                ('payload', models.JSONField(default=dict)),
                ('response_status', models.IntegerField(blank=True, null=True)),
                ('response_body', models.TextField(blank=True, default='')),
                ('success', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('webhook', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='inventory.webhookconfig')),
            ],
            options={
                'verbose_name': 'Лог Webhook',
                'verbose_name_plural': 'Логи Webhooks',
                'ordering': ['-sent_at'],
            },
        ),
        # AutomationRule
        migrations.CreateModel(
            name='AutomationRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Назва')),
                ('description', models.TextField(blank=True, default='', verbose_name='Опис')),
                ('trigger_type', models.CharField(choices=[
                    ('EQUIPMENT_AGE', 'Вік обладнання'),
                    ('WARRANTY_EXPIRY', 'Закінчення гарантії'),
                    ('MAINTENANCE_OVERDUE', 'Прострочене ТО'),
                    ('STATUS_CHANGE', 'Зміна статусу'),
                    ('COST_THRESHOLD', 'Поріг вартості'),
                ], max_length=50, verbose_name='Тип тригера')),
                ('conditions', models.JSONField(default=dict, verbose_name='Умови')),
                ('actions', models.JSONField(default=list, verbose_name='Дії')),
                ('active', models.BooleanField(default=True, verbose_name='Активне')),
                ('last_run', models.DateTimeField(blank=True, null=True, verbose_name='Останній запуск')),
                ('run_count', models.IntegerField(default=0, verbose_name='Кількість запусків')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Створив')),
            ],
            options={
                'verbose_name': 'Правило автоматизації',
                'verbose_name_plural': 'Правила автоматизації',
            },
        ),
    ]
