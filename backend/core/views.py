from rest_framework import generics
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from core.models import Notification
from core.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=NotificationSerializer)
    def patch(self, request, notification_id):
        notification = get_object_or_404(
            Notification.objects.filter(
            user=request.user,
            ),
            pk=notification_id,
        )
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(
            NotificationSerializer(
                notification,
                context={"request": request},
            ).data
        )
