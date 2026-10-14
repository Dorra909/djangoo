from django.contrib.auth import authenticate, logout
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields["is_staff"] is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields["is_superuser"] is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        TEACHER = "ENSEIGNANT", "Enseignant"
        STUDENT = "ETUDIANT", "Étudiant"

    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    matricule = models.CharField(max_length=50, blank=True)
    niveau_etude = models.CharField(max_length=100, blank=True)
    date_naissance = models.DateField(blank=True, null=True)
    specialite = models.CharField(max_length=120, blank=True)
    grade = models.CharField(max_length=100, blank=True)
    niveau_acces = models.PositiveIntegerField(default=1)
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.STUDENT)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(blank=True)
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
    )

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email

    @property
    def nom(self):
        return self.last_name

    @nom.setter
    def nom(self, value):
        self.last_name = value

    @property
    def prenom(self):
        return self.first_name

    @prenom.setter
    def prenom(self, value):
        self.first_name = value

    @property
    def motDePasse(self):
        return self.password

    @motDePasse.setter
    def motDePasse(self, value):
        self.set_password(value)

    @property
    def dateInscription(self):
        return self.date_joined

    @property
    def actif(self):
        return self.is_active

    @actif.setter
    def actif(self, value):
        self.is_active = value

    @property
    def derniereConnexion(self):
        return self.last_login

    @property
    def niveauAcces(self):
        return self.niveau_acces

    @niveauAcces.setter
    def niveauAcces(self, value):
        self.niveau_acces = value

    @property
    def niveauEtude(self):
        return self.niveau_etude

    @niveauEtude.setter
    def niveauEtude(self, value):
        self.niveau_etude = value

    @property
    def dateNaissance(self):
        return self.date_naissance

    @dateNaissance.setter
    def dateNaissance(self, value):
        self.date_naissance = value

    @property
    def biographie(self):
        return self.bio

    @biographie.setter
    def biographie(self, value):
        self.bio = value

    def seConnecter(self, motDePasse):
        user = authenticate(email=self.email, password=motDePasse)
        return user is not None and user.pk == self.pk

    def seDeconnecter(self, request):
        logout(request)

    def modifierProfil(self, **attributs):
        field_map = {
            "nom": "last_name",
            "prenom": "first_name",
            "biographie": "bio",
            "actif": "is_active",
            "niveauAcces": "niveau_acces",
            "niveauEtude": "niveau_etude",
            "dateNaissance": "date_naissance",
        }
        editable_fields = {
            "last_name",
            "first_name",
            "full_name",
            "email",
            "bio",
            "avatar",
            "notification_preferences",
            "is_active",
            "matricule",
            "niveau_etude",
            "date_naissance",
            "specialite",
            "grade",
            "niveau_acces",
        }
        for name, value in attributs.items():
            field = field_map.get(name, name)
            if field not in editable_fields:
                raise ValueError(f"Unsupported profile attribute: {name}")
            setattr(self, field, value)
        self.save(update_fields=tuple(field_map.get(name, name) for name in attributs))
        return self


class RoleManager(models.Manager):
    role = None

    def get_queryset(self):
        return super().get_queryset().filter(role=self.role)


class AdministrateurManager(RoleManager):
    role = User.Role.ADMIN


class EtudiantManager(RoleManager):
    role = User.Role.STUDENT


class EnseignantManager(RoleManager):
    role = User.Role.TEACHER


class Administrateur(User):
    objects = AdministrateurManager()

    class Meta:
        proxy = True
        verbose_name = "Administrateur"
        verbose_name_plural = "Administrateurs"

    def save(self, *args, **kwargs):
        self.role = User.Role.ADMIN
        return super().save(*args, **kwargs)

    def gererUtilisateurs(self):
        return User.objects.all()

    def gererEnseignants(self):
        return Enseignant.objects.all()

    def gererEtudiants(self):
        return Etudiant.objects.all()

    def gererReclamations(self):
        from complaints.models import Complaint

        return Complaint.objects.all()

    def consulterDashboard(self):
        from complaints.models import Complaint
        from courses.models import Course
        from quizzes.models import Quiz

        return {
            "utilisateurs": User.objects.count(),
            "enseignants": Enseignant.objects.count(),
            "etudiants": Etudiant.objects.count(),
            "cours": Course.objects.count(),
            "quiz": Quiz.objects.count(),
            "reclamationsOuvertes": Complaint.objects.exclude(
                status=Complaint.Status.RESOLVED
            ).count(),
        }


class Etudiant(User):
    objects = EtudiantManager()

    class Meta:
        proxy = True
        verbose_name = "Étudiant"
        verbose_name_plural = "Étudiants"

    def save(self, *args, **kwargs):
        self.role = User.Role.STUDENT
        return super().save(*args, **kwargs)

    def sInscrire(self, cours):
        from courses.models import Enrollment

        if not cours.is_published:
            raise ValueError("L'inscription est réservée aux cours publiés.")
        return Enrollment.objects.get_or_create(student=self, course=cours)[0]

    def consulterCours(self):
        from courses.models import Course, Enrollment

        return Course.objects.filter(
            enrollments__student=self,
            enrollments__status=Enrollment.Status.ACTIVE,
        )

    def suivreCours(self, cours):
        from progress.models import LessonProgress

        return LessonProgress.objects.filter(student=self, course=cours)

    def rechercherQuiz(self, terme):
        from courses.models import Enrollment
        from quizzes.models import Quiz

        return Quiz.objects.filter(
            title__icontains=terme,
            course__is_published=True,
            course__enrollments__student=self,
            course__enrollments__status=Enrollment.Status.ACTIVE,
        ).distinct()

    def passerQuiz(self, quiz):
        from courses.models import Enrollment
        from quizzes.models import QuizAttempt

        if not Enrollment.objects.filter(
            student=self,
            course=quiz.course,
            status=Enrollment.Status.ACTIVE,
        ).exists():
            raise ValueError("L'étudiant doit être inscrit au cours du quiz.")
        return QuizAttempt.objects.create(student=self, quiz=quiz)

    def consulterResultats(self):
        from quizzes.models import QuizAttempt

        return QuizAttempt.objects.filter(
            student=self,
            completed_at__isnull=False,
        ).select_related("quiz")

    def suivreProgression(self, cours):
        from progress.services import get_course_progress

        return get_course_progress(self, cours)


class Enseignant(User):
    objects = EnseignantManager()

    class Meta:
        proxy = True
        verbose_name = "Enseignant"
        verbose_name_plural = "Enseignants"

    def save(self, *args, **kwargs):
        self.role = User.Role.TEACHER
        return super().save(*args, **kwargs)

    def creerCours(self, **attributs):
        from courses.models import Course

        return Course.creer(self, **attributs)

    def modifierCours(self, cours, **attributs):
        if cours.teacher_id != self.pk:
            raise PermissionError("Un enseignant ne peut modifier que ses cours.")
        return cours.modifier(**attributs)

    def supprimerCours(self, cours):
        if cours.teacher_id != self.pk:
            raise PermissionError("Un enseignant ne peut supprimer que ses cours.")
        cours.delete()

    def consulterCours(self):
        return self.courses.all()

    def creerQuiz(self, **attributs):
        from quizzes.models import Quiz

        return Quiz.creer(self, **attributs)

    def modifierQuiz(self, quiz, **attributs):
        if quiz.teacher_id != self.pk:
            raise PermissionError("Un enseignant ne peut modifier que ses quiz.")
        return quiz.modifier(**attributs)

    def supprimerQuiz(self, quiz):
        if quiz.teacher_id != self.pk:
            raise PermissionError("Un enseignant ne peut supprimer que ses quiz.")
        quiz.delete()

    def consulterQuiz(self):
        return self.quizzes.all()

    def consulterResultats(self, quiz=None):
        from quizzes.models import QuizAttempt

        attempts = QuizAttempt.objects.filter(
            quiz__teacher=self,
            completed_at__isnull=False,
        )
        return attempts.filter(quiz=quiz) if quiz is not None else attempts

    def consulterDashboard(self):
        return {
            "cours": self.courses.count(),
            "quiz": self.quizzes.count(),
        }


Utilisateur = User
