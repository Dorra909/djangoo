from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from core.models import Notification
from courses.models import Course
from rag.models import CourseDocument, DocumentChunk
from rag.services import index_document, retrieve, split_page_text


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="rag.teacher@example.com",
        password="test-password-123",
        full_name="RAG Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(
        email="rag.other@example.com",
        password="test-password-123",
        full_name="Other Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="rag.student@example.com",
        password="test-password-123",
        full_name="RAG Student",
        role=User.Role.STUDENT,
    )


@pytest.fixture
def course(teacher):
    return Course.objects.create(
        teacher=teacher,
        title="Cours RAG",
        description="Cours pour les tests RAG.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )


def make_pdf_upload(name="cours.pdf", content=b"%PDF-1.7 example"):
    return SimpleUploadedFile(name, content, content_type="application/pdf")


def test_split_page_text_respects_size_and_overlaps():
    text = f"{'Première notion. ' * 55}\n\n{'Deuxième notion. ' * 50}"

    chunks = split_page_text(text)

    assert len(chunks) > 1
    assert all(len(chunk) <= 800 for chunk in chunks)
    assert all(chunk.strip() for chunk in chunks)
    assert chunks[0][-100:] in chunks[1]


@pytest.mark.django_db
def test_teacher_can_upload_list_poll_and_delete_own_course_document(
    course,
    teacher,
    monkeypatch,
):
    monkeypatch.setattr("rag.views.schedule_indexing", lambda document_id: None)
    client = APIClient()
    client.force_authenticate(teacher)

    uploaded = client.post(
        f"/api/courses/{course.id}/documents/",
        {"file": make_pdf_upload()},
        format="multipart",
    )

    assert uploaded.status_code == 202
    document_id = uploaded.data["id"]
    assert uploaded.data["status"] == CourseDocument.Status.PENDING
    assert client.get(f"/api/courses/{course.id}/documents/").data[0]["id"] == document_id
    assert client.get(f"/api/documents/{document_id}/status/").data["status"] == "PENDING"
    assert client.delete(f"/api/documents/{document_id}/").status_code == 204
    assert not CourseDocument.objects.filter(pk=document_id).exists()


@pytest.mark.django_db
def test_upload_requires_pdf_extension_and_pdf_signature(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)

    wrong_extension = client.post(
        f"/api/courses/{course.id}/documents/",
        {"file": make_pdf_upload("notes.txt")},
        format="multipart",
    )
    invalid_pdf = client.post(
        f"/api/courses/{course.id}/documents/",
        {"file": make_pdf_upload(content=b"not a PDF")},
        format="multipart",
    )

    assert wrong_extension.status_code == 400
    assert invalid_pdf.status_code == 400
    assert CourseDocument.objects.count() == 0


@pytest.mark.django_db
def test_teacher_cannot_access_documents_for_another_teachers_course(
    course,
    other_teacher,
):
    client = APIClient()
    client.force_authenticate(other_teacher)

    upload = client.post(
        f"/api/courses/{course.id}/documents/",
        {"file": make_pdf_upload()},
        format="multipart",
    )
    listing = client.get(f"/api/courses/{course.id}/documents/")

    assert upload.status_code == 404
    assert listing.status_code == 404
    assert CourseDocument.objects.count() == 0


@pytest.mark.django_db
def test_students_cannot_access_document_management(course, student):
    client = APIClient()
    client.force_authenticate(student)

    response = client.get(f"/api/courses/{course.id}/documents/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_indexing_saves_page_chunks_vectors_and_notifies_teacher(
    course,
    teacher,
    tmp_path,
    settings,
    monkeypatch,
):
    settings.RAG_VECTORSTORE_PATH = tmp_path
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file=make_pdf_upload(),
        title="lesson.pdf",
    )
    indexed_vectors = {}

    class FakeCollection:
        def add(self, **kwargs):
            indexed_vectors.update(kwargs)

    monkeypatch.setattr(
        "rag.services._extract_pdf_pages",
        lambda _: [(1, "Paragraph one.\n\nParagraph two.")],
    )
    monkeypatch.setattr(
        "rag.services._embed",
        lambda texts: [[0.1, 0.2] for _ in texts],
    )
    monkeypatch.setattr("rag.services._collection", lambda _: FakeCollection())

    index_document(document.id)

    document.refresh_from_db()
    assert document.status == CourseDocument.Status.READY
    assert document.page_count == 1
    assert DocumentChunk.objects.filter(document=document).count() == 1
    assert indexed_vectors["documents"] == ["Paragraph one.\n\nParagraph two."]
    assert indexed_vectors["metadatas"][0]["page_number"] == 1
    assert Notification.objects.filter(
        user=teacher,
        title="Document de cours prêt",
    ).exists()


@pytest.mark.django_db
def test_scanned_pdf_is_marked_failed_with_clear_message(course, teacher, monkeypatch):
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file=make_pdf_upload(),
        title="scan.pdf",
    )
    monkeypatch.setattr("rag.services._extract_pdf_pages", lambda _: [(1, " ")])

    index_document(document.id)

    document.refresh_from_db()
    assert document.status == CourseDocument.Status.FAILED
    assert document.error_message == (
        "PDF scanné non supporté : aucun texte n'a pu être extrait."
    )


@pytest.mark.django_db
def test_retrieve_returns_only_ready_course_chunks(
    course,
    teacher,
    monkeypatch,
):
    ready = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file=make_pdf_upload("ready.pdf"),
        title="Chapitre 1",
        status=CourseDocument.Status.READY,
    )
    pending = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file=make_pdf_upload("pending.pdf"),
        title="Chapitre 2",
        status=CourseDocument.Status.PENDING,
    )
    DocumentChunk.objects.create(
        document=ready,
        content="La photosynthèse utilise la lumière.",
        page_number=3,
        chunk_index=0,
        embedding_id="ready-vector",
    )
    DocumentChunk.objects.create(
        document=pending,
        content="Contenu pas encore indexé.",
        page_number=1,
        chunk_index=0,
        embedding_id="pending-vector",
    )
    collection_query = {}

    class FakeCollection:
        def query(self, **kwargs):
            collection_query.update(kwargs)
            return {
                "documents": [["La photosynthèse utilise la lumière."]],
                "metadatas": [[
                    {
                        "document_id": ready.id,
                        "page_number": 3,
                        "chunk_index": 0,
                    }
                ]],
                "distances": [[0.12]],
            }

    monkeypatch.setattr("rag.services._embed", lambda texts: [[0.4, 0.6]])
    monkeypatch.setattr("rag.services._collection", lambda _: FakeCollection())

    results = retrieve(course.id, "Comment fonctionne la photosynthèse ?", k=1)

    assert results == [
        {
            "document_id": ready.id,
            "document_title": "Chapitre 1",
            "page_number": 3,
            "chunk_index": 0,
            "content": "La photosynthèse utilise la lumière.",
            "score": pytest.approx(0.88),
        }
    ]
    assert collection_query["where"] == {
        "document_id": {"$in": [ready.id]}
    }
