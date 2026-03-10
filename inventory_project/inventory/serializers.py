from rest_framework import serializers
from .models import Equipment, Notification, Software, PeripheralDevice
from licenses.models import License


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
    user_name = serializers.SerializerMethodField()
    software_list = serializers.SerializerMethodField()
    software_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = License
        fields = [
            'id', 'license_type', 'open_source_type', 'key', 'description',
            'activations', 'start_date', 'end_date',
            'is_perpetual', 'cost', 'trial_days', 'oem_device',
            'user', 'user_name',
            'software_list', 'software_ids',
        ]

    def get_user_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full.strip() else obj.user.username
        return ''

    def get_software_list(self, obj):
        return list(obj.licensed_software.values('id', 'name', 'version'))

    def create(self, validated_data):
        software_ids = validated_data.pop('software_ids', None)
        license = super().create(validated_data)
        if software_ids is not None:
            Software.objects.filter(id__in=software_ids).update(license=license)
        return license

    def update(self, instance, validated_data):
        software_ids = validated_data.pop('software_ids', None)
        license = super().update(instance, validated_data)
        if software_ids is not None:
            # Зняти ліцензію з попередніх програм
            instance.licensed_software.update(license=None)
            # Призначити нові
            Software.objects.filter(id__in=software_ids).update(license=license)
        return license


class SoftwareSerializer(serializers.ModelSerializer):
    license = LicenseSerializer(read_only=True)
    license_id = serializers.PrimaryKeyRelatedField(
        queryset=License.objects.all(), source='license', write_only=True, required=False, allow_null=True
    )
    installed_on = EquipmentSerializer(many=True, read_only=True)
    installed_on_ids = serializers.PrimaryKeyRelatedField(
        queryset=Equipment.objects.all(), source='installed_on', many=True, write_only=True, required=False
    )

    class Meta:
        model = Software
        fields = ['id', 'name', 'version', 'vendor', 'license', 'license_id', 'installed_on', 'installed_on_ids']


class PeripheralDeviceSerializer(serializers.ModelSerializer):
    connected_to = EquipmentSerializer(read_only=True)
    connected_to_id = serializers.PrimaryKeyRelatedField(
        queryset=Equipment.objects.all(), source='connected_to', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = PeripheralDevice
        fields = [
            'id', 'name', 'type', 'serial_number', 'inventory_number',
            'connected_to', 'connected_to_id',
            'barcode_image', 'qrcode_image',
        ]
