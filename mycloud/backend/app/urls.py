from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('dj-admin/', admin.site.urls),
    path('api/', include('app.users.urls')),
    path('api/', include('app.files.urls')),
    path('api/', include('app.links.urls')),
]

urlpatterns += [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
