from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import LinkViewSet, public_download

router = DefaultRouter()
router.register(r"links", LinkViewSet, basename="links")

urlpatterns = [
    path("public/<str:token>/", public_download, name="public-download"),
]

urlpatterns += router.urls