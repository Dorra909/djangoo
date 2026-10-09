from django.contrib import admin

from complaints.models import Complaint


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("subject", "author", "status", "created_at")
    list_filter = ("status", "category", "created_at")
    list_select_related = ("author",)
    search_fields = ("subject", "message", "author__email")
    readonly_fields = ("created_at", "updated_at")
