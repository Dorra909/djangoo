import csv
from statistics import mean

from django.db import models, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema

from accounts.models import User
from accounts.permissions import IsOwnerOrAdmin, IsStudent, IsTeacher
from courses.models import Enrollment
from quizzes.models import Quiz, QuizAttempt
from quizzes.serializers import (
    AttemptListSerializer,
    AttemptResultsSerializer,
    AttemptReviewSerializer,
    AttemptStartSerializer,
    AttemptSubmitSerializer,
    TeacherAnswerOverrideSerializer,
    QuizReadSerializer,
    QuizWriteSerializer,
)
from quizzes.generation import (
    QuizGenerationRequestSerializer,
    generate_quiz_draft,
)
from quizzes.models import AttemptAnswer
from quizzes.serializers import AttemptReviewAnswerSerializer
from quizzes.grading import recalculate_attempt


class IsQuizOwnerOrAdmin(IsOwnerOrAdmin):
    owner_field = "teacher"


def optimized_quizzes():
    return (
        Quiz.objects.select_related("course", "teacher")
        .prefetch_related("questions__choices")
        .annotate(attemptCount=models.Count("attempts", distinct=True))
    )


def optimized_attempts():
    return (
        QuizAttempt.objects.select_related("quiz", "student")
        .prefetch_related(
            "quiz__questions__choices",
            "attempt_answers__question__choices",
        )
    )


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.none()
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "course__title"]
    filterset_fields = ["course"]
    ordering_fields = ["created_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        user = self.request.user
        queryset = optimized_quizzes()
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        return queryset.filter(
            course__is_published=True,
            course__enrollments__student=user,
        ).distinct()

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        if self.action == "attempts" and self.request.method == "POST":
            return [IsAuthenticated(), IsStudent()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsQuizOwnerOrAdmin()]
        if self.action in ("results", "attempts", "results_csv"):
            return [IsAuthenticated()]
        if self.action == "start":
            return [IsAuthenticated(), IsStudent()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return QuizWriteSerializer
        return QuizReadSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["student_safe"] = self.request.user.role == User.Role.STUDENT
        return context

    @action(detail=True, methods=["get", "post"], url_path="attempts")
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        if request.method == "POST":
            if request.user.role != User.Role.STUDENT:
                raise PermissionDenied("Only students can start quiz attempts.")
            if not Enrollment.objects.filter(
                student=request.user,
                course=quiz.course,
            ).exists():
                raise PermissionDenied("Enroll in the course before starting its quiz.")
            attempt = QuizAttempt.objects.create(quiz=quiz, student=request.user)
            return Response(
                AttemptStartSerializer(
                    attempt,
                    context={"student_safe": True},
                ).data,
                status=status.HTTP_201_CREATED,
            )
        if request.user.role not in (User.Role.TEACHER, User.Role.ADMIN):
            raise PermissionDenied("Only the quiz teacher or an admin can view results.")
        attempts = optimized_attempts().filter(quiz=quiz, completed_at__isnull=False)
        page = self.paginate_queryset(attempts)
        serializer = AttemptListSerializer(
            page if page is not None else attempts,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="results")
    def results(self, request, pk=None):
        quiz = self.get_object()
        if request.user.role not in (User.Role.TEACHER, User.Role.ADMIN):
            raise PermissionDenied("Only the quiz teacher or an admin can view results.")
        attempts = list(
            optimized_attempts().filter(quiz=quiz, completed_at__isnull=False)
        )
        score_values = [attempt.score for attempt in attempts]
        total = len(attempts)
        distribution = [
            {
                "range": label,
                "count": sum(low <= score <= high for score in score_values),
            }
            for label, low, high in (
                ("0–20%", 0, 20),
                ("21–40%", 21, 40),
                ("41–60%", 41, 60),
                ("61–80%", 61, 80),
                ("81–100%", 81, 100),
            )
        ]
        data = {
            "attemptCount": total,
            "averageScore": round(mean(score_values)) if score_values else 0,
            "passRate": (
                round(sum(attempt.passed for attempt in attempts) * 100 / total)
                if total
                else 0
            ),
            "distribution": distribution,
            "attempts": AttemptListSerializer(
                attempts,
                many=True,
                context=self.get_serializer_context(),
            ).data,
        }
        return Response(data)

    @action(detail=True, methods=["get"], url_path="results-csv")
    def results_csv(self, request, pk=None):
        quiz = self.get_object()
        if request.user.role not in (User.Role.TEACHER, User.Role.ADMIN):
            raise PermissionDenied("Only the quiz teacher or an admin can export results.")
        attempts = optimized_attempts().filter(quiz=quiz, completed_at__isnull=False)
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["Étudiant", "Score", "Réussi", "Date", "Durée (min)"])
        for attempt in attempts:
            writer.writerow(
                [
                    attempt.student.full_name,
                    f"{attempt.score}%",
                    "Oui" if attempt.passed else "Non",
                    timezone.localtime(attempt.completed_at).strftime("%Y-%m-%d %H:%M"),
                    attempt.time_taken,
                ]
            )
        response["Content-Disposition"] = (
            f'attachment; filename="results-{slugify(quiz.title) or quiz.id}.csv"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="attempts/pending")
    def pending_attempts(self, request, pk=None):
        quiz = self.get_object()
        if request.user.role != User.Role.TEACHER:
            raise PermissionDenied("Only the quiz teacher can review pending answers.")
        answers = (
            AttemptAnswer.objects.filter(
                attempt__quiz=quiz,
                attempt__completed_at__isnull=False,
                needs_review=True,
            )
            .select_related("attempt__student", "question")
            .prefetch_related("question__choices")
        )
        return Response(
            [
                {
                    "attemptId": answer.attempt_id,
                    "answerId": answer.id,
                    "studentName": answer.attempt.student.full_name,
                    "answer": AttemptReviewAnswerSerializer(answer).data,
                    "question": {
                        "text": answer.question.text,
                        "points": answer.question.points,
                        "modelAnswer": answer.question.model_answer,
                        "rubric": answer.question.rubric,
                    },
                }
                for answer in answers
            ]
        )


class MyAttemptsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses={200: AttemptListSerializer(many=True)})
    def get(self, request):
        attempts = optimized_attempts().filter(
            student=request.user,
            completed_at__isnull=False,
        )
        quiz_id = request.query_params.get("quiz")
        if quiz_id:
            attempts = attempts.filter(quiz_id=quiz_id)
        return _paginated_attempt_response(self, request, attempts)


class TeacherAttemptsView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    @extend_schema(responses={200: AttemptListSerializer(many=True)})
    def get(self, request):
        attempts = optimized_attempts().filter(
            quiz__teacher=request.user,
            completed_at__isnull=False,
        )
        quiz_id = request.query_params.get("quiz")
        if quiz_id:
            attempts = attempts.filter(quiz_id=quiz_id)
        return _paginated_attempt_response(self, request, attempts)


def _paginated_attempt_response(view, request, queryset):
    from rest_framework.pagination import PageNumberPagination

    paginator = PageNumberPagination()
    paginator.page_size = 10
    page = paginator.paginate_queryset(queryset, request, view=view)
    serializer = AttemptListSerializer(
        page if page is not None else queryset,
        many=True,
        context={"request": request},
    )
    if page is not None:
        return paginator.get_paginated_response(serializer.data)
    return Response(serializer.data)


class SubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        request=AttemptSubmitSerializer,
        responses={200: AttemptReviewSerializer},
    )
    @transaction.atomic
    def post(self, request, attempt_id):
        attempt = get_object_or_404(
            QuizAttempt.objects.select_for_update().select_related("quiz"),
            pk=attempt_id,
            student=request.user,
        )
        if attempt.completed_at is not None:
            return Response(
                {
                    "detail": "This attempt has already been submitted.",
                    "errors": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AttemptSubmitSerializer(
            data=request.data,
            context={"attempt": attempt},
        )
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save(completed_at=timezone.now())
        return Response(
            AttemptReviewSerializer(
                attempt,
                context={"request": request},
            ).data
        )


class QuizGenerationView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai"

    @extend_schema(
        request=QuizGenerationRequestSerializer,
        responses={200: None},
    )
    def post(self, request):
        serializer = QuizGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        draft, is_mock = generate_quiz_draft(request, serializer.validated_data)
        course_id = serializer.validated_data.get("course_id")
        if course_id is None and serializer.validated_data.get("lesson_ids"):
            from courses.models import Lesson

            course_id = Lesson.objects.filter(
                pk=serializer.validated_data["lesson_ids"][0]
            ).values_list("course_id", flat=True).first()
        result = {
            "title": draft["title"],
            "courseId": course_id,
            "creationMode": (
                Quiz.CreationMode.RAG
                if serializer.validated_data.get("document_ids")
                else Quiz.CreationMode.AI
            ),
            "questions": draft["questions"],
            "mock": is_mock,
        }
        return Response({"draft": result})


class TeacherAnswerOverrideView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    @extend_schema(
        request=TeacherAnswerOverrideSerializer,
        responses={200: AttemptReviewAnswerSerializer},
    )
    @transaction.atomic
    def patch(self, request, attempt_id, answer_id):
        answer = get_object_or_404(
            AttemptAnswer.objects.select_for_update().select_related(
                "attempt__quiz",
                "question",
                "selected_choice",
            ),
            pk=answer_id,
            attempt_id=attempt_id,
            attempt__quiz__teacher=request.user,
            attempt__completed_at__isnull=False,
        )
        serializer = TeacherAnswerOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        score = serializer.validated_data["score"]
        if score > answer.question.points:
            return Response(
                {
                    "detail": "La note ne peut pas dépasser les points de la question.",
                    "errors": {"score": ["La note dépasse le maximum autorisé."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        answer.teacher_override_score = score
        answer.needs_review = False
        if "feedback" in serializer.validated_data:
            answer.ai_feedback = serializer.validated_data["feedback"]
        answer.save(
            update_fields=("teacher_override_score", "needs_review", "ai_feedback")
        )
        recalculate_attempt(answer.attempt)
        return Response(AttemptReviewAnswerSerializer(answer).data)
