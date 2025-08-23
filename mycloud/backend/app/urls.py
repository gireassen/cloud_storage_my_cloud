from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.users.urls')),
    path('api/', include('app.files.urls')),
    path('api/', include('app.links.urls')),
]
