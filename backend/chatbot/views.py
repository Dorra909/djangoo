from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from chatbot.models import ChatMessage, ChatSession
from chatbot.serializers import (
    ChatbotMessageRequestSerializer,
    ChatSendResponseSerializer,
    ChatMessageSerializer,
    ChatSessionSerializer,
    SendMessageSerializer,
)
from chatbot.services import build_response, get_accessible_course
from accounts.permissions import IsTeacherOrStudent


class ChatSessionListCreateView(generics.ListCreateAPIView):
    queryset = ChatSession.objects.none()
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrStudent]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return ChatSession.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        course = None
        course_id = request.data.get("course_id")
        if course_id is not None:
            course = get_accessible_course(request.user, course_id)
            if course is None:
                return Response(
                    {"detail": "Vous n'avez pas accès à ce cours."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        session = ChatSession.objects.create(user=request.user, course=course)
        return Response(
            self.get_serializer(session).data,
            status=status.HTTP_201_CREATED,
        )


class ChatMessagesView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrStudent]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai"

    def get_session(self, request, session_id):
        return get_object_or_404(
            ChatSession.objects.filter(user=request.user),
            pk=session_id,
        )

    @extend_schema(responses={200: ChatMessageSerializer(many=True)})
    def get(self, request, session_id):
        session = self.get_session(request, session_id)
        messages = session.messages.all()
        return Response(
            ChatMessageSerializer(
                messages,
                many=True,
                context={"request": request},
            ).data
        )

    @extend_schema(request=SendMessageSerializer, responses=ChatSendResponseSerializer)
    def post(self, request, session_id):
        session = self.get_session(request, session_id)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        user_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=content,
        )
        recent_messages = list(
            session.messages.order_by("-created_at", "-id")[:20]
        )
        history = [
            {"role": message.role, "content": message.content}
            for message in reversed(recent_messages)
        ]
        course = session.course
        response_content, sources, quiz_draft, mock = build_response(
            request.user,
            course,
            content,
            history,
        )
        assistant_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=response_content,
            sources=sources,
        )
        if session.messages.count() == 2:
            session.title = content[:80]
        session.updated_at = timezone.now()
        session.save(update_fields=("title", "updated_at"))
        response_data = {
                "userMessage": ChatMessageSerializer(
                    user_message,
                    context={"request": request},
                ).data,
                "assistantMessage": ChatMessageSerializer(
                    assistant_message,
                    context={"request": request},
                ).data,
                "mock": mock,
            }
        if quiz_draft is not None:
            response_data["quiz_draft"] = quiz_draft
        return Response(response_data)


class ChatSessionDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrStudent]

    @extend_schema(responses=ChatSessionSerializer)
    def get(self, request, session_id):
        session = get_object_or_404(
            ChatSession.objects.filter(user=request.user),
            pk=session_id,
        )
        return Response(
            {
                **ChatSessionSerializer(session).data,
                "messages": ChatMessageSerializer(
                    session.messages.all(),
                    many=True,
                ).data,
            }
        )

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, session_id):
        session = get_object_or_404(
            ChatSession.objects.filter(user=request.user),
            pk=session_id,
        )
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatbotMessageView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrStudent]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai"

    @extend_schema(request=ChatbotMessageRequestSerializer, responses=ChatSendResponseSerializer)
    def post(self, request):
        serializer = ChatbotMessageRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("session_id"):
            session = get_object_or_404(
                ChatSession.objects.filter(user=request.user),
                pk=data["session_id"],
            )
        else:
            session = ChatSession(user=request.user)

        course_id = data.get("course_id", session.course_id)
        course = None
        if course_id is not None:
            course = get_accessible_course(request.user, course_id)
            if course is None:
                return Response(
                    {"detail": "Vous n'avez pas accès à ce cours."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        session.course = course
        if not session.pk:
            session.save()
        content = data["content"]
        user_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=content,
        )
        recent_messages = list(session.messages.order_by("-created_at", "-id")[:20])
        history = [
            {"role": message.role, "content": message.content}
            for message in reversed(recent_messages)
        ]
        response_content, sources, quiz_draft, mock = build_response(
            request.user,
            course,
            content,
            history,
        )
        assistant_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=response_content,
            sources=sources,
        )
        if session.messages.count() == 2:
            session.title = content[:80]
        session.updated_at = timezone.now()
        session.save(update_fields=("course", "title", "updated_at"))
        response_data = {
            "session": self._serialize_session(session, request),
            "userMessage": ChatMessageSerializer(user_message).data,
            "assistantMessage": ChatMessageSerializer(assistant_message).data,
            "mock": mock,
        }
        if quiz_draft is not None:
            response_data["quiz_draft"] = quiz_draft
        return Response(response_data)

    @staticmethod
    def _serialize_session(session, request):
        return ChatSessionSerializer(session, context={"request": request}).data
