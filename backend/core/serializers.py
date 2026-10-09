from rest_framework import serializers

from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "title", "message", "read", "createdAt")
        read_only_fields = fields
