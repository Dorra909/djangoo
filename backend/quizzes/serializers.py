from django.db import transaction
from django.db.models import F
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from rest_framework import serializers

from courses.models import Course
from quizzes.models import (
    AttemptAnswer,
    Choice,
    Question,
    Quiz,
    QuizAttempt,
)


class QuestionReadSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    correctAnswer = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ("id", "text", "type", "options", "correctAnswer", "explanation")

    def get_options(self, obj) -> list[str]:
        return [choice.text for choice in obj.choices.all()]

    def get_correctAnswer(self, obj) -> int | None:
        if self.context.get("student_safe", False):
            return None
        choices = list(obj.choices.all())
        return next(
            (index for index, choice in enumerate(choices) if choice.is_correct),
            None,
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("student_safe", False):
            data.pop("correctAnswer", None)
            data.pop("explanation", None)
        return data


class QuizReadSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source="course_id", read_only=True)
    courseName = serializers.CharField(source="course.title", read_only=True)
    teacherId = serializers.IntegerField(source="teacher_id", read_only=True)
    duration = serializers.IntegerField()
    passingScore = serializers.IntegerField(source="passing_score")
    attemptCount = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    questions = QuestionReadSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "title",
            "courseId",
            "courseName",
            "teacherId",
            "duration",
            "passingScore",
            "questions",
            "attemptCount",
            "createdAt",
        )
        read_only_fields = fields

    def get_attemptCount(self, obj) -> int:
        if hasattr(obj, "attemptCount"):
            return obj.attemptCount
        return obj.attempts.count()

class ChoiceWriteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=500, allow_blank=False)
    is_correct = serializers.BooleanField(default=False)


class QuestionWriteSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    text = serializers.CharField()
    type = serializers.ChoiceField(choices=Question.Type.choices)
    options = serializers.ListField(
        child=serializers.CharField(max_length=500, allow_blank=False),
        allow_empty=False,
    )
    correctAnswer = serializers.IntegerField(min_value=0)
    explanation = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        options = attrs["options"]
        correct_index = attrs["correctAnswer"]
        if len(options) < 2:
            raise serializers.ValidationError(
                {"options": "A question must have at least two choices."}
            )
        if correct_index >= len(options):
            raise serializers.ValidationError(
                {"correctAnswer": "Select a correct answer from the provided choices."}
            )
        if attrs["type"] == Question.Type.TRUE_FALSE and options != ["Vrai", "Faux"]:
            raise serializers.ValidationError(
                {"options": 'True/false choices must be ["Vrai", "Faux"].'}
            )
        return attrs


class QuizWriteSerializer(serializers.ModelSerializer):
    courseId = serializers.PrimaryKeyRelatedField(
        source="course",
        queryset=Course.objects.all(),
    )
    courseName = serializers.CharField(source="course.title", read_only=True)
    teacherId = serializers.IntegerField(source="teacher_id", read_only=True)
    passingScore = serializers.IntegerField(
        source="passing_score",
        min_value=0,
        max_value=100,
    )
    attemptCount = serializers.IntegerField(read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    questions = QuestionWriteSerializer(many=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "title",
            "courseId",
            "courseName",
            "teacherId",
            "duration",
            "passingScore",
            "questions",
            "attemptCount",
            "createdAt",
        )
        read_only_fields = ("id", "courseName", "teacherId", "attemptCount", "createdAt")

    def validate_courseId(self, course):
        request = self.context["request"]
        if request.user.role == "ENSEIGNANT" and course.teacher_id != request.user.id:
            raise serializers.ValidationError(
                "You may only create quizzes for your own courses."
            )
        return course

    def validate_questions(self, questions):
        ids = [question["id"] for question in questions if "id" in question]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Question IDs must be unique.")
        return questions

    def to_representation(self, instance):
        return QuizReadSerializer(
            instance,
            context={**self.context, "student_safe": False},
        ).data

    @transaction.atomic
    def create(self, validated_data):
        questions_data = validated_data.pop("questions")
        course = validated_data["course"]
        quiz = Quiz.objects.create(
            teacher=course.teacher,
            **validated_data,
        )
        self._save_questions(quiz, questions_data, existing=[])
        return quiz

    @transaction.atomic
    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        course = validated_data.get("course", instance.course)
        if course.teacher_id != instance.teacher_id:
            raise serializers.ValidationError(
                {"courseId": "Quiz course must belong to its teacher."}
            )
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if questions_data is not None:
            self._save_questions(
                instance,
                questions_data,
                existing=list(instance.questions.prefetch_related("choices")),
            )
        return instance

    @staticmethod
    def _save_questions(quiz, questions_data, existing):
        Question.objects.filter(quiz=quiz).update(order=F("order") + 1_000_000)
        retained_ids = set()
        for position, question_data in enumerate(questions_data, start=1):
            question_id = question_data.pop("id", None)
            choices_data = question_data.pop("options")
            correct_index = question_data.pop("correctAnswer")
            explanation = question_data.pop("explanation", "")

            if question_id is not None:
                question = next((q for q in existing if q.id == question_id), None)
                if question is None:
                    raise serializers.ValidationError(
                        {"questions": f"Question {question_id} does not belong to this quiz."}
                    )
            elif position <= len(existing):
                question = existing[position - 1]
            else:
                question = None

            if question is None:
                question = Question.objects.create(
                    quiz=quiz,
                    order=position,
                    explanation=explanation,
                    **question_data,
                )
            else:
                for field, value in question_data.items():
                    setattr(question, field, value)
                question.order = position
                question.explanation = explanation
                question.save()
                question.choices.all().delete()

            Choice.objects.bulk_create(
                [
                    Choice(
                        question=question,
                        text=text,
                        is_correct=index == correct_index,
                        order=index + 1,
                    )
                    for index, text in enumerate(choices_data)
                ]
            )
            retained_ids.add(question.id)

        Question.objects.filter(quiz=quiz).exclude(id__in=retained_ids).delete()


class AttemptStartSerializer(serializers.ModelSerializer):
    quizId = serializers.IntegerField(source="quiz_id", read_only=True)
    startedAt = serializers.DateTimeField(source="started_at", read_only=True)
    questions = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = ("id", "quizId", "startedAt", "questions")

    def get_questions(self, obj):
        return QuizReadSerializer(
            obj.quiz,
            context={"student_safe": True},
        ).data["questions"]


class AttemptListSerializer(serializers.ModelSerializer):
    quizId = serializers.IntegerField(source="quiz_id", read_only=True)
    quizTitle = serializers.CharField(source="quiz.title", read_only=True)
    studentId = serializers.IntegerField(source="student_id", read_only=True)
    studentName = serializers.CharField(source="student.full_name", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)
    timeTaken = serializers.IntegerField(source="time_taken", read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = (
            "id",
            "quizId",
            "quizTitle",
            "studentId",
            "studentName",
            "score",
            "passed",
            "answers",
            "completedAt",
            "timeTaken",
        )

    def get_answers(self, obj) -> list[int]:
        choice_indices = {}
        for question in obj.quiz.questions.all():
            for index, choice in enumerate(question.choices.all()):
                choice_indices[choice.id] = index
        selected_by_question = {
            answer.question_id: answer.selected_choice_id
            for answer in obj.attempt_answers.all()
        }
        return [
            choice_indices.get(selected_by_question.get(question.id), -1)
            for question in obj.quiz.questions.all()
        ]


class AttemptReviewAnswerSerializer(serializers.ModelSerializer):
    questionId = serializers.IntegerField(source="question_id", read_only=True)
    selectedIndex = serializers.SerializerMethodField()
    correctIndex = serializers.SerializerMethodField()
    explanation = serializers.CharField(source="question.explanation", read_only=True)

    class Meta:
        model = AttemptAnswer
        fields = (
            "questionId",
            "selectedIndex",
            "correctIndex",
            "is_correct",
            "explanation",
        )

    def get_selectedIndex(self, obj) -> int:
        if obj.selected_choice_id is None:
            return -1
        return next(
            (
                index
                for index, choice in enumerate(obj.question.choices.all())
                if choice.id == obj.selected_choice_id
            ),
            -1,
        )

    def get_correctIndex(self, obj) -> int:
        return next(
            (
                index
                for index, choice in enumerate(obj.question.choices.all())
                if choice.is_correct
            ),
            -1,
        )


class AttemptReviewSerializer(AttemptListSerializer):
    review = serializers.SerializerMethodField()

    class Meta(AttemptListSerializer.Meta):
        fields = (*AttemptListSerializer.Meta.fields, "review")

    @extend_schema_field(AttemptReviewAnswerSerializer(many=True))
    def get_review(self, obj):
        return AttemptReviewAnswerSerializer(
            obj.attempt_answers.select_related("question").prefetch_related(
                "question__choices"
            ),
            many=True,
        ).data


class AttemptSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.IntegerField(min_value=-1),
        allow_empty=False,
    )
    timeTaken = serializers.IntegerField(min_value=0, max_value=100_000)

    def validate(self, attrs):
        attempt = self.context["attempt"]
        questions = list(attempt.quiz.questions.prefetch_related("choices"))
        answers = attrs["answers"]
        if len(answers) != len(questions):
            raise serializers.ValidationError(
                {"answers": "Submit one selected choice index per quiz question."}
            )
        for index, question in enumerate(questions):
            answer = answers[index]
            if answer >= question.choices.count():
                raise serializers.ValidationError(
                    {"answers": f"Choice index for question {index + 1} is invalid."}
                )
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        attempt = self.context["attempt"]
        if attempt.completed_at is not None:
            raise serializers.ValidationError(
                {"detail": "This attempt has already been submitted."}
            )
        answers = self.validated_data["answers"]
        questions = list(
            attempt.quiz.questions.prefetch_related("choices").order_by("order", "id")
        )
        correct_count = 0
        for index, question in enumerate(questions):
            selected_index = answers[index]
            choices = list(question.choices.all())
            selected = choices[selected_index] if selected_index >= 0 else None
            is_correct = bool(selected and selected.is_correct)
            correct_count += int(is_correct)
            AttemptAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_choice=selected,
                is_correct=is_correct,
            )
        attempt.score = round(correct_count * 100 / len(questions)) if questions else 0
        attempt.passed = attempt.score >= attempt.quiz.passing_score
        attempt.time_taken = self.validated_data["timeTaken"]
        attempt.completed_at = kwargs.get("completed_at", timezone.now())
        attempt.save(
            update_fields=("score", "passed", "time_taken", "completed_at")
        )
        return attempt


class AttemptResultsSerializer(serializers.Serializer):
    attemptCount = serializers.IntegerField()
    averageScore = serializers.IntegerField()
    passRate = serializers.IntegerField()
    distribution = serializers.ListField(child=serializers.DictField())
    attempts = AttemptListSerializer(many=True)
