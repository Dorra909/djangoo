from rest_framework import serializers

from complaints.serializers import ComplaintReadSerializer
from courses.serializers import CourseReadSerializer
from progress.serializers import CourseProgressSerializer
from quizzes.serializers import AttemptListSerializer, QuizReadSerializer


class MonthCountSerializer(serializers.Serializer):
    month = serializers.CharField()
    count = serializers.IntegerField()


class RoleCountSerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.IntegerField()


class DashboardStatsSerializer(serializers.Serializer):
    totalUsers = serializers.IntegerField()
    totalTeachers = serializers.IntegerField()
    totalStudents = serializers.IntegerField()
    totalCourses = serializers.IntegerField()
    totalQuizzes = serializers.IntegerField()
    openComplaints = serializers.IntegerField()
    newUsersPerMonth = MonthCountSerializer(many=True)
    usersByRole = RoleCountSerializer(many=True)


class AdminDashboardSerializer(serializers.Serializer):
    stats = DashboardStatsSerializer()
    recentComplaints = ComplaintReadSerializer(many=True)


class TeacherDashboardSerializer(serializers.Serializer):
    courses = CourseReadSerializer(many=True)
    quizzes = QuizReadSerializer(many=True)
    attempts = AttemptListSerializer(many=True)


class StudentDashboardSerializer(serializers.Serializer):
    progress = CourseProgressSerializer(many=True)
    attempts = AttemptListSerializer(many=True)
    courses = CourseReadSerializer(many=True)
    quizzes = QuizReadSerializer(many=True)
