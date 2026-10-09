from django.urls import include, path
from rest_framework.routers import DefaultRouter

from courses.views import CompleteLessonView, CourseViewSet, MyEnrollmentsView


router = DefaultRouter()
router.register("", CourseViewSet, basename="course")

urlpatterns = [
    path("", include(router.urls)),
    path("enrollments/mine/", MyEnrollmentsView.as_view(), name="my-enrollments"),
    path(
        "<int:course_id>/lessons/<int:lesson_id>/complete/",
        CompleteLessonView.as_view(),
        name="complete-lesson",
    ),
]
