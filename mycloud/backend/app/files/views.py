# app/files/views.py
import mimetypes
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import File
from .serializers import FileSerializer, FileUploadSerializer, FileAdminSerializer
from app.common.permissions import IsOwnerOrAdmin
from app.core.storage import EncryptedFileSystemStorage
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

efs = EncryptedFileSystemStorage()


class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user).order_by("-uploaded_at")

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
        return Response(FileSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)}
    )
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        file_obj = self.get_object()
        name = file_obj.file.name
        if not efs.exists(name):
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        content = efs.open_decrypted(name)
        if content is None:
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        ct = mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream"
        resp = FileResponse(content, content_type=ct, as_attachment=True, filename=file_obj.original_name)
        resp["Content-Length"] = file_obj.size
        return resp


class AdminFileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related("user").all().order_by("-uploaded_at")
    serializer_class = FileAdminSerializer
    permission_classes = [IsAdminUser]

    @extend_schema(
        responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)}
    )
    @action(detail=True, methods=["get"], url_path="download")
    def admin_download(self, request, pk=None):
        file_obj = self.get_object()
        name = file_obj.file.name

        if not efs.exists(name):
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        content = efs.open_decrypted(name)
        if content is None:
            return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

        ct = mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream"
        resp = FileResponse(content, content_type=ct, as_attachment=True, filename=file_obj.original_name)
        resp["Content-Length"] = file_obj.size
        return resp
