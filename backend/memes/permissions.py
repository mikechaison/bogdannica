from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView


class IsAuthenticatedOrReadOnly(permissions.IsAuthenticatedOrReadOnly):
    """Anyone may read; only authenticated users may create, update or delete."""


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Object-level guard: only the author (or staff) may modify an article."""

    def has_object_permission(self, request: Request, view: APIView, obj: object) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        # An Image has no author of its own; it belongs to whoever owns its article.
        target = getattr(obj, "article", obj)
        author_id = getattr(target, "author_id", None)
        return bool(request.user.is_staff or author_id == request.user.id)


class CommentPermission(permissions.BasePermission):
    """Anyone may read or post a comment; only its author or staff may edit/delete it."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return True

    def has_object_permission(self, request: Request, view: APIView, obj: object) -> bool:
        if request.method in permissions.SAFE_METHODS or request.method == "POST":
            return True
        if not request.user.is_authenticated:
            return False
        author_id = getattr(obj, "author_id", None)
        return bool(request.user.is_staff or (author_id is not None and author_id == request.user.id))
