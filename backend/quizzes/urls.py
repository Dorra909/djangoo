from django.urls import include, path
from rest_framework.routers import DefaultRouter

from quizzes.views import (
    MyAttemptsView,
    QuizViewSet,
    SubmitAttemptView,
    TeacherAttemptsView,
    QuizGenerationView,
)


router = DefaultRouter()
router.register("", QuizViewSet, basename="quiz")

urlpatterns = [
    path("generate/", QuizGenerationView.as_view(), name="quiz-generate"),
    path("attempts/mine/", MyAttemptsView.as_view(), name="my-attempts"),
    path("attempts/teacher/", TeacherAttemptsView.as_view(), name="teacher-attempts"),
    path(
        "attempts/<int:attempt_id>/submit/",
        SubmitAttemptView.as_view(),
        name="submit-attempt",
    ),
    path("", include(router.urls)),
]
