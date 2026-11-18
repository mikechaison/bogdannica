"""
Django settings for the Encyclopedia Bogdannica backend (project ``core``).
"""

from datetime import timedelta
from pathlib import Path

import os

import dj_database_url
from dotenv import load_dotenv

BASE_DIR: Path = Path(__file__).resolve().parent.parent

# Load variables from backend/.env (if present) into the environment.
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


SECRET_KEY: str = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me-in-production",
)

DEBUG: bool = env_bool("DJANGO_DEBUG", default=True)

if not DEBUG and SECRET_KEY.startswith("django-insecure-"):
    raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false.")

ALLOWED_HOSTS: list[str] = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])


# Application definition

INSTALLED_APPS: list[str] = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Local
    "accounts",
    "memes",
]

MIDDLEWARE: list[str] = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise serves collected static files (admin CSS/JS) without a separate web server.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # CorsMiddleware must come before any middleware that can generate responses.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

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

WSGI_APPLICATION = "core.wsgi.application"


# Database
#
# Production sets DATABASE_URL (e.g. postgres://user:pass@host:5432/dbname) and the
# managed database is used. Without it, development falls back to local SQLite.

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=env_bool("DATABASE_SSL_REQUIRE", default=False),
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static & media files

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Uploaded images (Article.image, Image files).
#
# When AWS_STORAGE_BUCKET_NAME is set, uploads go to an S3-compatible bucket via
# django-storages (AWS S3, Cloudflare R2, Backblaze B2, MinIO, ...). Otherwise they
# live under backend/media/ and are served by Django itself in development only.
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

AWS_STORAGE_BUCKET_NAME: str = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
USE_S3_MEDIA: bool = bool(AWS_STORAGE_BUCKET_NAME)

if USE_S3_MEDIA:
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_REGION_NAME: str = os.getenv("AWS_S3_REGION_NAME", "auto")
    # Custom endpoint for non-AWS providers, e.g. https://<account>.r2.cloudflarestorage.com
    AWS_S3_ENDPOINT_URL: str | None = os.getenv("AWS_S3_ENDPOINT_URL") or None
    # Public hostname files are served from (CDN or public bucket domain), no scheme.
    AWS_S3_CUSTOM_DOMAIN: str | None = os.getenv("AWS_S3_CUSTOM_DOMAIN") or None
    AWS_LOCATION: str = os.getenv("AWS_LOCATION", "media")
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    # Public bucket => plain URLs; private bucket => signed URLs that expire.
    AWS_QUERYSTRING_AUTH: bool = env_bool("AWS_QUERYSTRING_AUTH", default=False)
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

    _default_storage = {"BACKEND": "storages.backends.s3.S3Storage"}
else:
    _default_storage = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {
            "location": MEDIA_ROOT,
            "base_url": MEDIA_URL,
        },
    }

STORAGES = {
    "default": _default_storage,
    "staticfiles": {
        # Hashed filenames + gzip/brotli pre-compression, served by WhiteNoise.
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Cap upload size (10 MiB) for in-memory handling; larger files stream to disk.
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS — local React dev server (Vite)

CORS_ALLOWED_ORIGINS: list[str] = env_list(
    "CORS_ALLOWED_ORIGINS",
    ["http://localhost:5173", "http://127.0.0.1:5173"],
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS: list[str] = CORS_ALLOWED_ORIGINS


# Security (production only; the host's reverse proxy terminates TLS)

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = False
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"


# Logging — plain stdout so the hosting platform captures it.

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.getenv("DJANGO_LOG_LEVEL", "INFO")},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}


# Django REST Framework

REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_RATES": {"comments": "30/hour"},
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "memes.pagination.StandardPagination",
    "PAGE_SIZE": 20,
}


# Site URLs (used in e-mails)

BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


# E-mail — registration applications are sent to superusers.
# Defaults to the console backend in development; set EMAIL_HOST to use SMTP.

ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
DEFAULT_FROM_EMAIL: str = os.getenv("DEFAULT_FROM_EMAIL", "Bogdannica <noreply@bogdannica.local>")

EMAIL_HOST: str = os.getenv("EMAIL_HOST", "")
if EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
    EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", default=False)
else:
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")


# Simple JWT

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
