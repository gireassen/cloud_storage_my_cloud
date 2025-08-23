from django.http import StreamingHttpResponse, Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from app.common.permissions import IsOwnerOrAdmin
from .models import Link
from .serializers import LinkSerializer
from app.files.models import File
from app.core.storage import EncryptedFileSystemStorage
import mimetypes

efs = EncryptedFileSystemStorage()

class LinkViewSet(viewsets.ModelViewSet):
    serializer_class = LinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Link.objects.all().select_related("file")
        return Link.objects.filter(file__user=self.request.user).select_related("file")

    def create(self, request, *args, **kwargs):
        file_id = request.data.get("file_id")
        expires_at = request.data.get("expires_at")
        file = get_object_or_404(File, id=file_id)
        if not (request.user.is_staff or file.user_id == request.user.id):
            return Response({"detail": "Недостаточно прав"}, status=403)
        link = Link.objects.create(file=file, expires_at=expires_at)
        return Response(LinkSerializer(link).data, status=201)

@api_view(["GET"])
@permission_classes([AllowAny])
def public_download(request, token: str):
    link = get_object_or_404(Link, token=token)
    if link.expires_at:
        from django.utils import timezone
        if timezone.now() > link.expires_at:
            return Response({"detail": "Ссылка истекла"}, status=410)
    file_obj = link.file
    content = efs.open_decrypted(file_obj.file.name)
    resp = StreamingHttpResponse(content, content_type=mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream")
    resp["Content-Disposition"] = f'attachment; filename="{file_obj.original_name}"'
    resp["Content-Length"] = file_obj.size
    return resp
