from __future__ import annotations

from typing import Literal, TypedDict

from django.core import signing

Decision = Literal["approve", "reject"]

DECISION_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_SALT = "accounts.registration-decision"


class DecisionPayload(TypedDict):
    application_id: int
    decision: Decision


def make_decision_token(application_id: int, decision: Decision) -> str:
    payload: DecisionPayload = {"application_id": application_id, "decision": decision}
    return signing.TimestampSigner(salt=_SALT).sign_object(payload)


def read_decision_token(token: str) -> DecisionPayload | None:
    """Return the payload if the token is valid and not expired, else None."""
    try:
        data = signing.TimestampSigner(salt=_SALT).unsign_object(token, max_age=DECISION_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    if data.get("decision") not in ("approve", "reject") or not isinstance(data.get("application_id"), int):
        return None
    return data  # type: ignore[return-value]
