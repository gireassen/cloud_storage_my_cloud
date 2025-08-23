from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_active", "is_staff", "role", "date_joined")
    search_fields = ("username", "email")
    list_filter = ("is_active", "is_staff", "role")
