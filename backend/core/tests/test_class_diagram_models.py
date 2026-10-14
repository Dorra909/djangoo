import pytest
from django.utils import timezone

from accounts.models import Administrateur, Enseignant, Etudiant, User
from complaints.models import Complaint, Reclamation
from courses.models import Course, Cours, Enrollment, Inscription, Lesson
from progress.models import LessonProgress, Progression
from quizzes.models import Choice, Quiz, QuizAttempt, Question, Reponse, Resultat


@pytest.fixture
def platform_users(db):
    admin = User.objects.create_user(
        email="uml-admin@example.com",
        password="StrongPassword123!",
        full_name="UML Admin",
        role=User.Role.ADMIN,
    )
    teacher = User.objects.create_user(
        email="uml-teacher@example.com",
        password="StrongPassword123!",
        full_name="UML Teacher",
        role=User.Role.TEACHER,
        specialite="Mathematics",
    )
    student = User.objects.create_user(
        email="uml-student@example.com",
        password="StrongPassword123!",
        full_name="UML Student",
        role=User.Role.STUDENT,
        matricule="ST-001",
        niveau_etude="Licence",
    )
    return admin, teacher, student


@pytest.mark.django_db
def test_role_classes_and_user_operations_match_the_diagram(platform_users):
    admin, teacher, student = platform_users

    admin_model = Administrateur.objects.get(pk=admin.pk)
    teacher_model = Enseignant.objects.get(pk=teacher.pk)
    student_model = Etudiant.objects.get(pk=student.pk)

    assert admin_model.consulterDashboard()["utilisateurs"] == 3
    assert admin_model.gererUtilisateurs().count() == 3
    assert admin_model.gererEnseignants().count() == 1
    assert admin_model.gererEtudiants().count() == 1
    assert teacher_model.specialite == "Mathematics"
    assert student_model.matricule == "ST-001"
    assert student_model.niveauEtude == "Licence"
    assert student_model.nom == ""
    assert student_model.seConnecter("StrongPassword123!")
    assert not student_model.seConnecter("incorrect")
    assert student_model.motDePasse != "StrongPassword123!"
    student_model.modifierProfil(nom="Learner", niveauEtude="Master")
    student_model.refresh_from_db()
    assert student_model.nom == "Learner"
    assert student_model.niveau_etude == "Master"


@pytest.mark.django_db
def test_course_enrollment_and_progression_operations(platform_users):
    _, teacher, student = platform_users
    teacher_model = Enseignant.objects.get(pk=teacher.pk)
    student_model = Etudiant.objects.get(pk=student.pk)

    course = teacher_model.creerCours(
        titre="Algebra",
        description="Course description",
        contenu="Course content",
        categorie="Math",
        niveau=Course.Level.BEGINNER,
        duree=60,
        statut="Publié",
    )
    assert isinstance(course, Cours)
    assert course.titre == "Algebra"
    assert course.contenu == "Course content"
    assert course.dateCreation is not None
    assert course.dateModification is not None
    assert course.statut == "Publié"

    lesson = Lesson.objects.create(
        course=course,
        title="Chapter 1",
        content="Lesson",
        duration=30,
    )
    enrollment = student_model.sInscrire(course)
    assert isinstance(enrollment, Inscription)
    assert enrollment.dateInscription is not None
    assert student_model.consulterCours().count() == 1
    LessonProgress.objects.create(
        student=student,
        course=course,
        lesson=lesson,
    )
    assert student_model.suivreCours(course).count() == 1
    assert student_model.suivreProgression(course)["percentage"] == 100
    progression = Progression.actualiser(student, course)
    assert progression.chapitresTermines == 1
    assert progression.pourcentage == 100
    assert progression.tempsPasse == 30
    assert enrollment.__class__.objects.get(pk=enrollment.pk).progression == 100

    teacher_model.modifierCours(course, titre="Updated algebra")
    assert Cours.consulter().get(pk=course.pk).title == "Updated algebra"
    enrollment.annuler()
    assert not Enrollment.objects.filter(pk=enrollment.pk).exists()
    teacher_model.supprimerCours(course)
    assert not Course.objects.filter(pk=course.pk).exists()


@pytest.mark.django_db
def test_quiz_question_answer_and_resultat_operations(platform_users):
    _, teacher, student = platform_users
    teacher_model = Enseignant.objects.get(pk=teacher.pk)
    student_model = Etudiant.objects.get(pk=student.pk)
    course = Course.objects.create(
        teacher=teacher,
        title="Quiz course",
        description="Course description",
        category="Math",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    student_model.sInscrire(course)

    quiz = teacher_model.creerQuiz(
        cours=course,
        titre="Fractions",
        description="Quiz description",
        dateLimite=None,
        duree=15,
        noteMax=20,
        statut="active",
    )
    assert quiz.titre == "Fractions"
    assert quiz.nombreQuestions == 0
    assert quiz.noteMax == 20
    assert quiz.statut == "active"
    question = Question.objects.create(
        quiz=quiz,
        text="What is 1/2 + 1/2?",
        type=Question.Type.SHORT_ANSWER,
        points=2,
        order=1,
    )
    answer = Choice.objects.create(
        question=question,
        text="1",
        is_correct=True,
        order=1,
    )
    assert question.enonce == "What is 1/2 + 1/2?"
    assert question.ordre == 1
    assert isinstance(answer, Reponse)
    assert answer.contenu == "1"
    assert answer.estCorrecte
    assert quiz.nombreQuestions == 1

    attempt = student_model.passerQuiz(quiz)
    attempt.score = 100
    attempt.passed = True
    attempt.time_taken = 10
    attempt.completed_at = timezone.now()
    attempt.save()
    assert isinstance(attempt, Resultat)
    assert attempt.dateObtention == attempt.completed_at
    assert attempt.dureePasse == 10
    assert attempt.statut == "Réussi"
    assert Resultat.consulter(quiz=quiz, etudiant=student).count() == 1
    assert student_model.consulterResultats().count() == 1
    assert student_model.rechercherQuiz("fraction").count() == 1
    assert teacher_model.consulterResultats(quiz=quiz).count() == 1
    assert teacher_model.consulterDashboard()["quiz"] == 1

    teacher_model.modifierQuiz(quiz, titre="Updated quiz")
    assert teacher_model.consulterQuiz().get(pk=quiz.pk).title == "Updated quiz"
    teacher_model.supprimerQuiz(quiz)
    assert not Quiz.objects.filter(pk=quiz.pk).exists()


@pytest.mark.django_db
def test_complaint_diagram_attributes_and_operations(platform_users):
    admin, _, student = platform_users
    complaint = Reclamation.creer(
        author=student,
        sujet="Access issue",
        category="Technical",
        description="Cannot open a course",
        priorite="Haute",
    )
    assert complaint.sujet == "Access issue"
    assert complaint.description == "Cannot open a course"
    assert complaint.dateCreation is not None
    assert complaint.priorite == "Haute"
    assert Reclamation.consulter().count() == 1
    assert Administrateur.objects.get(pk=admin.pk).gererReclamations().count() == 1

    complaint.traiter(
        statut=Complaint.Status.RESOLVED,
        reponse="Access restored",
    )
    assert complaint.dateTraitement >= complaint.dateCreation
    assert complaint.statut == Complaint.Status.RESOLVED
    assert complaint.reponse == "Access restored"
