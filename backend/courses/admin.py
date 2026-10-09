from django.contrib import admin

from courses.models import Course, Enrollment, Lesson


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "teacher", "category", "level", "is_published")
    list_filter = ("level", "category", "is_published")
    search_fields = ("title", "teacher__email")
    inlines = (LessonInline,)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "enrolled_at")
    list_select_related = ("student", "course")
