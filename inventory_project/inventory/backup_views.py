# inventory/backup_views.py
"""
API views для управління резервним копіюванням.
"""

import os
import logging

from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from . import backup_service

logger = logging.getLogger("inventory")


class BackupListView(APIView):
    """Список бекапів (локальні + Google Drive)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        local_backups = backup_service.list_local_backups()

        gdrive_configured = backup_service.is_gdrive_configured()
        gdrive_authorized = (
            backup_service.is_gdrive_authorized() if gdrive_configured else False
        )
        gdrive_backups = []
        if gdrive_authorized:
            try:
                gdrive_backups = backup_service.list_gdrive_backups()
            except Exception as e:
                logger.error(f"Помилка отримання списку Google Drive: {e}")

        return Response(
            {
                "local": local_backups,
                "gdrive": gdrive_backups,
                "gdrive_configured": gdrive_configured,
                "gdrive_authorized": gdrive_authorized,
            }
        )


class BackupCreateView(APIView):
    """Створити бекап вручну."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        upload_to_gdrive = request.data.get("upload_to_gdrive", False)

        try:
            result = backup_service.create_full_backup(created_by=request.user)

            gdrive_info = None
            if upload_to_gdrive and backup_service.is_gdrive_authorized():
                try:
                    gdrive_info = backup_service.upload_to_gdrive(result["filepath"])
                except Exception as e:
                    logger.error(f"Помилка завантаження на Google Drive: {e}")
                    gdrive_info = {"error": str(e)}

            return Response(
                {
                    "filename": result["filename"],
                    "size": result["size"],
                    "counts": result["counts"],
                    "created_at": result["created_at"].isoformat(),
                    "gdrive": gdrive_info,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(f"Помилка створення бекапу: {e}")
            return Response(
                {"error": f"Помилка створення бекапу: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BackupContentsView(APIView):
    """Отримати вміст бекапу (метадані)."""

    permission_classes = [IsAdminUser]

    def get(self, request, filename):
        try:
            contents = backup_service.get_backup_contents(filename)
            return Response(contents)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except FileNotFoundError:
            return Response(
                {"error": "Файл не знайдено"}, status=status.HTTP_404_NOT_FOUND
            )


class BackupRestoreView(APIView):
    """Відновити дані з бекапу."""

    permission_classes = [IsAdminUser]

    def post(self, request, filename):
        mode = request.data.get("mode", "merge")  # merge | replace
        models = request.data.get("models", None)  # list або null = все

        if mode not in ("merge", "replace"):
            return Response(
                {"error": "Режим має бути merge або replace"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = backup_service.restore_from_backup(
                filename,
                models_to_restore=models,
                mode=mode,
            )
            total_restored = sum(r.get("count", 0) for r in results.values())
            total_errors = sum(r.get("errors", 0) for r in results.values())

            logger.info(
                f"Відновлення з {filename}: режим={mode}, "
                f"відновлено={total_restored}, помилок={total_errors}, "
                f"користувач={request.user}"
            )

            return Response(
                {
                    "results": results,
                    "total_restored": total_restored,
                    "total_errors": total_errors,
                }
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except FileNotFoundError:
            return Response(
                {"error": "Файл не знайдено"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Помилка відновлення з бекапу: {e}")
            return Response(
                {"error": f"Помилка відновлення: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BackupDownloadView(APIView):
    """Завантажити локальний бекап."""

    permission_classes = [IsAdminUser]

    def get(self, request, filename):
        if not filename.startswith("inventory_backup_") or ".." in filename:
            return Response(
                {"error": "Невалідне ім'я файлу"}, status=status.HTTP_400_BAD_REQUEST
            )

        filepath = os.path.join(backup_service.get_backup_dir(), filename)
        if not os.path.exists(filepath):
            return Response(
                {"error": "Файл не знайдено"}, status=status.HTTP_404_NOT_FOUND
            )

        return FileResponse(
            open(filepath, "rb"),
            as_attachment=True,
            filename=filename,
            content_type="application/zip",
        )


class BackupDeleteView(APIView):
    """Видалити бекап."""

    permission_classes = [IsAdminUser]

    def delete(self, request, filename):
        try:
            deleted = backup_service.delete_local_backup(filename)
            if deleted:
                return Response({"message": "Бекап видалено"})
            return Response(
                {"error": "Файл не знайдено"}, status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BackupUploadGDriveView(APIView):
    """Завантажити існуючий локальний бекап на Google Drive."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        filename = request.data.get("filename")
        if not filename:
            return Response(
                {"error": "Вкажіть filename"}, status=status.HTTP_400_BAD_REQUEST
            )

        filepath = os.path.join(backup_service.get_backup_dir(), filename)
        if not os.path.exists(filepath):
            return Response(
                {"error": "Файл не знайдено"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            result = backup_service.upload_to_gdrive(filepath, filename)
            return Response(result)
        except PermissionError:
            return Response(
                {"error": "Google Drive не авторизований"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as e:
            return Response(
                {"error": f"Помилка завантаження: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GDriveDeleteView(APIView):
    """Видалити бекап з Google Drive."""

    permission_classes = [IsAdminUser]

    def delete(self, request, file_id):
        try:
            backup_service.delete_gdrive_backup(file_id)
            return Response({"message": "Видалено з Google Drive"})
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GDriveStatusView(APIView):
    """Статус підключення Google Drive."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        configured = backup_service.is_gdrive_configured()
        authorized = backup_service.is_gdrive_authorized() if configured else False

        result = {
            "configured": configured,
            "authorized": authorized,
        }

        if configured and not authorized:
            try:
                result["auth_url"] = backup_service.get_gdrive_auth_url()
            except Exception as e:
                result["auth_error"] = str(e)

        return Response(result)


class GDriveAuthorizeView(APIView):
    """Авторизувати Google Drive з кодом."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "Вкажіть код авторизації"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            backup_service.authorize_gdrive(code)
            return Response({"message": "Google Drive авторизований успішно"})
        except Exception as e:
            return Response(
                {"error": f"Помилка авторизації: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GDriveUploadCredentialsView(APIView):
    """Завантажити файл google_credentials.json."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "Завантажте файл credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import json

            content = file.read().decode("utf-8")
            json.loads(content)  # валідація JSON

            creds_path = backup_service._get_gdrive_credentials_path()
            with open(creds_path, "w", encoding="utf-8") as f:
                f.write(content)

            return Response({"message": "Credentials збережено"})
        except json.JSONDecodeError:
            return Response(
                {"error": "Невалідний JSON файл"}, status=status.HTTP_400_BAD_REQUEST
            )


class BackupSettingsView(APIView):
    """Налаштування автобекапу."""

    permission_classes = [IsAdminUser]

    SETTINGS_FILE = os.path.join(
        getattr(__import__("django.conf", fromlist=["settings"]), "BASE_DIR", "."),
        "backup_settings.json",
    )

    def _get_settings_path(self):
        from django.conf import settings as dj_settings

        return os.path.join(dj_settings.BASE_DIR, "backup_settings.json")

    def _load_settings(self):
        import json

        path = self._get_settings_path()
        defaults = {
            "auto_backup": True,
            "auto_upload_gdrive": False,
            "interval_hours": 24,
            "max_local_backups": 30,
            "max_age_days": 30,
        }
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    saved = json.load(f)
                defaults.update(saved)
            except Exception:
                pass
        return defaults

    def _save_settings(self, data):
        import json

        path = self._get_settings_path()
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def get(self, request):
        return Response(self._load_settings())

    def put(self, request):
        current = self._load_settings()
        for key in [
            "auto_backup",
            "auto_upload_gdrive",
            "interval_hours",
            "max_local_backups",
            "max_age_days",
        ]:
            if key in request.data:
                current[key] = request.data[key]
        self._save_settings(current)
        return Response(current)
