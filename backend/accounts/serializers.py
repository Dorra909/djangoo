from django.contrib.auth import password_validation
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name")
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="date_joined", read_only=True)
    notificationPreferences = serializers.JSONField(
        source="notification_preferences",
        required=False,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "fullName",
            "role",
            "avatar",
            "bio",
            "isActive",
            "createdAt",
            "notificationPreferences",
        )
        read_only_fields = ("id", "role", "isActive", "createdAt")


class RegistrationSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name")
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ("fullName", "email", "password", "role")

    def validate_role(self, value):
        if value not in (User.Role.TEACHER, User.Role.STUDENT):
            raise serializers.ValidationError(
                "Public registration is limited to teachers and students."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data


class AdminUserCreateSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name")
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ("id", "email", "fullName", "role", "password")
        read_only_fields = ("id",)

    def validate_role(self, value):
        if value not in (User.Role.TEACHER, User.Role.STUDENT):
            raise serializers.ValidationError(
                "Admins cannot create another admin through this endpoint."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name", required=False)
    isActive = serializers.BooleanField(source="is_active", required=False)

    class Meta:
        model = User
        fields = ("email", "fullName", "role", "bio", "isActive")

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "Admin role cannot be assigned through this endpoint."
            )
        return value


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True)
    newPassword = serializers.CharField(write_only=True)

    def validate_newPassword(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["currentPassword"]):
            raise serializers.ValidationError(
                {"currentPassword": "Current password is incorrect."}
            )
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
