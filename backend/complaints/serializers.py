from rest_framework import serializers

from complaints.models import Complaint


STATUS_TO_FRONTEND = {
    Complaint.Status.OPEN: "Open",
    Complaint.Status.IN_PROGRESS: "In progress",
    Complaint.Status.RESOLVED: "Resolved",
}
STATUS_FROM_FRONTEND = {
    frontend: backend for backend, frontend in STATUS_TO_FRONTEND.items()
}


class ComplaintReadSerializer(serializers.ModelSerializer):
    authorId = serializers.IntegerField(source="author_id", read_only=True)
    authorName = serializers.CharField(source="author.full_name", read_only=True)
    authorRole = serializers.CharField(source="author.role", read_only=True)
    adminReply = serializers.CharField(source="admin_reply", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            "id",
            "authorId",
            "authorName",
            "authorRole",
            "subject",
            "category",
            "message",
            "attachment",
            "status",
            "adminReply",
            "createdAt",
            "updatedAt",
        )

    def get_status(self, obj) -> str:
        return STATUS_TO_FRONTEND[obj.status]
