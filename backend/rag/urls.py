from django.urls import path

from rag.views import (
    CourseDocumentDeleteView,
    CourseDocumentListCreateView,
    CourseDocumentStatusView,
)


urlpatterns = [
    path(
        "courses/<int:course_id>/documents/",
        CourseDocumentListCreateView.as_view(),
        name="course-documents",
    ),
    path(
        "documents/<int:document_id>/",
        CourseDocumentDeleteView.as_view(),
        name="document-delete",
    ),
    path(
        "documents/<int:document_id>/status/",
        CourseDocumentStatusView.as_view(),
        name="document-status",
    ),
]
