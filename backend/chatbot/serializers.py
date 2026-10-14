from rest_framework import serializers

from chatbot.models import ChatMessage, ChatSession


class ChatSessionSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    courseId = serializers.IntegerField(source="course_id", read_only=True)

    class Meta:
        model = ChatSession
        fields = ("id", "title", "courseId", "createdAt", "updatedAt")
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="pk", read_only=True)
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    sources = serializers.JSONField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "sources", "timestamp")
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


class ChatbotMessageRequestSerializer(SendMessageSerializer):
    content = serializers.CharField(
        required=False,
        max_length=10_000,
        allow_blank=False,
        trim_whitespace=True,
    )
    message = serializers.CharField(
        required=False,
        max_length=10_000,
        allow_blank=False,
        trim_whitespace=True,
    )
    session_id = serializers.IntegerField(required=False, min_value=1)
    course_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        content = attrs.get("message") or attrs.get("content")
        if not content or not content.strip():
            raise serializers.ValidationError({"message": "Le message ne peut pas être vide."})
        attrs["content"] = content.strip()
        return attrs


class ChatSendResponseSerializer(serializers.Serializer):
    session = ChatSessionSerializer(required=False)
    userMessage = ChatMessageSerializer()
    assistantMessage = ChatMessageSerializer()
    quiz_draft = serializers.JSONField(required=False)
    mock = serializers.BooleanField(required=False)
