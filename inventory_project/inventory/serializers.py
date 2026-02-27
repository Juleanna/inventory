from rest_framework import serializers
from .models import Equipment, Notification, License, Software, PeripheralDevice


class EquipmentSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'name', 'category', 'category_display', 'model', 'manufacturer',
            'serial_number', 'inventory_number', 'asset_tag',
            'mac_address', 'ip_address', 'hostname',
            'purchase_date', 'warranty_until', 'last_maintenance_date',
            'next_maintenance_date', 'expiry_date',
            'location', 'building', 'floor', 'room',
            'status', 'status_display', 'priority',
            'current_user', 'responsible_person',
            'purchase_price', 'depreciation_rate',
            'cpu', 'ram', 'storage', 'gpu', 'operating_system',
            'barcode_image', 'qrcode_image', 'photo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['barcode_image', 'qrcode_image', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'equipment', 'title', 'message',
            'notification_type', 'priority', 'read', 'read_at',
            'created_at', 'expires_at',
        ]
        read_only_fields = ['created_at']


class LicenseSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True, default='')
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = License
        fields = [
            'id', 'license_type', 'key', 'description',
            'activations', 'start_date', 'end_date',
            'device', 'device_name', 'user', 'user_name',
        ]

    def get_user_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full.strip() else obj.user.username
        return ''


class SoftwareSerializer(serializers.ModelSerializer):
    license = LicenseSerializer(read_only=True)
    installed_on = EquipmentSerializer(many=True, read_only=True)

    class Meta:
        model = Software
        fields = ['id', 'name', 'version', 'vendor', 'license', 'installed_on']


class PeripheralDeviceSerializer(serializers.ModelSerializer):
    connected_to = EquipmentSerializer(read_only=True)

    class Meta:
        model = PeripheralDevice
        fields = ['id', 'name', 'type', 'serial_number', 'connected_to']
