from django.urls import path

from core.views import NotificationListView, NotificationReadView


urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path(
        "notifications/<int:notification_id>/read/",
        NotificationReadView.as_view(),
        name="notification-read",
    ),
]
