from rest_framework import serializers

from chatbot.models import ChatMessage, ChatSession


class ChatSessionSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ChatSession
        fields = ("id", "title", "createdAt", "updatedAt")
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="pk", read_only=True)
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "timestamp")
        read_only_fields = fields


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(
        max_length=10_000,
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return value.strip()


class ChatSendResponseSerializer(serializers.Serializer):
    userMessage = ChatMessageSerializer()
    assistantMessage = ChatMessageSerializer()
