from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import IsStudent
from progress.serializers import CourseProgressSerializer
from progress.services import get_student_progress


class MyProgressView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses={200: CourseProgressSerializer(many=True)})
    def get(self, request):
        data = get_student_progress(request.user)
        return Response(CourseProgressSerializer(data, many=True).data)
