import mimetypes
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from app.core.storage import EncryptedFileSystemStorage
from app.files.models import File
from .models import Link
from .serializers import LinkSerializer
from .utils import generate_token

efs = EncryptedFileSystemStorage()

CHUNK = 64 * 1024

def _iter_file(fobj, chunk=CHUNK):
    try:
        while True:
            data = fobj.read(chunk)
            if not data:
                break
            yield data
    finally:
        try:
            fobj.close()
        except Exception:
            pass

class LinkViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        qs = Link.objects.filter(created_by=request.user).select_related("file")
        return Response(LinkSerializer(qs, many=True, context={"request": request}).data)

    def create(self, request):
        file_id = request.data.get("file_id")
        file_obj = get_object_or_404(File, id=file_id)

        if not (request.user.is_staff or file_obj.user_id == request.user.id):
            return Response({"detail": "Недостаточно прав."}, status=status.HTTP_403_FORBIDDEN)

        token = generate_token()
        while Link.objects.filter(token=token).exists():
            token = generate_token()

        link = Link.objects.create(file=file_obj, token=token, created_by=request.user)
        return Response(LinkSerializer(link, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
def public_download(request, token: str):
    link = Link.objects.select_related("file").filter(token=token).first()
    if not link:
        return Response({"detail": "Ссылка не найдена (token)."}, status=404)

    file_obj = link.file
    name = file_obj.file.name

    if not efs.exists(name):
        return Response({"detail": "Файл не найден на диске."}, status=404)

    fobj = efs.open_decrypted(name)

    ctype = mimetypes.guess_type(file_obj.original_name)[0] or "application/octet-stream"
    resp = FileResponse(fobj, as_attachment=True, filename=file_obj.original_name, content_type=ctype)
    resp["Content-Length"] = str(file_obj.size)
    return resp