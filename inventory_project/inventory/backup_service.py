# inventory/backup_service.py
"""
Сервіс резервного копіювання з підтримкою Google Drive.
"""

import json
import logging
import os
import zipfile
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import serializers
from django.utils import timezone

logger = logging.getLogger("inventory")

BACKUP_DIR = os.path.join(settings.BASE_DIR, "backups")


def get_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    return BACKUP_DIR


def create_full_backup(created_by=None, include_models=None):
    """
    Створити повний бекап бази даних у ZIP-архів.
    Повертає dict з інформацією про бекап.
    """
    from licenses.models import License

    from .models import (
        Equipment,
        Notification,
        PeripheralDevice,
        Software,
    )
    from .password_management import System, SystemAccount, SystemCategory
    from .spare_parts import (
        PurchaseOrder,
        SparePart,
        SparePartCategory,
        StorageLocation,
        Supplier,
    )

    backup_dir = get_backup_dir()
    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"inventory_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, zip_filename)

    all_models = {
        "equipment": Equipment,
        "notifications": Notification,
        "software": Software,
        "peripherals": PeripheralDevice,
        "licenses": License,
        "spare_parts": SparePart,
        "spare_part_categories": SparePartCategory,
        "suppliers": Supplier,
        "purchase_orders": PurchaseOrder,
        "storage_locations": StorageLocation,
        "password_categories": SystemCategory,
        "password_systems": System,
        "password_accounts": SystemAccount,
    }

    if include_models:
        all_models = {k: v for k, v in all_models.items() if k in include_models}

    User = get_user_model()
    counts = {}

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Бекап користувачів
        user_data = serializers.serialize("json", User.objects.all())
        zf.writestr("users.json", user_data)
        counts["users"] = User.objects.count()

        # Бекап кожної моделі
        for name, model in all_models.items():
            try:
                data = serializers.serialize("json", model.objects.all())
                zf.writestr(f"{name}.json", data)
                counts[name] = model.objects.count()
            except Exception as e:
                logger.warning(f"Не вдалося серіалізувати {name}: {e}")
                counts[name] = 0

        # Метадані
        meta = {
            "created_at": timezone.now().isoformat(),
            "created_by": str(created_by) if created_by else "system",
            "django_version": __import__("django").get_version(),
            "counts": counts,
        }
        zf.writestr("_meta.json", json.dumps(meta, ensure_ascii=False, indent=2))

    file_size = os.path.getsize(zip_path)

    logger.info(f"Створено бекап: {zip_filename} ({file_size} байт)")

    return {
        "filename": zip_filename,
        "filepath": zip_path,
        "size": file_size,
        "counts": counts,
        "created_at": timezone.now(),
    }


def list_local_backups():
    """Повернути список локальних бекапів."""
    backup_dir = get_backup_dir()
    backups = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        if f.endswith(".zip") and f.startswith("inventory_backup_"):
            fpath = os.path.join(backup_dir, f)
            stat = os.stat(fpath)
            backups.append(
                {
                    "filename": f,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                }
            )
    return backups


def get_backup_contents(filename):
    """Отримати вміст бекапу (метадані та список файлів)."""
    if not filename.startswith("inventory_backup_") or ".." in filename:
        raise ValueError("Невалідне ім'я файлу")
    fpath = os.path.join(get_backup_dir(), filename)
    if not os.path.exists(fpath):
        raise FileNotFoundError("Файл не знайдено")

    with zipfile.ZipFile(fpath, "r") as zf:
        files = []
        meta = {}
        for info in zf.infolist():
            if info.filename == "_meta.json":
                meta = json.loads(zf.read(info.filename).decode("utf-8"))
            else:
                files.append(
                    {
                        "name": info.filename,
                        "size": info.file_size,
                    }
                )
        return {
            "meta": meta,
            "files": files,
        }


def restore_from_backup(filename, models_to_restore=None, mode="merge"):
    """
    Відновити дані з бекапу.

    mode:
        'merge'   — додати/оновити записи (існуючі не видаляються)
        'replace' — повна заміна (видалити все + завантажити з бекапу)

    models_to_restore: список ключів (equipment, software, ...) або None = все.
    Повертає dict з результатами по кожній моделі.
    """
    from django.core import serializers as dj_serializers
    from django.db import transaction

    if not filename.startswith("inventory_backup_") or ".." in filename:
        raise ValueError("Невалідне ім'я файлу")
    fpath = os.path.join(get_backup_dir(), filename)
    if not os.path.exists(fpath):
        raise FileNotFoundError("Файл не знайдено")

    # Мапа ім'я_файлу -> модель (для режиму replace)
    from licenses.models import License

    from .models import Equipment, Notification, PeripheralDevice, Software
    from .password_management import System, SystemAccount, SystemCategory
    from .spare_parts import (
        PurchaseOrder,
        SparePart,
        SparePartCategory,
        StorageLocation,
        Supplier,
    )

    model_map = {
        "equipment": Equipment,
        "notifications": Notification,
        "software": Software,
        "peripherals": PeripheralDevice,
        "licenses": License,
        "spare_parts": SparePart,
        "spare_part_categories": SparePartCategory,
        "suppliers": Supplier,
        "purchase_orders": PurchaseOrder,
        "storage_locations": StorageLocation,
        "password_categories": SystemCategory,
        "password_systems": System,
        "password_accounts": SystemAccount,
    }

    # Порядок відновлення (залежності спершу)
    restore_order = [
        "users",
        "spare_part_categories",
        "storage_locations",
        "suppliers",
        "password_categories",
        "password_systems",
        "password_accounts",
        "equipment",
        "software",
        "peripherals",
        "licenses",
        "notifications",
        "spare_parts",
        "purchase_orders",
    ]

    results = {}

    with zipfile.ZipFile(fpath, "r") as zf:
        with transaction.atomic():
            for key in restore_order:
                json_file = f"{key}.json"
                if json_file not in [i.filename for i in zf.infolist()]:
                    continue
                if models_to_restore and key not in models_to_restore:
                    continue

                try:
                    raw_data = zf.read(json_file).decode("utf-8")
                    objects = list(dj_serializers.deserialize("json", raw_data))

                    if not objects:
                        results[key] = {
                            "status": "skip",
                            "count": 0,
                            "message": "Немає даних",
                        }
                        continue

                    if mode == "replace" and key != "users" and key in model_map:
                        deleted_count = model_map[key].objects.all().delete()[0]
                        logger.info(
                            f"Restore replace: видалено {deleted_count} записів {key}"
                        )

                    saved = 0
                    errors = 0
                    for obj in objects:
                        try:
                            if key == "users":
                                # Користувачів оновлюємо тільки якщо вони вже існують
                                # або створюємо нових (без зміни паролів існуючих)
                                User = get_user_model()
                                existing = User.objects.filter(pk=obj.object.pk).first()
                                if existing and mode == "merge":
                                    saved += 1
                                    continue
                            obj.save()
                            saved += 1
                        except Exception as e:
                            errors += 1
                            logger.warning(
                                f"Restore {key}: помилка збереження об'єкта: {e}"
                            )

                    results[key] = {
                        "status": "ok",
                        "count": saved,
                        "errors": errors,
                    }
                    logger.info(f"Restore {key}: збережено {saved}, помилок {errors}")

                except Exception as e:
                    results[key] = {"status": "error", "count": 0, "message": str(e)}
                    logger.error(f"Restore {key}: {e}")

    return results


def delete_local_backup(filename):
    """Видалити локальний бекап."""
    if not filename.startswith("inventory_backup_") or ".." in filename:
        raise ValueError("Невалідне ім'я файлу")
    fpath = os.path.join(get_backup_dir(), filename)
    if os.path.exists(fpath):
        os.remove(fpath)
        return True
    return False


def cleanup_old_backups(max_age_days=30, max_count=50):
    """Видалити старі бекапи."""
    backup_dir = get_backup_dir()
    cutoff = timezone.now() - timedelta(days=max_age_days)
    removed = 0

    backups = []
    for f in os.listdir(backup_dir):
        if f.endswith(".zip") and f.startswith("inventory_backup_"):
            fpath = os.path.join(backup_dir, f)
            backups.append((fpath, os.path.getctime(fpath)))

    backups.sort(key=lambda x: x[1], reverse=True)

    for i, (fpath, ctime) in enumerate(backups):
        file_time = datetime.fromtimestamp(ctime)
        if file_time < cutoff.replace(tzinfo=None) or i >= max_count:
            os.remove(fpath)
            removed += 1

    return removed


# ========== GOOGLE DRIVE ==========

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
GDRIVE_FOLDER_NAME = "IT-Inventory-Backups"


def _get_gdrive_credentials_path():
    return os.path.join(settings.BASE_DIR, "google_credentials.json")


def _get_gdrive_token_path():
    return os.path.join(settings.BASE_DIR, "google_token.json")


def is_gdrive_configured():
    """Перевірити чи налаштований Google Drive."""
    return os.path.exists(_get_gdrive_credentials_path())


def is_gdrive_authorized():
    """Перевірити чи є дійсний токен Google Drive."""
    token_path = _get_gdrive_token_path()
    if not os.path.exists(token_path):
        return False
    try:
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        return creds and creds.valid
    except Exception:
        return False


def get_gdrive_auth_url():
    """Отримати URL для авторизації Google Drive."""
    from google_auth_oauthlib.flow import Flow

    creds_path = _get_gdrive_credentials_path()
    if not os.path.exists(creds_path):
        raise FileNotFoundError("Файл google_credentials.json не знайдено")

    flow = Flow.from_client_secrets_file(
        creds_path, scopes=SCOPES, redirect_uri="urn:ietf:wg:oauth:2.0:oob"
    )
    auth_url, _ = flow.authorization_url(prompt="consent")
    return auth_url


def authorize_gdrive(auth_code):
    """Авторизувати Google Drive з кодом."""
    from google_auth_oauthlib.flow import Flow

    creds_path = _get_gdrive_credentials_path()
    flow = Flow.from_client_secrets_file(
        creds_path, scopes=SCOPES, redirect_uri="urn:ietf:wg:oauth:2.0:oob"
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials

    token_path = _get_gdrive_token_path()
    with open(token_path, "w") as f:
        f.write(creds.to_json())

    return True


def _get_gdrive_service():
    """Отримати сервіс Google Drive API."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    token_path = _get_gdrive_token_path()
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build("drive", "v3", credentials=creds)


def _get_or_create_gdrive_folder(service):
    """Отримати або створити папку для бекапів на Google Drive."""
    query = f"name='{GDRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    files = results.get("files", [])

    if files:
        return files[0]["id"]

    folder_metadata = {
        "name": GDRIVE_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=folder_metadata, fields="id").execute()
    return folder["id"]


def upload_to_gdrive(filepath, filename=None):
    """Завантажити файл на Google Drive."""
    from googleapiclient.http import MediaFileUpload

    if not is_gdrive_authorized():
        raise PermissionError("Google Drive не авторизований")

    service = _get_gdrive_service()
    folder_id = _get_or_create_gdrive_folder(service)

    if not filename:
        filename = os.path.basename(filepath)

    file_metadata = {"name": filename, "parents": [folder_id]}
    media = MediaFileUpload(filepath, mimetype="application/zip", resumable=True)
    file = (
        service.files()
        .create(
            body=file_metadata, media_body=media, fields="id, name, size, webViewLink"
        )
        .execute()
    )

    logger.info(f"Завантажено на Google Drive: {file.get('name')}")

    return {
        "id": file.get("id"),
        "name": file.get("name"),
        "size": file.get("size"),
        "link": file.get("webViewLink"),
    }


def list_gdrive_backups():
    """Отримати список бекапів з Google Drive."""
    if not is_gdrive_authorized():
        return []

    service = _get_gdrive_service()
    folder_id = _get_or_create_gdrive_folder(service)

    query = f"'{folder_id}' in parents and trashed=false"
    results = (
        service.files()
        .list(
            q=query,
            fields="files(id, name, size, createdTime, webViewLink)",
            orderBy="createdTime desc",
            pageSize=50,
        )
        .execute()
    )

    return [
        {
            "id": f["id"],
            "filename": f["name"],
            "size": int(f.get("size", 0)),
            "created_at": f.get("createdTime", ""),
            "link": f.get("webViewLink", ""),
        }
        for f in results.get("files", [])
    ]


def delete_gdrive_backup(file_id):
    """Видалити бекап з Google Drive."""
    if not is_gdrive_authorized():
        raise PermissionError("Google Drive не авторизований")

    service = _get_gdrive_service()
    service.files().delete(fileId=file_id).execute()
    return True
