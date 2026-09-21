"""
Unicode-aware LIKE for SQLite.

SQLite's built-in LIKE folds case for ASCII letters only, so ``icontains`` lookups
(and DRF's SearchFilter) fail to match "жуж" against "Жуж". SQLite lets an
application override LIKE by registering a ``like()`` SQL function; this module
does that with a regex-based implementation that uses Python's Unicode case folding.
Other database backends are unaffected.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

from django.db.backends.signals import connection_created


@lru_cache(maxsize=512)
def _compile(pattern: str, escape: str | None) -> re.Pattern[str]:
    out: list[str] = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if escape and ch == escape and i + 1 < len(pattern):
            out.append(re.escape(pattern[i + 1]))
            i += 2
            continue
        if ch == "%":
            out.append(".*")
        elif ch == "_":
            out.append(".")
        else:
            out.append(re.escape(ch))
        i += 1
    return re.compile("".join(out), re.IGNORECASE | re.DOTALL)


def _like(pattern: Any, value: Any, escape: Any = None) -> int | None:
    if pattern is None or value is None:
        return None
    return 1 if _compile(str(pattern), str(escape) if escape else None).fullmatch(str(value)) else 0


def _like2(pattern: Any, value: Any) -> int | None:
    return _like(pattern, value)


def _register(sender: Any, connection: Any, **kwargs: Any) -> None:
    if connection.vendor != "sqlite":
        return
    raw = connection.connection
    raw.create_function("LIKE", 2, _like2, deterministic=True)
    raw.create_function("LIKE", 3, _like, deterministic=True)


def install() -> None:
    connection_created.connect(_register, dispatch_uid="memes.sqlite_unicode_like")
