from rest_framework import status, viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdmin
from complaints.models import Complaint
from complaints.serializers import (
    ComplaintAdminUpdateSerializer,
    ComplaintCreateSerializer,
    ComplaintReadSerializer,
    STATUS_FROM_FRONTEND,
)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.none()
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "head", "options"]
    search_fields = ["subject", "message", "category"]
    filterset_fields = ["category"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        queryset = Complaint.objects.select_related("author")
        if self.request.user.role == User.Role.ADMIN:
            status_filter = self.request.query_params.get("status")
            if status_filter:
                mapped_status = STATUS_FROM_FRONTEND.get(
                    status_filter,
                    status_filter,
                )
                queryset = queryset.filter(status=mapped_status)
            return queryset
        return queryset.filter(author=self.request.user)

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTeacherOrStudent()]
        if self.action in ("partial_update", "update"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return ComplaintCreateSerializer
        if self.action in ("partial_update", "update"):
            return ComplaintAdminUpdateSerializer
        return ComplaintReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save(author=request.user)
        return Response(
            ComplaintReadSerializer(
                complaint,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        complaint = self.get_object()
        serializer = self.get_serializer(
            complaint,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        return Response(
            ComplaintReadSerializer(
                complaint,
                context={"request": request},
            ).data
        )


class IsTeacherOrStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.TEACHER, User.Role.STUDENT)
        )
