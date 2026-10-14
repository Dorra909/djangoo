from django.conf import settings
from django.db import models


class Complaint(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        RESOLVED = "RESOLVED", "Resolved"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    subject = models.CharField(max_length=200)
    category = models.CharField(max_length=80)
    message = models.TextField()
    priority = models.CharField(max_length=20, default="Normale")
    attachment = models.FileField(upload_to="complaints/", blank=True, null=True)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.OPEN,
    )
    admin_reply = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.subject

    @property
    def sujet(self):
        return self.subject

    @sujet.setter
    def sujet(self, value):
        self.subject = value

    @property
    def description(self):
        return self.message

    @description.setter
    def description(self, value):
        self.message = value

    @property
    def dateCreation(self):
        return self.created_at

    @property
    def dateTraitement(self):
        return self.updated_at

    @property
    def statut(self):
        return self.status

    @statut.setter
    def statut(self, value):
        self.status = value

    @property
    def priorite(self):
        return self.priority

    @priorite.setter
    def priorite(self, value):
        self.priority = value

    @property
    def reponse(self):
        return self.admin_reply

    @reponse.setter
    def reponse(self, value):
        self.admin_reply = value

    @classmethod
    def creer(cls, **attributs):
        field_map = {
            "sujet": "subject",
            "description": "message",
            "statut": "status",
            "priorite": "priority",
            "reponse": "admin_reply",
        }
        return cls.objects.create(
            **{field_map.get(name, name): value for name, value in attributs.items()}
        )

    @classmethod
    def consulter(cls):
        return cls.objects.all()

    def traiter(self, statut=None, reponse=None):
        if statut is not None:
            self.status = statut
        if reponse is not None:
            self.admin_reply = reponse
        self.save()
        return self


Reclamation = Complaint
