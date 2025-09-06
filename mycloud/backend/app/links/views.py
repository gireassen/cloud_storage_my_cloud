import mimetypes
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from .models import Link
from .serializers import LinkSerializer
from app.files.models import File
from app.core.storage import EncryptedFileSystemStorage

efs = EncryptedFileSystemStorage()

def _link_fields():
    return {f.name for f in Link._meta.get_fields()}

class LinkViewSet(viewsets.ModelViewSet):
    queryset = Link.objects.select_related("file", "file__user").all()
    serializer_class = LinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs.order_by("-created_at")
        return qs.filter(file__user=self.request.user).order_by("-created_at")

    @extend_schema(
        request={"application/json": {"type": "object", "properties": {"file_id": {"type": "integer"}}, "required": ["file_id"]}},
        responses={201: LinkSerializer}
    )
    def create(self, request, *args, **kwargs):
        file_id = request.data.get("file_id")
        if not file_id:
            return Response({"detail": "file_id обязателен"}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = get_object_or_404(File, pk=file_id)

        if not (request.user.is_staff or file_obj.user_id == request.user.id):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

        expires_at = None
        ttl_hours = getattr(settings, "PUBLIC_LINK_TTL_HOURS", None)
        if ttl_hours:
            expires_at = timezone.now() + timezone.timedelta(hours=int(ttl_hours))

        link = Link.objects.create(file=file_obj, expires_at=expires_at)
        return Response(LinkSerializer(link).data, status=status.HTTP_201_CREATED)



@extend_schema(
    responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)}
)
@api_view(["GET"])
@permission_classes([AllowAny])
def public_download(request, token):
    """
    Публичная загрузка по идентификатору.
    Идентификатором может быть slug/token/code/uuid/id — что есть в модели.
    """
    link = None
    fields = {f.name for f in Link._meta.get_fields()}

    for attr in ("slug", "token", "code", "uuid"):
        if attr in fields:
            try:
                link = Link.objects.get(**{attr: token})
                break
            except Link.DoesNotExist:
                pass

    if link is None and str(token).isdigit():
        try:
            link = Link.objects.get(pk=int(token))
        except Link.DoesNotExist:
            pass

    if link is None:
        return Response({"detail": "Ссылка не найдена"}, status=status.HTTP_404_NOT_FOUND)

    if link.expires_at and link.expires_at < timezone.now():
        return Response({"detail": "Ссылка истекла"}, status=status.HTTP_404_NOT_FOUND)

    file_obj = link.file
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