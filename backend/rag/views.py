from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.models import User
from courses.models import Course
from rag.models import CourseDocument
from rag.serializers import (
    CourseDocumentSerializer,
    CourseDocumentUploadSerializer,
)
from rag.services import delete_document_vectors, schedule_indexing


def teacher_course_or_404(request, course_id):
    if request.user.role != User.Role.TEACHER:
        raise PermissionDenied("Seuls les enseignants peuvent gérer les documents.")
    return get_object_or_404(Course, pk=course_id, teacher=request.user)


def teacher_document_or_404(request, document_id):
    if request.user.role != User.Role.TEACHER:
        raise PermissionDenied("Seuls les enseignants peuvent gérer les documents.")
    return get_object_or_404(
        CourseDocument.objects.select_related("course"),
        Q(pk=document_id) & Q(course__teacher=request.user),
    )


class CourseDocumentListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(responses={200: CourseDocumentSerializer(many=True)})
    def get(self, request, course_id):
        course = teacher_course_or_404(request, course_id)
        documents = CourseDocument.objects.filter(course=course)
        return Response(CourseDocumentSerializer(documents, many=True).data)

    @extend_schema(
        request=CourseDocumentUploadSerializer,
        responses={202: CourseDocumentSerializer},
    )
    def post(self, request, course_id):
        course = teacher_course_or_404(request, course_id)
        serializer = CourseDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        document = CourseDocument.objects.create(
            course=course,
            uploaded_by=request.user,
            file=uploaded_file,
            title=uploaded_file.name,
        )
        schedule_indexing(document.id)
        return Response(
            CourseDocumentSerializer(document).data,
            status=status.HTTP_202_ACCEPTED,
        )


class CourseDocumentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CourseDocumentSerializer})
    def get(self, request, document_id):
        document = teacher_document_or_404(request, document_id)
        return Response(CourseDocumentSerializer(document).data)


class CourseDocumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, document_id):
        document = teacher_document_or_404(request, document_id)
        delete_document_vectors(document)
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
