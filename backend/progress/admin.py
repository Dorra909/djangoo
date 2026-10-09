from django.contrib import admin

from progress.models import LessonProgress


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "lesson", "completed_at", "last_accessed")
    list_select_related = ("student", "course", "lesson")
    list_filter = ("course",)
