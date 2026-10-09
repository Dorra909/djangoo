from django.db import models, transaction
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.models import User
from accounts.permissions import IsOwnerOrAdmin, IsStudent, IsTeacher
from courses.models import Course, Enrollment, Lesson
from courses.serializers import (
    CourseReadSerializer,
    CourseWriteSerializer,
    EnrollmentSerializer,
    ReorderLessonsSerializer,
)
from progress.models import LessonProgress
from progress.serializers import CourseProgressSerializer
from progress.services import get_course_progress


class IsCourseOwnerOrAdmin(IsOwnerOrAdmin):
    owner_field = "teacher"


def optimized_courses():
    return (
        Course.objects.select_related("teacher")
        .prefetch_related(
            Prefetch("lessons", queryset=Lesson.objects.order_by("order", "id"))
        )
        .annotate(enrolledCount=Count("enrollments", distinct=True))
    )


class CourseViewSet(viewsets.ModelViewSet):
    queryset = optimized_courses()
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "category"]
    filterset_fields = ["level", "category", "is_published"]
    ordering_fields = ["created_at", "title", "rating"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = optimized_courses()
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        return queryset.filter(is_published=True)

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), IsTeacher()]
        if self.action in ("update", "partial_update", "destroy", "reorder_lessons"):
            return [IsAuthenticated(), IsCourseOwnerOrAdmin()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CourseWriteSerializer
        return CourseReadSerializer

    def get_object(self):
        course = super().get_object()
        if self.request.user.role == User.Role.TEACHER and course.teacher_id != self.request.user.id:
            raise PermissionDenied("You may only access your own courses.")
        return course

    @transaction.atomic
    @action(
        detail=True,
        methods=["patch"],
        url_path="lessons/reorder",
    )
    def reorder_lessons(self, request, pk=None):
        course = self.get_object()
        if request.user.role == User.Role.TEACHER and course.teacher_id != request.user.id:
            raise PermissionDenied("You may only reorder lessons in your own courses.")
        serializer = ReorderLessonsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lesson_ids = serializer.validated_data["lessonIds"]
        lessons = list(course.lessons.filter(id__in=lesson_ids))
        if len(lessons) != len(lesson_ids):
            return Response(
                {
                    "detail": "The submitted lessons do not match this course.",
                    "errors": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.lessons.filter(id__in=lesson_ids).update(
            order=models.F("order") + 1_000_000
        )
        for order, lesson_id in enumerate(lesson_ids, start=1):
            Lesson.objects.filter(pk=lesson_id).update(order=order)
        return Response(
            CourseReadSerializer(
                optimized_courses().get(pk=course.pk),
                context={"request": request},
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="enroll",
        permission_classes=[IsAuthenticated, IsStudent],
    )
    def enroll(self, request, pk=None):
        course = self.get_object()
        if not course.is_published:
            raise PermissionDenied("Only published courses can be joined.")
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
        )
        return Response(
            {
                "courseId": enrollment.course_id,
                "enrolled": True,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyEnrollmentsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses={200: EnrollmentSerializer(many=True)})
    def get(self, request):
        enrollments = (
            Enrollment.objects.filter(student=request.user)
            .select_related("student")
            .prefetch_related(
                Prefetch("course", queryset=optimized_courses())
            )
        )
        page = self.paginate_queryset(enrollments)
        serializer = EnrollmentSerializer(
            page if page is not None else enrollments,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def paginate_queryset(self, queryset):
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 10
        self._paginator = paginator
        return paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        return self._paginator.get_paginated_response(data)


class CompleteLessonView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        request=None,
        responses={200: CourseProgressSerializer},
    )
    def post(self, request, course_id, lesson_id):
        course = get_object_or_404(Course, pk=course_id, is_published=True)
        if not Enrollment.objects.filter(student=request.user, course=course).exists():
            raise PermissionDenied("Enroll in this course before completing lessons.")
        lesson = get_object_or_404(Lesson, pk=lesson_id, course=course)
        progress, created = LessonProgress.objects.get_or_create(
            student=request.user,
            course=course,
            lesson=lesson,
        )
        if not created:
            progress.last_accessed = timezone.now()
            progress.save(update_fields=["last_accessed"])
        return Response(get_course_progress(request.user, course))
