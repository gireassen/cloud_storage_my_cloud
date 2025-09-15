# MyCloud — файловое облако

## Возможности

### Пользователь

* Регистрация с валидацией:

  * **логин**: латиница+цифры, первая — буква, 4–20 символов;
  * **email**: валидный формат;
  * **пароль**: ≥6 символов, минимум 1 заглавная, 1 цифра, 1 спецсимвол.
* Вход/выход, страница профиля.
* Загрузка файлов с комментарием.
* Список файлов: имя, описание, **читаемый размер**, дата загрузки, дата последнего скачивания, количество скачиваний.
* Операции: скачивание, удаление, переименование, правка описания, **публичная ссылка** (копирование в буфер).

### Администратор

* Список пользователей: логин, ФИО, email, админ.
* Управление: удаление, назначение/снятие админ-прав.
* Просмотр/скачивание/удаление файлов **любого** пользователя.

---

## Архитектура

* **Frontend**: React SPA (общается с API, отображает страницы без перезагрузок).
* **Backend**: Django + DRF, JSON REST API.
* **БД**: PostgreSQL.
* **Файлы**: сохраняются на сервере под уникальными именами, каталогизация по дате/пользователю; содержимое **зашифровано** (Fernet); при отдаче — расшифровка на лету.
* **Аутентификация**: JWT (SimpleJWT): `POST /api/token/`, `GET /api/auth/me/`.
* **Документация API**: drf-spectacular (Swagger/Redoc).

---

## Структура репозитория

```
.
├── .env.example                 # пример настроек окружения
├── .env                         # настройки
├── docker-compose.yml           # контейнеры: frontend, backend, db
├── README.md                    
├── pgdata/                      # том/папка для данных Postgres (локально)
└── mycloud/                     # исходники Django-проекта
    ├── manage.py
    ├── mycloud/                 # django settings, urls, wsgi/asgi
    │   ├── settings.py
    │   ├── urls.py
    │   └── ...
    └── app/
        ├── core/                # EncryptedFileSystemStorage, utils
        ├── common/              # permissions, вспомогательное
        ├── users/               # пользователи/регистрация/логин
        ├── files/               # модели и API для файлов
        ├── links/               # публичные ссылки (токены)
        └── templates/static     
```
> Фронтенд встроен (монорепо), сборка складывает артефакты в статические файлы бекенда.

---

## Требования

* Docker или Podman (или Python 3.11+, Node 18+ для ручного запуска).
* PostgreSQL 14+ (в контейнере или локально).
* OpenSSL (для генерации ключей, опционально).

---

## Быстрый старт (Docker/Podman)

1. Скопируйте `.env.example` → `.env` и заполните:

```bash
cp .env.example .env
```

Минимальный набор (пример):

```env
POSTGRES_DB=mycloud
POSTGRES_USER=mycloud
POSTGRES_PASSWORD=mycloud
POSTGRES_HOST=db
POSTGRES_PORT=5432

SECRET_KEY=change-me
# Сгенерируйте ключ шифрования (Fernet) и вставьте сюда:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-generated-fernet-key

# лимит на бэкенде (МБ)
MAX_UPLOAD_SIZE_MB=100
```

2. Запуск (выберите ваш инструмент):

**Docker Compose**

```bash
docker compose up --build
```

**Podman Compose**

```bash
podman compose up --build
```
>! МИГРАЦИИ И СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ ПРОИСХОДИТ ПРИ БИЛДЕ (см. `.mycloud/backend/entrypoint.sh`)

3. Зайдите в приложение:

* SPA: `http://localhost:8080/` (если фронтенд проксируется через nginx)
  или `http://localhost:8000/` (если фронтенд встроен и обслуживается Django).
* Swagger: `http://localhost:8000/api/schema/swagger-ui/`
* Redoc: `http://localhost:8000/api/schema/redoc/`

---

## Ручной запуск без контейнеров

### Бэкенд

```bash
cd mycloud
python -m venv .venv
source .venv/bin/activate
pip install -U pip wheel
pip install -r requirements.txt

# Настройте .env (см. выше) и переменные окружения
export DJANGO_SETTINGS_MODULE=mycloud.settings
export PYTHONPATH=$(pwd)

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### База данных

* Поднимите PostgreSQL локально и создайте БД/пользователя, соответствующих `.env`:

```sql
CREATE DATABASE mycloud;
CREATE USER mycloud WITH PASSWORD 'mycloud';
GRANT ALL PRIVILEGES ON DATABASE mycloud TO mycloud;
```

---

## Переменные окружения

| Переменная           | Значение/пример | Назначение                     |
| -------------------- | --------------- | ------------------------------ |
| `POSTGRES_DB`        | `mycloud`       | Имя БД                         |
| `POSTGRES_USER`      | `mycloud`       | Пользователь БД                |
| `POSTGRES_PASSWORD`  | `mycloud`       | Пароль БД                      |
| `POSTGRES_HOST`      | `db`            | Хост БД                        |
| `POSTGRES_PORT`      | `5432`          | Порт БД                        |
| `SECRET_KEY`         | `change-me`     | Секрет Django                  |
| `ENCRYPTION_KEY`     | `gAAAA...`      | Ключ Fernet (см. команду ниже) |
| `MAX_UPLOAD_SIZE_MB` | `100`           | Серверный лимит загрузки в МБ  |
| `ALLOWED_HOSTS`      | `*`             | Разрешённые хосты              |
| `DEBUG`              | `1` или `0`     | Режим отладки                  |

Сгенерировать `ENCRYPTION_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Nginx и лимиты загрузки

Если используете nginx в качестве фронта, увеличьте лимит **тела запроса** под ваш `MAX_UPLOAD_SIZE_MB`:

```nginx
server {
    listen 8080;
    server_name _;

    # для 100 МБ
    client_max_body_size 100m;

    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> Если `MAX_UPLOAD_SIZE_MB=100`, то и `client_max_body_size` должен быть **не меньше** 100m, иначе получите `413 Request Entity Too Large`.

---

## API и документация

Swagger-UI: `http://localhost:8000/api/schema/swagger-ui/`
Redoc: `http://localhost:8000/api/schema/redoc/`

Частые точки:

* `POST /api/token/` — получить JWT (`access`, `refresh`).
* `GET /api/auth/me/` — текущий пользователь.
* `GET /api/files/` — список файлов пользователя.
* `POST /api/files/` — загрузка файла (multipart form: `file`, `description?`).
* `GET /api/files/{id}/download/` — скачать свой файл.
* `DELETE /api/files/{id}/` — удалить.
* `PATCH /api/files/{id}/` — переименовать/изменить описание.
* `POST /api/links/` — создать публичную ссылку `{ file_id }`.
* `GET /api/public/{token}/` — скачать по публичной ссылке (атач с оригинальным именем).
* `GET /api/admin/users/`, `GET /api/admin/files/` — только для админов.

### Примеры `curl`

Авторизация:

```bash
curl -s X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"***"}'
```

Загрузка файла:

```bash
ACCESS=eyJhbGc...   # токен
curl -X POST http://localhost:8000/api/files/ \
  -H "Authorization: Bearer $ACCESS" \
  -F "file=@/path/to/local/file.pdf" \
  -F "description=Документ"
```

Публичная ссылка:

```bash
curl -X POST http://localhost:8000/api/links/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"file_id": 42}'
# → {"url":"/api/public/<token>/"}
```

Скачать по публичной ссылке:

```bash
curl -L "http://localhost:8000/api/public/<token>/" -o out.bin
```

---

## Подсказки по интерфейсу

* Поля регистрации валидируются на клиенте и сервере; при ошибке показывается причина под полем.
* Размеры файлов показываются в «удобном» виде (Б/КБ/МБ/ГБ).
* Сортировка по столбцам доступна кликом по заголовку.
* Редактирование имени/описания — в **модальном окне** поверх страницы, фон затемняется.
* Кнопка **«Ссылка»** создаёт токен и копирует полный URL в буфер.
* В админке есть видимые подсказки («i» или «?») возле потенциально неочевидных действий.

---

## Траблшутинг

**1) 413 Request Entity Too Large при загрузке**
Поднимите `client_max_body_size` в nginx (см. выше) до значения ≥ `MAX_UPLOAD_SIZE_MB`.

**2) `FileNotFoundError` при скачивании**
Причины:

* Файл удалён/том не смонтирован/путь `MEDIA_ROOT` изменился. Убедитесь, что папка хранения примонтирована в контейнер и не теряется при пересоздании.
* В БД осталась запись о файле, а физически его нет. Удалите запись или восстановите файл.

**3) Публичная ссылка 404**
Проверьте `urls.py` для публичного роутера: параметр должен называться **`token`**, а не `slug`, и тип должен позволять символы URL-safe base64 (`-`, `_`, `.`):

```python
path("api/public/<str:token>/", public_download, name="public-download")
```

**4) `HyperlinkedIdentityField requires the request in the serializer context`**
Проблема сериализатора ссылок. Создавай так:

```python
LinkSerializer(instance, context={"request": request})
```

**5) Ошибка `TypeError: 'NoneType' object is not iterable` в StreamingHttpResponse**
Передайте «файлоподобный» объект. Для зашифрованного хранилища используем:

```python
from django.http import FileResponse
fobj = storage.open_decrypted(name)  # ContentFile
return FileResponse(fobj, as_attachment=True, filename=original_name, content_type=ctype)
```

**6) Конфликты миграций («column already exists»)**

```bash
docker|podman compose exec backend python manage.py migrate links 0002_initial --fake
```

**7) 401/403 на действия админа**
Проверьте, что у пользователя `is_staff=True` (через админку/миграцию начальных данных).

## Схема БД и модели

Проект использует PostgreSQL. Основные сущности: **User**, **File**, **Link**.

### User (app.users.models)

Поля:

* `id` — PK
* `username` — уникальный логин (валидация: латиница, цифры, 4–20 символов, первая буква)
* `full_name` — полное имя
* `email` — уникальный e-mail
* `password` — хэш (Django `AbstractUser`)
* `is_staff` — админ
* `is_active` — активен
* `date_joined` — дата регистрации
* `storage_path` — путь к папке пользователя в хранилище (относительно общего `MEDIA_ROOT`)

### File (app.files.models)

Поля:

* `id` — PK
* `user` — FK → User
* `original_name` — имя файла, видимое пользователю
* `file` — путь/имя файла на диске (генерируется уникально)
* `size` — размер (байты)
* `description` — описание/комментарий
* `uploaded_at` — дата загрузки
* `last_downloaded_at` — дата последнего скачивания (nullable)
* `download_count` — количество скачиваний (default=0)

Особенности:

* файлы хранятся в `EncryptedFileSystemStorage` → физически на диске зашифрованы.
* при удалении записи файл физически удаляется.

### Link (app.links.models)

Поля:

* `id` — PK
* `file` — FK → File
* `token` — уникальный токен (base64/URL-safe), используется в публичной ссылке
* `created_by` — FK → User (создатель ссылки)
* `created_at` — дата создания

Особенности:

* публичная ссылка формата `/api/public/<token>/`.
* токен не содержит имени пользователя или имени файла.
* при скачивании по токену отдаются оригинальное имя и правильный Content-Type.

---
### Запуск тестов
```
# 1) Активируйте окружение
source .venv/bin/activate

# 2) Запустите миграции (для локальной БД, если используете)
python manage.py migrate

# 3) Запустите тесты
pytest

# Покрытие (опционально):
pytest --cov=app --cov-report=term-missing

```