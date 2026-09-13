# packages/python/helix_sdk/__init__.py
from .client import HelixClient
from .capabilities import Capability
from .constants import PROTOCOL_VERSION
from .errors import AEPError, AEPAuthzError, AEPTransportError, AEPErrorSymbol
from .transport import BinaryResult, SseEvent

#: Deprecated alias kept for callers written before the rename.
#: Use :class:`HelixClient`.
AEPClient = HelixClient

__all__ = [
    "HelixClient",
    "AEPClient",
    "AEPAuthzError",
    "AEPError",
    "AEPErrorSymbol",
    "AEPTransportError",
    "BinaryResult",
    "Capability",
    "PROTOCOL_VERSION",
    "SseEvent",
]
