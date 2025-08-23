import mimetypes
from django.http import FileResponse, Http404, StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import File
from .serializers import FileSerializer, FileUploadSerializer
from app.common.permissions import IsOwnerOrAdmin
from app.core.storage import EncryptedFileSystemStorage

efs = EncryptedFileSystemStorage()

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user)

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

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        file_obj = self.get_object()
        content = efs.open_decrypted(file_obj.file.name)
        response = StreamingHttpResponse(content, content_type=mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{file_obj.original_name}"'
        response["Content-Length"] = file_obj.size
        return response


from rest_framework.permissions import IsAdminUser
from .serializers import FileAdminSerializer

class AdminFileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related("user").all()
    serializer_class = FileAdminSerializer
    permission_classes = [IsAdminUser]
