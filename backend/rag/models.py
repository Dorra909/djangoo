from django.conf import settings
from django.db import models

from courses.models import Course


class CourseDocument(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_documents",
    )
    file = models.FileField(upload_to="course-documents/%Y/%m/")
    title = models.CharField(max_length=255)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )
    page_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        CourseDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    content = models.TextField()
    page_number = models.PositiveIntegerField()
    chunk_index = models.PositiveIntegerField()
    embedding_id = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ("page_number", "chunk_index")
        constraints = [
            models.UniqueConstraint(
                fields=("document", "page_number", "chunk_index"),
                name="unique_document_page_chunk",
            ),
        ]

    def __str__(self):
        return f"{self.document.title}, page {self.page_number}, chunk {self.chunk_index}"
