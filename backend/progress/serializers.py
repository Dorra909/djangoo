from rest_framework import serializers


class CourseProgressSerializer(serializers.Serializer):
    courseId = serializers.IntegerField()
    courseTitle = serializers.CharField()
    completedLessons = serializers.IntegerField()
    totalLessons = serializers.IntegerField()
    percentage = serializers.IntegerField()
    lastAccessed = serializers.DateTimeField(allow_null=True)
