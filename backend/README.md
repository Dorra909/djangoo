# EduLearn backend

Django REST API for the EduLearn frontend. The API is served at `/api/` and the OpenAPI/Swagger interface is available at `/api/docs/`.

## Requirements

- Python 3.12
- pip

## Local setup

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Configure a strong `SECRET_KEY` in `.env` outside local development. The default `DATABASE_URL` uses SQLite. For PostgreSQL, set a URL such as `postgresql://user:password@localhost:5432/edulearn`.

The development API permits the Vite origin `http://localhost:5173` by default. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list to add origins.

## Tests

```powershell
pytest
```

## Authentication

Login uses email and password and returns `{access, refresh, user}`. Send the access token as `Authorization: Bearer <access>`. Refresh rotation and blacklist-after-rotation are enabled; authenticated logout blacklists the supplied refresh token.

Public registration only permits teacher and student roles. Admin-created accounts are managed through `/api/users/`.
