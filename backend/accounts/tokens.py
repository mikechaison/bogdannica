from __future__ import annotations

from typing import Literal

from django.core import signing

Decision = Literal["approve", "reject"]
DECISIONS: tuple[Decision, ...] = ("approve", "reject")

REVIEW_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_SALT = "accounts.registration-decision"


def make_review_token(application_id: int) -> str:
    """Signed, expiring token that opens the review page for one application."""
    return signing.TimestampSigner(salt=_SALT).sign_object({"application_id": application_id})


def read_review_token(token: str) -> int | None:
    """Return the application id if the token is valid and not expired, else None.

    Tokens issued before the single-link e-mail also carried a ``decision`` key;
    they are still accepted (the decision is now chosen on the page instead).
    """
    try:
        data = signing.TimestampSigner(salt=_SALT).unsign_object(token, max_age=REVIEW_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    application_id = data.get("application_id") if isinstance(data, dict) else None
    return application_id if isinstance(application_id, int) else None
