from django.urls import path

from dashboard.views import (
    AdminDashboardView,
    StudentDashboardView,
    TeacherDashboardView,
)


urlpatterns = [
    path("admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("teacher/", TeacherDashboardView.as_view(), name="teacher-dashboard"),
    path("student/", StudentDashboardView.as_view(), name="student-dashboard"),
]
