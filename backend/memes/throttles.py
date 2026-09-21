from __future__ import annotations

from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView


class CommentCreateThrottle(SimpleRateThrottle):
    """Limits how many comments one client (by IP) may post; reading is never throttled."""

    scope = "comments"

    def allow_request(self, request: Request, view: APIView) -> bool:
        if request.method != "POST":
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request: Request, view: APIView) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
