from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


class RegistrationApplication(models.Model):
    """A request to join the site. The user stays inactive until a superuser approves it."""

    class Status(models.TextChoices):
        PENDING = "pending", "Очікує"
        APPROVED = "approved", "Схвалено"
        REJECTED = "rejected", "Відхилено"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registration_application",
    )
    # Copied from the user so the record survives if the account is deleted on rejection.
    username = models.CharField(max_length=150)
    email = models.EmailField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_applications",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.username} ({self.get_status_display()})"

    @property
    def is_pending(self) -> bool:
        return self.status == self.Status.PENDING

    def approve(self, decided_by=None) -> None:
        if not self.is_pending:
            return
        if self.user is not None:
            self.user.is_active = True
            self.user.save(update_fields=["is_active"])
        self.status = self.Status.APPROVED
        self.decided_at = timezone.now()
        self.decided_by = decided_by
        self.save(update_fields=["status", "decided_at", "decided_by"])

    def reject(self, decided_by=None) -> None:
        if not self.is_pending:
            return
        user = self.user
        self.user = None
        self.status = self.Status.REJECTED
        self.decided_at = timezone.now()
        self.decided_by = decided_by
        self.save(update_fields=["user", "status", "decided_at", "decided_by"])
        # Free the username/email so the person can apply again later.
        if user is not None:
            user.delete()
