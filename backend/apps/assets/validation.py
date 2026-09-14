"""Validación de bytes para activos visuales.

Detecta el MIME real por firma, limita el tamaño y rechaza SVG con contenido
potencialmente peligroso antes de almacenarlos en PostgreSQL.
"""

import hashlib
import mimetypes
import re

MAX_ASSET_BYTES = 10 * 1024 * 1024

ALLOWED_MIME = {"image/png", "image/jpeg", "image/svg+xml"}

_MAGIC = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
)

_SVG_BLOCKLIST = re.compile(
    r"<script\b"
    r"|<foreignObject\b"
    r"|<iframe\b"
    r"|<embed\b"
    r"|<object\b"
    r"|<link\b"
    r"|<meta\b"
    r"|<base\b"
    r"|<!DOCTYPE\b"
    r"|<!ENTITY"
    r"|[\s'\"]on[A-Za-z]+\s*="
    r"|javascript:"
    r"|data:text/html"
    r"|xlink:href\s*=\s*[\"']https?://"
    r"|href\s*=\s*[\"']https?://",
    re.IGNORECASE,
)


def detect_mime(data):
    if not data:
        return None
    for prefix, mime in _MAGIC:
        if data.startswith(prefix):
            return mime
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return "image/svg+xml"
    stripped = data.lstrip()
    if stripped.startswith(b"<svg") or stripped.startswith(b"<?xml"):
        return "image/svg+xml"
    return None


def sha256(data):
    """Hexadecimal SHA-256 de los bytes."""
    return hashlib.sha256(data).hexdigest()


def _decode_svg(data):
    """Decodifica SVG en UTF-8 o UTF-16 (con/sin BOM)."""
    if not data:
        return None
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        try:
            return data.decode("utf-16")
        except UnicodeDecodeError:
            return None
    for enc in ("utf-8", "utf-16-le", "utf-16-be"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return None


def is_safe_svg(data):
    text = _decode_svg(data)
    if not text:
        return False
    return not _SVG_BLOCKLIST.search(text)


def validate_bytes(data, file_name):
    """Valida bytes y devuelve el MIME real o lanza ValueError."""
    if not data:
        raise ValueError("El archivo está vacío.")
    if len(data) > MAX_ASSET_BYTES:
        raise ValueError(
            f"El archivo supera el límite de {MAX_ASSET_BYTES} bytes ({len(data)})."
        )
    mime = detect_mime(data)
    if mime is None or mime not in ALLOWED_MIME:
        raise ValueError("Tipo de archivo no permitido o firma no reconocida.")
    guessed, _ = mimetypes.guess_type(file_name)
    if guessed and guessed != mime:
        raise ValueError(
            f"La firma detectada ({mime}) no coincide con la extensión ({guessed})."
        )
    if mime == "image/svg+xml" and not is_safe_svg(data):
        raise ValueError("SVG rechazado por contenido potencialmente peligroso.")
    return mime