from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0014_webhooks_and_automation'),
    ]

    operations = [
        # Equipment indexes
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['status'], name='idx_equipment_status'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['category'], name='idx_equipment_category'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['location'], name='idx_equipment_location'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['building', 'floor', 'room'], name='idx_equipment_building'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['purchase_date'], name='idx_equipment_purchase_date'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['created_at'], name='idx_equipment_created_at'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['status', 'category'], name='idx_equipment_status_cat'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['warranty_until'], name='idx_equipment_warranty'),
        ),
        migrations.AddIndex(
            model_name='equipment',
            index=models.Index(fields=['expiry_date'], name='idx_equipment_expiry'),
        ),
        # Contract indexes
        migrations.AddIndex(
            model_name='contract',
            index=models.Index(fields=['status'], name='idx_contract_status'),
        ),
        migrations.AddIndex(
            model_name='contract',
            index=models.Index(fields=['contract_type'], name='idx_contract_type'),
        ),
        migrations.AddIndex(
            model_name='contract',
            index=models.Index(fields=['start_date', 'end_date'], name='idx_contract_dates'),
        ),
        # AutomationRule indexes
        migrations.AddIndex(
            model_name='automationrule',
            index=models.Index(fields=['active'], name='idx_automation_active'),
        ),
        migrations.AddIndex(
            model_name='automationrule',
            index=models.Index(fields=['trigger_type'], name='idx_automation_trigger'),
        ),
    ]
