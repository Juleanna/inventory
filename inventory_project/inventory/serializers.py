from rest_framework import serializers
from .models import Equipment, Notification, License, Software, PeripheralDevice

class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Для отображения имени пользователя

    class Meta:
        model = Notification
        fields = '__all__'


class LicenseSerializer(serializers.ModelSerializer):
    assigned_to = EquipmentSerializer(read_only=True)  # Вложенный объект оборудования

    class Meta:
        model = License
        fields = '__all__'


class SoftwareSerializer(serializers.ModelSerializer):
    license = LicenseSerializer(read_only=True)  # Вложенный объект лицензии
    installed_on = EquipmentSerializer(many=True, read_only=True)  # Вложенные объекты оборудования

    class Meta:
        model = Software
        fields = '__all__'

class PeripheralDeviceSerializer(serializers.ModelSerializer):
    connected_to = EquipmentSerializer(read_only=True)  # Вложенный объект оборудования

    class Meta:
        model = PeripheralDevice
        fields = '__all__'
