# Generated by Django 5.2 on 2025-05-02 08:04

import django.db.models.deletion
import simple_history.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('inventory', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HistoricalLicense',
            fields=[
                ('id', models.BigIntegerField(auto_created=True, blank=True, db_index=True, verbose_name='ID')),
                ('license_type', models.CharField(max_length=100, verbose_name='Тип лицензии')),
                ('key', models.CharField(db_index=True, max_length=200, verbose_name='Ключ')),
                ('description', models.TextField(blank=True, verbose_name='Описание продукта')),
                ('activations', models.IntegerField(default=1, verbose_name='Доступно активаций')),
                ('start_date', models.DateField(verbose_name='Начало действия')),
                ('end_date', models.DateField(verbose_name='Окончание действия')),
                ('history_id', models.AutoField(primary_key=True, serialize=False)),
                ('history_date', models.DateTimeField(db_index=True)),
                ('history_change_reason', models.CharField(max_length=100, null=True)),
                ('history_type', models.CharField(choices=[('+', 'Created'), ('~', 'Changed'), ('-', 'Deleted')], max_length=1)),
                ('device', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='inventory.equipment', verbose_name='Устройство')),
                ('history_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь (по желанию)')),
            ],
            options={
                'verbose_name': 'historical license',
                'verbose_name_plural': 'historical licenses',
                'ordering': ('-history_date', '-history_id'),
                'get_latest_by': ('history_date', 'history_id'),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name='License',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('license_type', models.CharField(max_length=100, verbose_name='Тип лицензии')),
                ('key', models.CharField(max_length=200, unique=True, verbose_name='Ключ')),
                ('description', models.TextField(blank=True, verbose_name='Описание продукта')),
                ('activations', models.IntegerField(default=1, verbose_name='Доступно активаций')),
                ('start_date', models.DateField(verbose_name='Начало действия')),
                ('end_date', models.DateField(verbose_name='Окончание действия')),
                ('device', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='inventory.equipment', verbose_name='Устройство')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Пользователь (по желанию)')),
            ],
        ),
    ]
