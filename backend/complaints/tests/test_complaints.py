import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from complaints.models import Complaint
from core.models import Notification


User = get_user_model()


@pytest.fixture
def users(db):
    admin = User.objects.create_user(
        email="complaint.admin@example.com",
        password="Strong-pass-123!",
        full_name="Complaint Admin",
        role=User.Role.ADMIN,
    )
    teacher = User.objects.create_user(
        email="complaint.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Complaint Teacher",
        role=User.Role.TEACHER,
    )
    student = User.objects.create_user(
        email="complaint.student@example.com",
        password="Strong-pass-123!",
        full_name="Complaint Student",
        role=User.Role.STUDENT,
    )
    return admin, teacher, student


@pytest.mark.django_db
def test_user_can_create_complaint_with_valid_attachment_and_server_owner(users):
    _, teacher, _ = users
    client = APIClient()
    client.force_authenticate(teacher)
    attachment = SimpleUploadedFile(
        "evidence.pdf",
        b"%PDF-1.7 test file",
        content_type="application/pdf",
    )

    response = client.post(
        "/api/complaints/",
        {
            "subject": "Video will not play",
            "category": "Technical",
            "message": "The lesson video fails to start.",
            "attachment": attachment,
            "authorId": 9999,
            "authorRole": "ADMIN",
        },
        format="multipart",
    )

    assert response.status_code == 201
    complaint = Complaint.objects.get()
    assert complaint.author == teacher
    assert response.data["authorName"] == "Complaint Teacher"
    assert response.data["authorRole"] == "ENSEIGNANT"
    assert response.data["status"] == "Open"
    assert response.data["attachment"].endswith(".pdf")
    assert Notification.objects.filter(
        user=teacher,
        title="Bienvenue sur EduLearn",
    ).exists()


@pytest.mark.django_db
def test_complaint_rejects_unsupported_or_invalid_files(users):
    _, _, student = users
    client = APIClient()
    client.force_authenticate(student)
    invalid_file = SimpleUploadedFile(
        "script.exe",
        b"MZ executable",
        content_type="application/octet-stream",
    )

    response = client.post(
        "/api/complaints/",
        {
            "subject": "Attachment check",
            "category": "Technical",
            "message": "This attachment must be rejected.",
            "attachment": invalid_file,
        },
        format="multipart",
    )

    assert response.status_code == 400
    assert "attachment" in response.data["errors"]
    assert Complaint.objects.count() == 0


@pytest.mark.django_db
def test_complaints_are_scoped_to_author_and_admin_can_filter_and_reply(users):
    admin, teacher, student = users
    own = Complaint.objects.create(
        author=teacher,
        subject="Own complaint",
        category="Technical",
        message="A teacher issue.",
    )
    other = Complaint.objects.create(
        author=student,
        subject="Student complaint",
        category="Teaching",
        message="A student issue.",
    )
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    admin_client = APIClient()
    admin_client.force_authenticate(admin)

    own_list = teacher_client.get("/api/complaints/")
    admin_filter = admin_client.get("/api/complaints/?status=In%20progress")
    update = admin_client.patch(
        f"/api/complaints/{own.id}/",
        {
            "status": "In progress",
            "adminReply": "We are reviewing the report.",
        },
        format="json",
    )
    teacher_after = teacher_client.get("/api/complaints/")

    assert own_list.status_code == 200
    assert [item["id"] for item in own_list.data["results"]] == [own.id]
    assert admin_filter.status_code == 200
    assert admin_filter.data["count"] == 0
    assert update.status_code == 200
    assert update.data["status"] == "In progress"
    assert update.data["adminReply"] == "We are reviewing the report."
    assert teacher_after.data["results"][0]["adminReply"] == "We are reviewing the report."
    assert Notification.objects.filter(
        user=teacher,
        title="Mise à jour de votre réclamation",
    ).count() == 1
    assert other.author == student


@pytest.mark.django_db
def test_only_admin_can_change_complaint_status_and_admin_cannot_create(users):
    admin, teacher, _ = users
    complaint = Complaint.objects.create(
        author=teacher,
        subject="Subject",
        category="Technical",
        message="Complaint message.",
    )
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    admin_client = APIClient()
    admin_client.force_authenticate(admin)

    forbidden = teacher_client.patch(
        f"/api/complaints/{complaint.id}/",
        {"status": "Resolved"},
        format="json",
    )
    cannot_create = admin_client.post(
        "/api/complaints/",
        {
            "subject": "Not allowed",
            "category": "Other",
            "message": "Admins do not submit complaints.",
        },
        format="json",
    )

    assert forbidden.status_code == 403
    assert cannot_create.status_code == 403
