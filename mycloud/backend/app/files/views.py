import mimetypes
from django.http import StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import F
from django.utils import timezone
from .models import File
from .serializers import FileSerializer, FileUploadSerializer, FileAdminSerializer
from app.common.permissions import IsOwnerOrAdmin
from app.core.storage import EncryptedFileSystemStorage
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

CHUNK = 64 * 1024

def _iter_file(fobj, chunk_size=CHUNK):
    try:
        while True:
            chunk = fobj.read(chunk_size)
            if not chunk:
                break
            yield chunk
    finally:
        try:
            fobj.close()
        except Exception:
            pass

efs = EncryptedFileSystemStorage()

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user)

    @extend_schema(
        request=FileUploadSerializer,
        responses={201: FileSerializer},
        description="Загрузка файла (multipart/form-data)"
    )
    def create(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        f = serializer.validated_data["file"]
        description = serializer.validated_data.get("description", "")
        obj = File.objects.create(
            user=request.user,
            original_name=f.name,
            file=f,
            size=f.size,
            description=description,
        )
        return Response(FileSerializer(obj).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)}
    )
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        file_obj = self.get_object()
        name = file_obj.file.name
        if not efs.exists(name):
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        fobj = efs.open_decrypted(name)
        ctype = mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream"

        resp = StreamingHttpResponse(_iter_file(fobj), content_type=ctype)
        resp["Content-Disposition"] = f'attachment; filename="{file_obj.original_name}"'
        resp["Content-Length"] = str(file_obj.size)

        File.objects.filter(pk=file_obj.pk).update(
            last_downloaded_at=timezone.now(),
            download_count=F("download_count") + 1,
        )
        return resp


class AdminFileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related("user").all()
    serializer_class = FileAdminSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get("user") or self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    @extend_schema(
        responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)}
    )
    @action(detail=True, methods=["get"], url_path="download")
    def admin_download(self, request, pk=None):
        file_obj = self.get_object()
        name = file_obj.file.name
        if not efs.exists(name):
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        fobj = efs.open_decrypted(name)
        ctype = mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream"

        resp = StreamingHttpResponse(_iter_file(fobj), content_type=ctype)
        resp["Content-Disposition"] = f'attachment; filename="{file_obj.original_name}"'
        resp["Content-Length"] = str(file_obj.size)

        File.objects.filter(pk=file_obj.pk).update(
            last_downloaded_at=timezone.now(),
            download_count=F("download_count") + 1,
        )
        return resp
