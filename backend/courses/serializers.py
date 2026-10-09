from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from accounts.models import User
from courses.models import Course, Enrollment, Lesson


class LessonSerializer(serializers.ModelSerializer):
    videoUrl = serializers.URLField(source="video_url", required=False, allow_blank=True)
    pdfUrl = serializers.URLField(source="pdf_url", required=False, allow_blank=True)

    class Meta:
        model = Lesson
        fields = ("id", "title", "content", "videoUrl", "pdfUrl", "order", "duration")


class LessonWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    videoUrl = serializers.URLField(
        source="video_url",
        required=False,
        allow_blank=True,
    )
    pdfUrl = serializers.URLField(
        source="pdf_url",
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Lesson
        fields = ("id", "title", "content", "videoUrl", "pdfUrl", "order", "duration")
        extra_kwargs = {
            "title": {"required": True},
            "content": {"required": True},
            "order": {"required": False},
            "duration": {"required": False},
        }


class CourseReadSerializer(serializers.ModelSerializer):
    teacherId = serializers.IntegerField(source="teacher_id", read_only=True)
    teacherName = serializers.CharField(source="teacher.full_name", read_only=True)
    enrolledCount = serializers.IntegerField(read_only=True)
    reviewCount = serializers.IntegerField(source="review_count", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isPublished = serializers.BooleanField(source="is_published", read_only=True)
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "category",
            "level",
            "thumbnail",
            "teacherId",
            "teacherName",
            "lessons",
            "enrolledCount",
            "rating",
            "reviewCount",
            "createdAt",
            "isPublished",
        )


class CourseWriteSerializer(serializers.ModelSerializer):
    teacherId = serializers.IntegerField(source="teacher_id", read_only=True)
    teacherName = serializers.CharField(source="teacher.full_name", read_only=True)
    enrolledCount = serializers.IntegerField(read_only=True)
    reviewCount = serializers.IntegerField(source="review_count", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isPublished = serializers.BooleanField(source="is_published", required=False)
    lessons = LessonWriteSerializer(many=True, required=False)

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "category",
            "level",
            "thumbnail",
            "teacherId",
            "teacherName",
            "lessons",
            "enrolledCount",
            "rating",
            "reviewCount",
            "createdAt",
            "isPublished",
        )
        read_only_fields = (
            "id",
            "teacherId",
            "teacherName",
            "enrolledCount",
            "rating",
            "reviewCount",
            "createdAt",
        )

    @transaction.atomic
    def create(self, validated_data):
        lessons_data = validated_data.pop("lessons", [])
        request = self.context["request"]
        validated_data["teacher"] = request.user
        course = Course.objects.create(**validated_data)
        self._save_lessons(course, lessons_data, existing=[])
        return course

    @transaction.atomic
    def update(self, instance, validated_data):
        lessons_data = validated_data.pop("lessons", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lessons_data is not None:
            self._save_lessons(
                instance,
                lessons_data,
                existing=list(instance.lessons.order_by("order", "id")),
            )
        return instance

    @staticmethod
    def _save_lessons(course, lessons_data, existing):
        Lesson.objects.filter(course=course).update(order=F("order") + 1_000_000)
        retained_ids = set()
        for position, lesson_data in enumerate(lessons_data, start=1):
            lesson_id = lesson_data.pop("id", None)
            lesson_data["order"] = position
            if lesson_id is not None:
                lesson = next((item for item in existing if item.id == lesson_id), None)
                if lesson is None:
                    raise serializers.ValidationError(
                        {"lessons": f"Lesson {lesson_id} does not belong to this course."}
                    )
            elif position <= len(existing):
                lesson = existing[position - 1]
            else:
                lesson = None

            if lesson is None:
                lesson = Lesson.objects.create(course=course, **lesson_data)
            else:
                for field, value in lesson_data.items():
                    setattr(lesson, field, value)
                lesson.save()
            retained_ids.add(lesson.id)

        Lesson.objects.filter(course=course).exclude(id__in=retained_ids).delete()


class EnrollmentSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source="course_id", read_only=True)
    enrolled = serializers.SerializerMethodField()
    course = CourseReadSerializer(read_only=True)
    enrolledAt = serializers.DateTimeField(source="enrolled_at", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "courseId", "course", "enrolled", "enrolledAt")

    def get_enrolled(self, obj) -> bool:
        return True


class ReorderLessonsSerializer(serializers.Serializer):
    lessonIds = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )

    def validate_lessonIds(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Lesson IDs must be unique.")
        return value


class UserNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name")
