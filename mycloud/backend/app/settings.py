import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def _split_csv_env(name: str):
    raw = os.getenv(name, "")
    items = [x.strip() for x in raw.replace(";", ",").split(",") if x.strip()]
    return items

def _validate_origins(name: str, values: list[str]) -> list[str]:
    """
    Пропускаем только origin-ы со схемой (http/https) и хостом.
    Отбрасываем мусор. Если список пуст — вернём пустой, а ниже подставим дефолт.
    """
    out = []
    for v in values:
        p = urlparse(v)
        if p.scheme in ("http", "https") and p.netloc:
            out.append(f"{p.scheme}://{p.netloc}")
    return out

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-please-change")
DEBUG = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
def _env_bool(name, default):
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes")
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE    = _env_bool("CSRF_COOKIE_SECURE",    not DEBUG)

ALLOWED_HOSTS = _split_csv_env("ALLOWED_HOSTS") or ["localhost", "127.0.0.1"]
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080").strip()
CORS_ALLOW_CREDENTIALS = True
_raw_cors = _split_csv_env("CORS_ALLOWED_ORIGINS")
_raw_csrf = _split_csv_env("CSRF_TRUSTED_ORIGINS")
if not _raw_cors:
    _raw_cors = [FRONTEND_ORIGIN]
if not _raw_csrf:
    _raw_csrf = [FRONTEND_ORIGIN]
CORS_ALLOWED_ORIGINS = _validate_origins("CORS_ALLOWED_ORIGINS", _raw_cors)
CSRF_TRUSTED_ORIGINS = _validate_origins("CSRF_TRUSTED_ORIGINS", _raw_csrf)
if not CORS_ALLOWED_ORIGINS:
    raise RuntimeError("CORS_ALLOWED_ORIGINS пуст или содержит некорректные значения. "
                       "пример: CORS_ALLOWED_ORIGINS=http://localhost:8080")
if not CSRF_TRUSTED_ORIGINS:
    raise RuntimeError("CSRF_TRUSTED_ORIGINS пуст или содержит некорректные значения. "
                       "пример: CSRF_TRUSTED_ORIGINS=http://localhost:8080")
CORS_ALLOW_CREDENTIALS = True



INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "app.users.apps.UsersConfig",
    "app.files.apps.FilesConfig",
    "app.links.apps.LinksConfig",
]


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "app.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "app.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "mycloud"),
        "USER": os.getenv("POSTGRES_USER", "mycloud"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "password"),
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": int(os.getenv("POSTGRES_PORT", "5432")),
    }
}

AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "EXCEPTION_HANDLER": "app.common.exceptions.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
 }

SPECTACULAR_SETTINGS = {
    "TITLE": "MyCloud API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MIN", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOW_ALL_ORIGINS = DEBUG

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_FILE_STORAGE = "app.core.storage.EncryptedFileSystemStorage"
MEDIA_ROOT = os.getenv("STORAGE_PATH", str(BASE_DIR / "storage"))
MEDIA_URL = "/media/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100")) * 1024 * 1024

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "dev-key-please-change")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s"
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "level": LOG_LEVEL,
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": str(LOG_DIR / "app.log"),
            "formatter": "standard",
            "level": LOG_LEVEL,
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": LOG_LEVEL,
    },
}


EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.example.com")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@mycloud.local")

USE_TLS = os.getenv("EMAIL_USE_TLS", "false").lower() in ("1", "true", "yes")
USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() in ("1", "true", "yes")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "0") or 0)

if USE_TLS and USE_SSL:
    raise ValueError("EMAIL_USE_TLS и EMAIL_USE_SSL взаимоисключительны — оставьте только один.")
if EMAIL_PORT in (465,) and USE_TLS:
    raise ValueError("Порт 465 используется с EMAIL_USE_SSL=True (а не TLS).")
if EMAIL_PORT in (587,) and USE_SSL:
    raise ValueError("Порт 587 используется с EMAIL_USE_TLS=True (а не SSL).")

EMAIL_USE_TLS = USE_TLS
EMAIL_USE_SSL = USE_SSL