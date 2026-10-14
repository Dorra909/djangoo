from datetime import timedelta
from pathlib import Path

import environ


BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(
        list,
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8443",
            "http://127.0.0.1:8443",
        ],
    ),
)
environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

SECRET_KEY = env(
    "SECRET_KEY",
    default="unsafe-local-development-key-for-local-use-only-32-bytes",
)
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
TIME_ZONE = env("TIME_ZONE", default="Europe/Paris")
USE_I18N = True
USE_TZ = True
LANGUAGE_CODE = "fr-fr"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "accounts",
    "courses",
    "quizzes",
    "progress",
    "complaints",
    "chatbot",
    "rag",
    "dashboard",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if env("DATABASE_ENGINE", default="").lower() == "sqlserver":
    DATABASES = {
        "default": {
            "ENGINE": "mssql",
            "NAME": env("DATABASE_NAME", default="EduLearnDB"),
            "HOST": env(
                "DATABASE_HOST",
                default="DESKTOP-4V3M1LD\\SQLEXPRESS",
            ),
            "PORT": "",
            "USER": "",
            "PASSWORD": "",
            "Trusted_Connection": "yes",
            "OPTIONS": {
                "driver": env(
                    "ODBC_DRIVER",
                    default="ODBC Driver 18 for SQL Server",
                ),
                "extra_params": "TrustServerCertificate=yes",
            },
        }
    }
else:
    DATABASES = {
        "default": env.db(
            "DATABASE_URL",
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        )
    }
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    DATABASES["default"]["OPTIONS"] = {"timeout": 20}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
GROQ_API_KEY = env("GROQ_API_KEY", default="")
GROQ_MODEL = env("GROQ_MODEL", default="qwen/qwen3.8-27b")
GROQ_TIMEOUT = env.float("GROQ_TIMEOUT", default=30.0)
RAG_EMBEDDING_MODEL = env(
    "RAG_EMBEDDING_MODEL",
    default="paraphrase-multilingual-MiniLM-L12-v2",
)
RAG_VECTORSTORE_PATH = env(
    "RAG_VECTORSTORE_PATH",
    default=str(MEDIA_ROOT / "vectorstore"),
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/minute",
        "ai": "10/minute",
        "chatbot": "10/minute",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "EduLearn API",
    "DESCRIPTION": "REST API for the EduLearn e-learning platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": "accounts.models.User.Role",
        "ChatMessageRoleEnum": "chatbot.models.ChatMessage.Role",
        "QuestionTypeEnum": "quizzes.models.Question.Type",
    },
}
