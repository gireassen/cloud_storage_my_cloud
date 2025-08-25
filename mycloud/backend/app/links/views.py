import mimetypes
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from app.core.storage import EncryptedFileSystemStorage
from app.files.models import File
from .models import Link
from .serializers import LinkSerializer, LinkCreateSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from rest_framework.decorators import permission_classes as drf_permission_classes

efs = EncryptedFileSystemStorage()


class LinkViewSet(viewsets.ModelViewSet):
    """
    CRUD по ссылкам. Доступ: только аутентифицированные.
    Админ видит все, обычный — только свои (по file__user).
    """
    serializer_class = LinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Link.objects.select_related("file").all()
        return Link.objects.select_related("file").filter(file__user=self.request.user)

    @extend_schema(
        request=LinkCreateSerializer,
        responses={201: LinkSerializer},
        description="Создание публичной ссылки на файл (владелец файла или админ).",
    )
    def create(self, request, *args, **kwargs):
        ser = LinkCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        file_id = ser.validated_data["file_id"]
        expires_at = ser.validated_data.get("expires_at")

        file_obj = get_object_or_404(File, id=file_id)

        if not (request.user.is_staff or file_obj.user_id == request.user.id):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

        link = Link.objects.create(file=file_obj, expires_at=expires_at)
        return Response(LinkSerializer(link).data, status=status.HTTP_201_CREATED)


@extend_schema(
    responses={200: OpenApiResponse(description="Файл (binary)", response=OpenApiTypes.BINARY)},
    description="Публичное скачивание по токену (без аутентификации).",
)
@api_view(["GET"])
@drf_permission_classes([AllowAny])
def public_download(request, token: str):
    link = get_object_or_404(Link, token=token)

    if link.expires_at and timezone.now() > link.expires_at:
        return Response({"detail": "Ссылка истекла"}, status=status.HTTP_410_GONE)

    file_obj = link.file
    name = file_obj.file.name
    if not efs.exists(name):
        return Response({"detail": "Файл не найден на диске"}, status=status.HTTP_404_NOT_FOUND)

    content = efs.open_decrypted(name)
    resp = StreamingHttpResponse(
        content,
        content_type=mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream",
    )
    resp["Content-Disposition"] = f'attachment; filename="{file_obj.original_name}"'
    resp["Content-Length"] = file_obj.size
    return resp

