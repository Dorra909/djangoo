from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from quizzes.views import SubmitAttemptView, TeacherAnswerOverrideView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/users/", include("accounts.user_urls")),
    path("api/courses/", include("courses.urls")),
    path("api/quizzes/", include("quizzes.urls")),
    path(
        "api/attempts/<int:attempt_id>/answers/<int:answer_id>/override/",
        TeacherAnswerOverrideView.as_view(),
        name="attempt-answer-override",
    ),
    path(
        "api/attempts/<int:attempt_id>/submit/",
        SubmitAttemptView.as_view(),
        name="submit-attempt",
    ),
    path("api/progress/", include("progress.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/complaints/", include("complaints.urls")),
    path("api/chat/", include("chatbot.urls")),
    path("api/chatbot/", include("chatbot.urls")),
    path("api/", include("rag.urls")),
    path("api/", include("core.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
