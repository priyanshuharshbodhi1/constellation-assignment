#!/usr/bin/env python3
"""
Start the Constellation Web Bridge.

Usage:
    python run.py
    python run.py --group myexp --port 8000

The bridge requires the ConstellationDAQ Python library. If it is not
installed, this script automatically adds the local fork's source tree to
sys.path — no meson build required for development:

    constellation-assignment/
    ├── assignment/backend/   ← you are here
    └── constellation-glab/python/constellation/   ← used automatically
"""

import argparse
import logging
import os
import sys

# ---------------------------------------------------------------------------
# Make the Constellation library importable without a full meson install.
# We resolve the path relative to this file so the script works regardless of
# the working directory it is launched from.
# ---------------------------------------------------------------------------
_here = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(os.path.dirname(_here))
_constellation_python = os.path.join(_repo_root, "constellation-glab", "python")

if os.path.isdir(_constellation_python) and _constellation_python not in sys.path:
    sys.path.insert(0, _constellation_python)

import uvicorn  # noqa: E402 — must come after sys.path manipulation

from bridge.app import create_app  # noqa: E402
from bridge.settings import Settings  # noqa: E402


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--group", help="Constellation group name (overrides CONSTELLATION_GROUP env)")
    p.add_argument("--host", help="Bind address (default: 0.0.0.0)")
    p.add_argument("--port", type=int, help="Bind port (default: 8000)")
    p.add_argument("--interface", nargs="*", metavar="IFACE", help="Network interface(s) to use")
    p.add_argument("--reload", action="store_true", help="Enable uvicorn auto-reload (dev only)")
    return p.parse_args()


def main() -> None:
    args = _parse_args()

    settings = Settings()
    if args.group:
        settings.constellation_group = args.group
    if args.host:
        settings.host = args.host
    if args.port:
        settings.port = args.port
    if args.interface:
        settings.constellation_interface = args.interface

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    )

    app = create_app(settings)

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=args.reload,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
