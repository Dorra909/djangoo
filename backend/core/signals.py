from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from accounts.models import User
from complaints.models import Complaint
from courses.models import Enrollment
from core.models import Notification
from quizzes.models import QuizAttempt


@receiver(post_save, sender=User)
def notify_new_user(sender, instance, created, **kwargs):
    if created and instance.role != User.Role.ADMIN:
        Notification.objects.create(
            user=instance,
            title="Bienvenue sur EduLearn",
            message="Votre compte a été créé avec succès.",
        )


@receiver(post_save, sender=Enrollment)
def notify_enrollment(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.student,
            title="Inscription confirmée",
            message=f"Vous êtes inscrit au cours « {instance.course.title} ».",
        )


@receiver(pre_save, sender=Complaint)
def capture_complaint_changes(sender, instance, **kwargs):
    if instance.pk:
        previous = sender.objects.filter(pk=instance.pk).values(
            "status",
            "admin_reply",
        ).first()
        instance._previous_status = previous["status"] if previous else None
        instance._previous_admin_reply = previous["admin_reply"] if previous else None
    else:
        instance._previous_status = None
        instance._previous_admin_reply = None


@receiver(post_save, sender=Complaint)
def notify_complaint_change(sender, instance, created, **kwargs):
    if created:
        return
    if (
        instance.status != instance._previous_status
        or instance.admin_reply != instance._previous_admin_reply
    ):
        Notification.objects.create(
            user=instance.author,
            title="Mise à jour de votre réclamation",
            message=f"Votre réclamation « {instance.subject} » a été mise à jour.",
        )


@receiver(pre_save, sender=QuizAttempt)
def capture_attempt_completion(sender, instance, **kwargs):
    instance._was_completed = False
    if instance.pk:
        instance._was_completed = sender.objects.filter(
            pk=instance.pk,
            completed_at__isnull=False,
        ).exists()


@receiver(post_save, sender=QuizAttempt)
def notify_quiz_result(sender, instance, **kwargs):
    if instance.completed_at and not instance._was_completed:
        Notification.objects.create(
            user=instance.student,
            title="Résultat du quiz",
            message=f"Votre résultat pour « {instance.quiz.title} » est disponible : {instance.score}%.",
        )
