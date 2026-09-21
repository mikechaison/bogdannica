from __future__ import annotations

import logging

from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_application_to_admins, send_decision_to_applicant
from .models import RegistrationApplication
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .tokens import read_decision_token

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — file a registration application (no tokens are issued)."""

    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        application: RegistrationApplication = user.registration_application

        try:
            send_application_to_admins(application)
        except Exception:  # noqa: BLE001 — never fail registration because of mail delivery
            logger.exception("Could not e-mail registration application #%s", application.pk)

        return Response(
            {
                "detail": "Заявку надіслано. Ви зможете увійти після того, як адміністратор її схвалить.",
                "user": UserSerializer(user).data,
                "status": application.status,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — JWT pair; pending applicants get an explanatory error."""

    serializer_class = LoginSerializer


class MeView(generics.RetrieveAPIView):
    """GET /api/auth/me/ — the currently authenticated user."""

    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self) -> AbstractUser:
        return self.request.user


@require_http_methods(["GET", "POST"])
def application_decide(request: HttpRequest, token: str) -> HttpResponse:
    """
    Opened from the e-mail sent to superusers.

    GET shows the application and a confirmation button (so link prefetchers cannot
    approve by accident); POST applies the decision encoded in the signed token.
    """
    payload = read_decision_token(token)
    if payload is None:
        return render(request, "accounts/decision.html", {"error": "Посилання недійсне або застаріле."}, status=400)

    application = RegistrationApplication.objects.filter(pk=payload["application_id"]).first()
    if application is None:
        return render(request, "accounts/decision.html", {"error": "Заявку не знайдено."}, status=404)

    decision = payload["decision"]
    context = {"application": application, "decision": decision}

    if not application.is_pending:
        context["already_decided"] = True
        return render(request, "accounts/decision.html", context)

    if request.method == "POST":
        decided_by = request.user if request.user.is_authenticated else None
        if decision == "approve":
            application.approve(decided_by=decided_by)
        else:
            application.reject(decided_by=decided_by)
        send_decision_to_applicant(application)
        context["done"] = True

    return render(request, "accounts/decision.html", context)
