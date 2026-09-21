from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import RegistrationApplication

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_staff", "date_joined")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Creates an *inactive* user plus a pending RegistrationApplication."""

    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "first_name", "last_name")
        read_only_fields = ("id",)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Користувач із такою електронною поштою вже існує.")
        return value.lower()

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> AbstractUser:
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, is_active=False, **validated_data)
        RegistrationApplication.objects.create(user=user, username=user.username, email=user.email)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """JWT login with a clearer message for accounts that are still awaiting approval."""

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        username = attrs.get(self.username_field)
        user = User.objects.filter(**{self.username_field: username}).first()
        if user is not None and not user.is_active and user.check_password(attrs.get("password", "")):
            application = RegistrationApplication.objects.filter(user=user).first()
            if application is not None and application.is_pending:
                raise serializers.ValidationError(
                    {"detail": "Ваша заявка на реєстрацію ще розглядається адміністратором."},
                    code="pending_approval",
                )
            raise serializers.ValidationError({"detail": "Обліковий запис неактивний."}, code="inactive")
        return super().validate(attrs)
