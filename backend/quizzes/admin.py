from django.contrib import admin

from quizzes.models import AttemptAnswer, Choice, Question, Quiz, QuizAttempt


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "teacher", "duration", "passing_score")
    list_select_related = ("course", "teacher")
    search_fields = ("title", "course__title", "teacher__email")
    inlines = (QuestionInline,)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "quiz", "type", "order")
    list_select_related = ("quiz",)
    inlines = (ChoiceInline,)


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    readonly_fields = ("question", "selected_choice", "is_correct")


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("student", "quiz", "score", "passed", "completed_at")
    list_select_related = ("student", "quiz")
    inlines = (AttemptAnswerInline,)
