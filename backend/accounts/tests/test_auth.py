import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


User = get_user_model()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="student@example.com",
        password="Strong-pass-123!",
        full_name="Test Student",
        role=User.Role.STUDENT,
    )


@pytest.mark.django_db
def test_register_creates_teacher_and_returns_frontend_user_shape(client):
    response = client.post(
        "/api/auth/register/",
        {
            "fullName": "New Teacher",
            "email": "new.teacher@example.com",
            "password": "Strong-pass-123!",
            "role": "ENSEIGNANT",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["user"]["fullName"] == "New Teacher"
    assert response.data["user"]["role"] == "ENSEIGNANT"
    assert response.data["user"]["isActive"] is True
    assert "password" not in response.data["user"]


@pytest.mark.django_db
def test_register_rejects_admin_role(client):
    response = client.post(
        "/api/auth/register/",
        {
            "fullName": "Unexpected Admin",
            "email": "admin2@example.com",
            "password": "Strong-pass-123!",
            "role": "ADMIN",
        },
        format="json",
    )

    assert response.status_code == 400
    assert set(response.data) == {"detail", "errors"}
    assert "role" in response.data["errors"]


@pytest.mark.django_db
def test_login_returns_access_refresh_and_serialized_user(client, student):
    response = client.post(
        "/api/auth/login/",
        {"email": student.email, "password": "Strong-pass-123!"},
        format="json",
    )

    assert response.status_code == 200
    assert set(("access", "refresh", "user")).issubset(response.data)
    assert response.data["user"]["email"] == student.email
    assert response.data["user"]["fullName"] == student.full_name


@pytest.mark.django_db
def test_refresh_rotates_and_blacklists_the_previous_token(client, student):
    login_response = client.post(
        "/api/auth/login/",
        {"email": student.email, "password": "Strong-pass-123!"},
        format="json",
    )

    first_refresh = login_response.data["refresh"]
    refresh_response = client.post(
        "/api/auth/token/refresh/",
        {"refresh": first_refresh},
        format="json",
    )
    replay_response = client.post(
        "/api/auth/token/refresh/",
        {"refresh": first_refresh},
        format="json",
    )

    assert refresh_response.status_code == 200
    assert refresh_response.data["refresh"] != first_refresh
    assert replay_response.status_code == 401


@pytest.mark.django_db
def test_logout_blacklists_the_refresh_token(client, student):
    login_response = client.post(
        "/api/auth/login/",
        {"email": student.email, "password": "Strong-pass-123!"},
        format="json",
    )
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
    )

    logout_response = client.post(
        "/api/auth/logout/",
        {"refresh": login_response.data["refresh"]},
        format="json",
    )
    refresh_response = client.post(
        "/api/auth/token/refresh/",
        {"refresh": login_response.data["refresh"]},
        format="json",
    )

    assert logout_response.status_code == 200
    assert refresh_response.status_code == 401


@pytest.mark.django_db
def test_protected_profile_requires_authentication(client):
    response = client.get("/api/auth/me/")

    assert response.status_code == 401
    assert set(response.data) == {"detail", "errors"}


@pytest.mark.django_db
def test_authenticated_user_can_get_and_patch_profile(client, student):
    client.force_authenticate(student)

    get_response = client.get("/api/auth/me/")
    patch_response = client.patch(
        "/api/auth/me/",
        {"fullName": "Updated Student", "bio": "Learning every day."},
        format="json",
    )

    assert get_response.status_code == 200
    assert get_response.data["fullName"] == "Test Student"
    assert patch_response.status_code == 200
    assert patch_response.data["fullName"] == "Updated Student"
    assert patch_response.data["bio"] == "Learning every day."


@pytest.mark.django_db
def test_change_password_checks_current_password(client, student):
    client.force_authenticate(student)

    response = client.post(
        "/api/auth/change-password/",
        {
            "currentPassword": "Strong-pass-123!",
            "newPassword": "Another-strong-123!",
        },
        format="json",
    )

    student.refresh_from_db()
    assert response.status_code == 200
    assert student.check_password("Another-strong-123!")


@pytest.mark.django_db
def test_non_admin_roles_are_forbidden_from_admin_user_api(client):
    for role, email in (
        (User.Role.TEACHER, "teacher@example.com"),
        (User.Role.STUDENT, "student-role@example.com"),
    ):
        user = User.objects.create_user(
            email=email,
            password="Strong-pass-123!",
            full_name="Not Admin",
            role=role,
        )
        client.force_authenticate(user)
        response = client.get("/api/users/")
        assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_filter_users_and_toggle_active(client):
    admin_user = User.objects.create_user(
        email="admin@example.com",
        password="Strong-pass-123!",
        full_name="Test Admin",
        role=User.Role.ADMIN,
    )
    teacher = User.objects.create_user(
        email="teacher2@example.com",
        password="Strong-pass-123!",
        full_name="Test Teacher",
        role=User.Role.TEACHER,
    )
    client.force_authenticate(admin_user)

    list_response = client.get("/api/users/?role=ENSEIGNANT")
    update_response = client.patch(
        f"/api/users/{teacher.id}/active/",
        {"isActive": False},
        format="json",
    )

    assert list_response.status_code == 200
    assert list_response.data["count"] == 1
    assert list_response.data["results"][0]["role"] == "ENSEIGNANT"
    assert update_response.status_code == 200
    assert update_response.data["isActive"] is False


@pytest.mark.django_db
def test_admin_can_create_a_non_admin_account(client):
    admin_user = User.objects.create_user(
        email="admin-create@example.com",
        password="Strong-pass-123!",
        full_name="Test Admin",
        role=User.Role.ADMIN,
    )
    client.force_authenticate(admin_user)

    response = client.post(
        "/api/users/",
        {
            "email": "created.student@example.com",
            "fullName": "Created Student",
            "role": "ETUDIANT",
            "password": "Strong-pass-123!",
        },
        format="json",
    )

    assert response.status_code == 201
    created = User.objects.get(email="created.student@example.com")
    assert created.role == User.Role.STUDENT
    assert created.check_password("Strong-pass-123!")
