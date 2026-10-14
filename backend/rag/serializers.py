from rest_framework import serializers

from rag.models import CourseDocument


class CourseDocumentSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source="course_id", read_only=True)
    pageCount = serializers.IntegerField(source="page_count", read_only=True)
    errorMessage = serializers.CharField(source="error_message", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = CourseDocument
        fields = (
            "id",
            "courseId",
            "title",
            "status",
            "pageCount",
            "errorMessage",
            "createdAt",
        )


class CourseDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, uploaded_file):
        if uploaded_file.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Le PDF ne doit pas dépasser 20 Mo.")
        if not uploaded_file.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Seuls les fichiers PDF sont acceptés.")
        header = uploaded_file.read(5)
        uploaded_file.seek(0)
        if header != b"%PDF-":
            raise serializers.ValidationError("Le fichier fourni n'est pas un PDF valide.")
        return uploaded_file
