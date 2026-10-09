from django.urls import path

from chatbot.views import (
    ChatMessagesView,
    ChatSessionDeleteView,
    ChatSessionListCreateView,
)


urlpatterns = [
    path("sessions/", ChatSessionListCreateView.as_view(), name="chat-sessions"),
    path(
        "sessions/<int:session_id>/messages/",
        ChatMessagesView.as_view(),
        name="chat-messages",
    ),
    path(
        "sessions/<int:session_id>/",
        ChatSessionDeleteView.as_view(),
        name="chat-session-delete",
    ),
]
