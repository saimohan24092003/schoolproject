"""
Audit diagram quality and optionally quarantine broken/noise crops.

Usage:
  python scripts/python/audit_qp_diagrams.py
  python scripts/python/audit_qp_diagrams.py --quarantine
  python scripts/python/audit_qp_diagrams.py --quarantine --subject 0653
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIAGRAMS_DIR = ROOT / "public" / "diagrams"
QUARANTINE_DIR = ROOT / "public" / "diagrams_quarantine"
REPORT_FILE = ROOT / "analysis_results_diagram_quality.json"

MIN_BYTES = 1800
MIN_W = 120
MIN_H = 60
MAX_ASPECT = 16.0

QP_RE = re.compile(r"^\d{4}_[mswn]\d{2}_qp_\d{2,3}", re.IGNORECASE)
MS_RE = re.compile(r"_ms_", re.IGNORECASE)


def read_png_meta(path: Path):
    try:
        data = path.read_bytes()
    except Exception:
        return None

    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    w, h = struct.unpack(">II", data[16:24])
    return len(data), int(w), int(h)


def classify(path: Path):
    name = path.name
    lower = name.lower()

    meta = read_png_meta(path)
    if not meta:
        return "invalid_png", None

    size_b, w, h = meta
    aspect = (w / h) if h else 999

    if MS_RE.search(lower):
        return "mark_scheme_file", meta
    if size_b < MIN_BYTES:
        return "too_small_bytes", meta
    if w < MIN_W or h < MIN_H:
        return "too_small_dimensions", meta
    if aspect > MAX_ASPECT:
        return "line_fragment", meta
    if not QP_RE.match(name):
        return "non_qp_or_legacy_name", meta
    return "usable", meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quarantine", action="store_true", help="Move bad files to quarantine folder")
    ap.add_argument("--subject", type=str, default=None, help="Subject code filter, e.g. 0653")
    args = ap.parse_args()

    if not DIAGRAMS_DIR.exists():
        print("No public/diagrams directory found.")
        return

    rows = []
    counts: dict[str, int] = {}

    files = sorted(DIAGRAMS_DIR.glob("*.png"))
    if args.subject:
        files = [f for f in files if f.name.startswith(args.subject + "_")]

    for path in files:
        status, meta = classify(path)
        counts[status] = counts.get(status, 0) + 1

        size_b, w, h = meta if meta else (0, 0, 0)
        rows.append(
            {
                "file": path.name,
                "status": status,
                "bytes": size_b,
                "width": w,
                "height": h,
            }
        )

    bad_status = {
        "invalid_png",
        "mark_scheme_file",
        "too_small_bytes",
        "too_small_dimensions",
        "line_fragment",
    }
    bad_files = [r for r in rows if r["status"] in bad_status]

    if args.quarantine and bad_files:
        QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
        moved = 0
        for item in bad_files:
            src = DIAGRAMS_DIR / item["file"]
            dst = QUARANTINE_DIR / item["file"]
            if src.exists():
                shutil.move(str(src), str(dst))
                moved += 1
        counts["moved_to_quarantine"] = moved

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalFiles": len(rows),
        "counts": counts,
        "usableFiles": counts.get("usable", 0),
        "badFiles": len(bad_files),
        "badSamples": sorted(bad_files, key=lambda r: (r["bytes"], r["width"], r["height"]))[:200],
    }

    REPORT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Diagram quality audit complete.")
    print(json.dumps(report["counts"], indent=2))
    print(f"Report: {REPORT_FILE}")


if __name__ == "__main__":
    main()
