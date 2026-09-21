"""
Cyrillic → Latin transliteration for URL slugs.

Ukrainian follows the official romanization rules (Резолюція КМУ № 55, 2010):
"є/ї/й/ю/я" are "ye/yi/y/yu/ya" at the start of a word and "ie/i/i/iu/ia"
elsewhere, "зг" becomes "zgh", the soft sign and apostrophe are dropped.
Russian-only letters (ё, ы, э, ъ) are handled as well; when a text contains
them, the shared letters "и", "е", "й" fall back to their Russian readings.
"""

from __future__ import annotations

import re

_UKRAINIAN = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e",
    "ж": "zh", "з": "z", "и": "y", "і": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ь": "", "’": "", "'": "", "ʼ": "",
    # Russian letters that may appear in mixed text.
    "ё": "yo", "ы": "y", "э": "e", "ъ": "",
}

# Letters whose spelling depends on position inside a word: (word start, elsewhere).
_UKRAINIAN_POSITIONAL = {
    "є": ("ye", "ie"),
    "ї": ("yi", "i"),
    "й": ("y", "i"),
    "ю": ("yu", "iu"),
    "я": ("ya", "ia"),
}

_RUSSIAN_OVERRIDES = {"и": "i", "г": "g", "е": "e"}
_RUSSIAN_POSITIONAL = {"й": ("y", "y"), "ю": ("yu", "yu"), "я": ("ya", "ya"), "є": ("ye", "ye"), "ї": ("yi", "yi")}

_RUSSIAN_ONLY = set("ёыэъ")
_UKRAINIAN_ONLY = set("іїєґ")

_WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


def _looks_russian(text: str) -> bool:
    lowered = text.lower()
    return any(ch in _RUSSIAN_ONLY for ch in lowered) and not any(ch in _UKRAINIAN_ONLY for ch in lowered)


def _transliterate_word(word: str, russian: bool) -> str:
    table = dict(_UKRAINIAN)
    positional = dict(_UKRAINIAN_POSITIONAL)
    if russian:
        table.update(_RUSSIAN_OVERRIDES)
        positional.update(_RUSSIAN_POSITIONAL)

    out: list[str] = []
    i = 0
    while i < len(word):
        ch = word[i]
        low = ch.lower()

        # "зг" → "zgh" so it is not confused with "ж" (zh).
        if not russian and low == "з" and i + 1 < len(word) and word[i + 1].lower() == "г":
            out.append(_match_case("zgh", ch))
            i += 2
            continue

        if low in positional:
            start, inside = positional[low]
            out.append(_match_case(start if i == 0 else inside, ch))
        elif low in table:
            out.append(_match_case(table[low], ch))
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def _match_case(latin: str, source: str) -> str:
    return latin.capitalize() if source.isupper() else latin


def transliterate(text: str) -> str:
    """Return ``text`` with Cyrillic letters replaced by Latin ones; everything else is kept."""
    russian = _looks_russian(text)
    return _WORD_RE.sub(lambda m: _transliterate_word(m.group(0), russian), text)
