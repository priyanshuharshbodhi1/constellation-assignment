#!/usr/bin/env python3
"""
Launch test satellites for local development.

Starts three Constellation satellites in separate processes:
  • PyRandomTransmitter.Sender  — generates random data records
  • PyDevNullReceiver.Receiver  — accepts and discards data records
  • Mariner.Probe               — minimal satellite with a custom command

All three join the same group so the bridge controller can discover them via
CHIRP. Press Ctrl+C to stop everything.

Usage:
    python launch_satellites.py
    python launch_satellites.py --group myexp
"""

import argparse
import signal
import subprocess
import sys
import time

_SATELLITES = [
    ("PyRandomTransmitter", "Sender"),
    ("PyDevNullReceiver", "Receiver"),
    ("Mariner", "Probe"),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--group", default="constellation", help="Constellation group (default: constellation)")
    args = parser.parse_args()

    procs: list[tuple[str, str, subprocess.Popen]] = []

    print(f"Starting satellites in group '{args.group}'...")
    for sat_class, sat_name in _SATELLITES:
        cmd = [
            sys.executable, "-m", f"constellation.satellites.{sat_class}",
            "--name", sat_name,
            "--group", args.group,
        ]
        p = subprocess.Popen(cmd)
        procs.append((sat_class, sat_name, p))
        # Brief pause so each satellite's CHIRP OFFER does not collide
        time.sleep(0.4)
        print(f"  {sat_class}.{sat_name}  (pid {p.pid})")

    print(f"\n{len(procs)} satellites running. Press Ctrl+C to stop.\n")

    def _shutdown(sig, frame) -> None:
        print("\nStopping satellites...")
        for _, _, p in procs:
            p.terminate()
        for _, _, p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    while True:
        time.sleep(2)
        for sat_class, sat_name, p in procs:
            code = p.poll()
            if code is not None:
                print(f"Warning: {sat_class}.{sat_name} exited with code {code}")


if __name__ == "__main__":
    main()
