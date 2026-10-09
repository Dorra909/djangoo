from datetime import date

from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.models import User
from accounts.permissions import IsAdmin, IsStudent, IsTeacher
from complaints.models import Complaint
from courses.models import Course
from courses.views import optimized_courses
from dashboard.serializers import (
    AdminDashboardSerializer,
    StudentDashboardSerializer,
    TeacherDashboardSerializer,
)
from progress.services import get_student_progress
from quizzes.models import Quiz
from quizzes.views import optimized_attempts, optimized_quizzes


def month_range(today):
    current_index = today.year * 12 + today.month - 1
    return [
        (index // 12, index % 12 + 1)
        for index in range(current_index - 5, current_index + 1)
    ]


def admin_stats():
    today = timezone.localdate()
    start_year, start_month = month_range(today)[0]
    start_date = date(start_year, start_month, 1)
    month_rows = (
        User.objects.filter(date_joined__date__gte=start_date)
        .annotate(month=TruncMonth("date_joined"))
        .values("month")
        .annotate(count=Count("id"))
    )
    counts = {
        (row["month"].year, row["month"].month): row["count"]
        for row in month_rows
    }
    monthly = [
        {
            "month": date(year, month, 1).strftime("%b"),
            "count": counts.get((year, month), 0),
        }
        for year, month in month_range(today)
    ]
    role_names = {
        User.Role.ADMIN: "Admins",
        User.Role.TEACHER: "Enseignants",
        User.Role.STUDENT: "Étudiants",
    }
    by_role = {
        row["role"]: row["count"]
        for row in User.objects.values("role").annotate(count=Count("id"))
    }
    return {
        "totalUsers": User.objects.count(),
        "totalTeachers": by_role.get(User.Role.TEACHER, 0),
        "totalStudents": by_role.get(User.Role.STUDENT, 0),
        "totalCourses": Course.objects.count(),
        "totalQuizzes": Quiz.objects.count(),
        "openComplaints": Complaint.objects.filter(
            status__in=(Complaint.Status.OPEN, Complaint.Status.IN_PROGRESS)
        ).count(),
        "newUsersPerMonth": monthly,
        "usersByRole": [
            {"name": role_names[role], "value": by_role.get(role, 0)}
            for role in (User.Role.ADMIN, User.Role.TEACHER, User.Role.STUDENT)
        ],
    }


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses=AdminDashboardSerializer)
    def get(self, request):
        data = {
            "stats": admin_stats(),
            "recentComplaints": Complaint.objects.select_related("author")[:5],
        }
        return Response(
            AdminDashboardSerializer(data, context={"request": request}).data
        )


class TeacherDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    @extend_schema(responses=TeacherDashboardSerializer)
    def get(self, request):
        data = {
            "courses": optimized_courses().filter(teacher=request.user),
            "quizzes": optimized_quizzes().filter(teacher=request.user),
            "attempts": optimized_attempts().filter(
                quiz__teacher=request.user,
                completed_at__isnull=False,
            ),
        }
        return Response(
            TeacherDashboardSerializer(
                data,
                context={"request": request, "student_safe": False},
            ).data
        )


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses=StudentDashboardSerializer)
    def get(self, request):
        enrollments = (
            optimized_courses().filter(enrollments__student=request.user)
        )
        quiz_queryset = optimized_quizzes().filter(
            course__enrollments__student=request.user,
            course__is_published=True,
        )
        progress = get_student_progress(request.user)
        data = {
            "progress": progress,
            "attempts": optimized_attempts().filter(
                student=request.user,
                completed_at__isnull=False,
            ),
            "courses": enrollments,
            "quizzes": quiz_queryset,
        }
        return Response(
            StudentDashboardSerializer(
                data,
                context={"request": request, "student_safe": True},
            ).data
        )
