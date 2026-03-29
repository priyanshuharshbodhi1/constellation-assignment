#!/usr/bin/env python3
"""
Start the Constellation Web Bridge.

Usage:
    python run.py
    python run.py --group myexp --port 8000

Requires the ConstellationDAQ Python package (constellationdaq>=0.7).
Activate the project venv first:

    source ~/repos/constellation-assignment/.venv/bin/activate
    python run.py --group demo
"""

import argparse
import logging
import sys

import uvicorn

from bridge.app import create_app
from bridge.settings import Settings


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
