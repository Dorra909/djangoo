from django.db import transaction
from django.db.models import F
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException

from courses.models import Course
from quizzes.models import (
    AttemptAnswer,
    Choice,
    Question,
    Quiz,
    QuizAttempt,
)
from rag.models import CourseDocument


class QuestionReadSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    correctAnswer = serializers.SerializerMethodField()
    modelAnswer = serializers.CharField(source="model_answer", read_only=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "text",
            "type",
            "options",
            "correctAnswer",
            "explanation",
            "points",
            "modelAnswer",
            "rubric",
            "source",
        )

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

    def get_source(self, obj) -> dict[str, int | str] | None:
        if obj.source_document_id is None:
            return None
        return {
            "documentId": obj.source_document_id,
            "title": obj.source_document.title,
            "page": obj.source_page,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("student_safe", False):
            data.pop("correctAnswer", None)
            data.pop("explanation", None)
            data.pop("modelAnswer", None)
            data.pop("rubric", None)
        return data


class QuizReadSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source="course_id", read_only=True)
    courseName = serializers.CharField(source="course.title", read_only=True)
    teacherId = serializers.IntegerField(source="teacher_id", read_only=True)
    duration = serializers.IntegerField()
    passingScore = serializers.IntegerField(source="passing_score")
    creationMode = serializers.CharField(source="creation_mode", read_only=True)
    gradingMode = serializers.CharField(source="grading_mode", read_only=True)
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
            "creationMode",
            "gradingMode",
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
    text = serializers.CharField(allow_blank=False, trim_whitespace=True)
    type = serializers.ChoiceField(choices=Question.Type.choices)
    options = serializers.ListField(
        child=serializers.CharField(max_length=500, allow_blank=False),
        allow_empty=True,
    )
    correctAnswer = serializers.IntegerField(min_value=0, required=False)
    explanation = serializers.CharField(required=False, allow_blank=True)
    points = serializers.FloatField(min_value=0.01, max_value=100, required=False)
    modelAnswer = serializers.CharField(required=False, allow_blank=True)
    rubric = serializers.CharField(required=False, allow_blank=True)
    source = serializers.DictField(required=False)

    def validate(self, attrs):
        options = attrs["options"]
        if attrs["type"] == Question.Type.SHORT_ANSWER:
            if options:
                raise serializers.ValidationError(
                    {"options": "Short-answer questions cannot include choices."}
                )
            if not attrs.get("modelAnswer", "").strip():
                raise serializers.ValidationError(
                    {"modelAnswer": "A model answer is required."}
                )
        else:
            correct_index = attrs.get("correctAnswer")
            if len(options) < 2:
                raise serializers.ValidationError(
                    {"options": "A question must have at least two choices."}
                )
            if correct_index is None or correct_index >= len(options):
                raise serializers.ValidationError(
                    {"correctAnswer": "Select a correct answer from the provided choices."}
                )
            if attrs["type"] == Question.Type.TRUE_FALSE and options != ["Vrai", "Faux"]:
                raise serializers.ValidationError(
                    {"options": 'True/false choices must be ["Vrai", "Faux"].'}
                )
        source = attrs.get("source")
        if source is not None and (
            not isinstance(source.get("documentId"), int)
            or not isinstance(source.get("page"), int)
            or source["page"] < 1
        ):
            raise serializers.ValidationError(
                {"source": "Source must include a documentId and positive page."}
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
    creationMode = serializers.ChoiceField(
        source="creation_mode",
        choices=Quiz.CreationMode.choices,
        required=False,
    )
    gradingMode = serializers.ChoiceField(
        source="grading_mode",
        choices=Quiz.GradingMode.choices,
        required=False,
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
            "creationMode",
            "gradingMode",
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
            correct_index = question_data.pop("correctAnswer", None)
            explanation = question_data.pop("explanation", "")
            points = question_data.pop("points", 1.0)
            model_answer = question_data.pop("modelAnswer", "")
            rubric = question_data.pop("rubric", "")
            source = question_data.pop("source", None)
            source_document = None
            source_page = None
            if source is not None:
                source_document = CourseDocument.objects.filter(
                    pk=source["documentId"],
                    course=quiz.course,
                    uploaded_by=quiz.teacher,
                    status=CourseDocument.Status.READY,
                ).first()
                if source_document is None:
                    raise serializers.ValidationError(
                        {"questions": "Question source must be a ready document of the quiz course."}
                    )
                source_page = source["page"]

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
                    points=points,
                    model_answer=model_answer,
                    rubric=rubric,
                    source_document=source_document,
                    source_page=source_page,
                    **question_data,
                )
            else:
                for field, value in question_data.items():
                    setattr(question, field, value)
                question.order = position
                question.explanation = explanation
                question.points = points
                question.model_answer = model_answer
                question.rubric = rubric
                question.source_document = source_document
                question.source_page = source_page
                question.save()
                question.choices.all().delete()

            Choice.objects.bulk_create(
                [
                    Choice(
                        question=question,
                        text=text,
                        is_correct=correct_index is not None and index == correct_index,
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
    needsReview = serializers.BooleanField(source="needs_review", read_only=True)

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
            "needsReview",
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
    explanation = serializers.CharField(read_only=True)
    textAnswer = serializers.CharField(source="text_answer", read_only=True)
    aiScore = serializers.FloatField(source="ai_score", read_only=True)
    aiFeedback = serializers.CharField(source="ai_feedback", read_only=True)
    teacherOverrideScore = serializers.FloatField(
        source="teacher_override_score",
        read_only=True,
    )
    needsReview = serializers.BooleanField(source="needs_review", read_only=True)
    finalScore = serializers.SerializerMethodField()

    class Meta:
        model = AttemptAnswer
        fields = (
            "questionId",
            "selectedIndex",
            "correctIndex",
            "is_correct",
            "explanation",
            "textAnswer",
            "aiScore",
            "aiFeedback",
            "teacherOverrideScore",
            "needsReview",
            "finalScore",
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

    def get_finalScore(self, obj) -> float:
        if obj.teacher_override_score is not None:
            return obj.teacher_override_score
        if obj.ai_score is not None:
            return obj.ai_score
        return obj.question.points if obj.is_correct else 0.0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.is_correct and not data["explanation"]:
            data["explanation"] = instance.question.explanation
        return data


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


class TextAnswerSerializer(serializers.Serializer):
    questionId = serializers.IntegerField(min_value=1)
    textAnswer = serializers.CharField(
        max_length=10_000,
        allow_blank=True,
        trim_whitespace=True,
    )


class AttemptSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.IntegerField(min_value=-1),
        allow_empty=True,
        required=False,
    )
    textAnswers = TextAnswerSerializer(many=True, required=False)
    timeTaken = serializers.IntegerField(min_value=0, max_value=100_000)

    def validate(self, attrs):
        attempt = self.context["attempt"]
        questions = list(attempt.quiz.questions.prefetch_related("choices"))
        answers = attrs.get("answers", [])
        text_answers = attrs.get("textAnswers", [])
        text_by_question = {
            item["questionId"]: item["textAnswer"] for item in text_answers
        }
        if len(text_by_question) != len(text_answers):
            raise serializers.ValidationError(
                {"textAnswers": "Question IDs in textAnswers must be unique."}
            )
        expected_choice_questions = sum(
            question.type != Question.Type.SHORT_ANSWER for question in questions
        )
        if len(answers) != expected_choice_questions:
            raise serializers.ValidationError(
                {"answers": "Submit one selected choice index per choice question."}
            )
        choice_index = 0
        valid_question_ids = {question.id for question in questions}
        if set(text_by_question) - valid_question_ids:
            raise serializers.ValidationError(
                {"textAnswers": "A text answer references a question outside this quiz."}
            )
        for question in questions:
            if question.type == Question.Type.SHORT_ANSWER:
                continue
            answer = answers[choice_index]
            choice_index += 1
            if answer >= question.choices.count():
                raise serializers.ValidationError(
                    {"answers": f"Choice index for question {question.order} is invalid."}
                )
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        from quizzes.grading import (
            generate_wrong_answer_explanation,
            grade_short_answer,
            mark_pending_if_grading_failed,
            recalculate_attempt,
        )

        attempt = self.context["attempt"]
        if attempt.completed_at is not None:
            raise serializers.ValidationError(
                {"detail": "This attempt has already been submitted."}
            )
        answers = self.validated_data.get("answers", [])
        text_answers = {
            item["questionId"]: item["textAnswer"]
            for item in self.validated_data.get("textAnswers", [])
        }
        questions = list(
            attempt.quiz.questions.prefetch_related("choices").order_by("order", "id")
        )
        answer_index = 0
        grading_mode = attempt.quiz.grading_mode
        for question in questions:
            selected = None
            text_answer = ""
            ai_score = None
            ai_feedback = ""
            is_correct = False
            answer_needs_review = False
            if question.type == Question.Type.SHORT_ANSWER:
                text_answer = text_answers.get(question.id, "")
                if grading_mode == Quiz.GradingMode.AI and text_answer.strip():
                    try:
                        ai_score, ai_feedback = grade_short_answer(
                            question,
                            text_answer,
                        )
                    except (APIException, ValueError, TypeError) as exc:
                        answer_needs_review = True
                        placeholder = AttemptAnswer(
                            attempt=attempt,
                            question=question,
                            text_answer=text_answer,
                        )
                        mark_pending_if_grading_failed(placeholder, exc)
                        ai_feedback = placeholder.ai_feedback
                else:
                    answer_needs_review = True
            else:
                selected_index = answers[answer_index]
                answer_index += 1
                choices = list(question.choices.all())
                selected = (
                    choices[selected_index]
                    if 0 <= selected_index < len(choices)
                    else None
                )
                is_correct = bool(selected and selected.is_correct)
                if grading_mode == Quiz.GradingMode.MANUAL:
                    is_correct = False
                    answer_needs_review = True
            answer = AttemptAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_choice=selected,
                is_correct=is_correct,
                text_answer=text_answer,
                ai_score=ai_score,
                ai_feedback=ai_feedback,
                needs_review=answer_needs_review,
            )
        recalculate_attempt(attempt)
        attempt.time_taken = self.validated_data["timeTaken"]
        attempt.completed_at = kwargs.get("completed_at", timezone.now())
        attempt.save(update_fields=("time_taken", "completed_at"))
        for answer in attempt.attempt_answers.select_related(
            "question",
            "selected_choice",
            "question__source_document",
        ).prefetch_related("question__choices"):
            if not answer.is_correct and answer.question.type != Question.Type.SHORT_ANSWER:
                answer.explanation = answer.question.explanation or generate_wrong_answer_explanation(
                    answer
                )
                answer.save(update_fields=("explanation",))
        return attempt


class TeacherAnswerOverrideSerializer(serializers.Serializer):
    score = serializers.FloatField(min_value=0)
    feedback = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class AttemptResultsSerializer(serializers.Serializer):
    attemptCount = serializers.IntegerField()
    averageScore = serializers.IntegerField()
    passRate = serializers.IntegerField()
    distribution = serializers.ListField(child=serializers.DictField())
    attempts = AttemptListSerializer(many=True)
