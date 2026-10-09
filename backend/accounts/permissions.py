from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ENSEIGNANT"
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ETUDIANT"
        )


class IsOwnerOrAdmin(BasePermission):
    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user
