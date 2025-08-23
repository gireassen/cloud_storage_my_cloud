from rest_framework.routers import DefaultRouter
from .views import FileViewSet, AdminFileViewSet

router = DefaultRouter()
router.register(r"files", FileViewSet, basename="files")
router.register(r"admin/files", AdminFileViewSet, basename="admin-files")

urlpatterns = router.urls
