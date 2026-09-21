from django.contrib import admin, messages
from django.db.models import QuerySet
from django.http import HttpRequest

from .emails import send_decision_to_applicant
from .models import RegistrationApplication


@admin.register(RegistrationApplication)
class RegistrationApplicationAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "status", "created_at", "decided_at", "decided_by")
    list_filter = ("status",)
    search_fields = ("username", "email")
    readonly_fields = ("user", "username", "email", "created_at", "decided_at", "decided_by")
    actions = ("approve_selected", "reject_selected")

    @admin.action(description="Схвалити вибрані заявки")
    def approve_selected(self, request: HttpRequest, queryset: QuerySet[RegistrationApplication]) -> None:
        count = 0
        for application in queryset.filter(status=RegistrationApplication.Status.PENDING):
            application.approve(decided_by=request.user)
            send_decision_to_applicant(application)
            count += 1
        self.message_user(request, f"Схвалено заявок: {count}", messages.SUCCESS)

    @admin.action(description="Відхилити вибрані заявки")
    def reject_selected(self, request: HttpRequest, queryset: QuerySet[RegistrationApplication]) -> None:
        count = 0
        for application in queryset.filter(status=RegistrationApplication.Status.PENDING):
            application.reject(decided_by=request.user)
            send_decision_to_applicant(application)
            count += 1
        self.message_user(request, f"Відхилено заявок: {count}", messages.SUCCESS)
