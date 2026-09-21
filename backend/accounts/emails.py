from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.urls import reverse

from .models import RegistrationApplication
from .tokens import make_decision_token

logger = logging.getLogger(__name__)


def superuser_emails() -> list[str]:
    """Addresses that receive registration applications: all superusers, plus ADMIN_EMAIL if set."""
    User = get_user_model()
    emails = {
        email
        for email in User.objects.filter(is_superuser=True, is_active=True).values_list("email", flat=True)
        if email
    }
    if settings.ADMIN_EMAIL:
        emails.add(settings.ADMIN_EMAIL)
    return sorted(emails)


def _decision_url(application: RegistrationApplication, decision: str) -> str:
    token = make_decision_token(application.pk, decision)  # type: ignore[arg-type]
    path = reverse("accounts:application_decide", kwargs={"token": token})
    return f"{settings.BACKEND_URL}{path}"


def send_application_to_admins(application: RegistrationApplication) -> bool:
    recipients = superuser_emails()
    if not recipients:
        logger.warning("Registration application #%s: no superuser email configured.", application.pk)
        return False

    approve_url = _decision_url(application, "approve")
    reject_url = _decision_url(application, "reject")
    subject = f"[Bogdannica] Нова заявка на реєстрацію: {application.username}"
    body = (
        "Надійшла нова заявка на реєстрацію.\n\n"
        f"Ім’я користувача: {application.username}\n"
        f"Електронна пошта: {application.email}\n"
        f"Дата: {application.created_at:%d.%m.%Y %H:%M}\n\n"
        f"Схвалити:  {approve_url}\n"
        f"Відхилити: {reject_url}\n\n"
        "Посилання дійсні 7 днів. Заявку також можна розглянути в адмін-панелі."
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
    return True


def send_decision_to_applicant(application: RegistrationApplication) -> None:
    if not application.email:
        return
    if application.status == RegistrationApplication.Status.APPROVED:
        subject = "[Bogdannica] Вашу заявку схвалено"
        body = (
            f"Вітаємо, {application.username}!\n\n"
            "Вашу заявку на реєстрацію схвалено. Тепер ви можете увійти на сайт "
            f"та додавати статті: {settings.FRONTEND_URL}\n"
        )
    else:
        subject = "[Bogdannica] Вашу заявку відхилено"
        body = (
            f"Вітаємо, {application.username}.\n\n"
            "На жаль, вашу заявку на реєстрацію відхилено.\n"
        )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [application.email], fail_silently=True)
