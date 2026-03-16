"""
download_0653.py

Downloads missing Cambridge IGCSE Combined Science (0653) PDFs
from dynamicpapers.com into extracted_data/.

What this downloads:
  • m24 / m25  — mark schemes only (QPs already present)
  • s24, w24, s25, w25 — all QP + MS for Papers 2, 4, 6

Paper structure:
  Feb/March (m) — single variant (2): Papers 1, 2, 3, 4
  May/June  (s) — three variants (1/2/3): Papers 2, 4, 6
  Oct/Nov   (w) — three variants (1/2/3): Papers 2, 4, 6

Paper 1 is MCQ — skipped by theory_pipeline, downloaded here for completeness.
Paper 6 = Alternative to Practical coursework.

Usage:
    python scripts/python/download_0653.py
"""

import os
import sys
import time
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR = "extracted_data"
BASE_URL      = "https://dynamicpapers.com/wp-content/uploads/2015/09/"

os.makedirs(EXTRACTED_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://dynamicpapers.com/",
}

# ─────────────────────────────────────────────────────────────────────────────
# Files to download
# Only QP+MS pairs for theory papers (Papers 2, 3, 4, 6).
# Paper 1 (MCQ) intentionally excluded — not needed for theory pipeline.
# ─────────────────────────────────────────────────────────────────────────────

# Feb/March sessions: single variant (2), Papers 2, 3, 4
# m24 — QPs already downloaded, only MS missing
M24_MS_ONLY = [
    "0653_m24_ms_22.pdf",
    "0653_m24_ms_32.pdf",
    "0653_m24_ms_42.pdf",
]

# m25 — QPs already downloaded, only MS missing
M25_MS_ONLY = [
    "0653_m25_ms_22.pdf",
    "0653_m25_ms_32.pdf",
    "0653_m25_ms_42.pdf",
]

def _sw_pairs(session: str, year: str):
    """Generate QP+MS pairs for May/June or Oct/Nov session (variants 1/2/3, Papers 2/4/6)."""
    pairs = []
    for paper in [2, 4, 6]:
        for variant in [1, 2, 3]:
            qp = f"0653_{session}{year}_qp_{paper}{variant}.pdf"
            ms = f"0653_{session}{year}_ms_{paper}{variant}.pdf"
            pairs.append(qp)
            pairs.append(ms)
    return pairs

# Build full file list
ALL_FILES = (
    M24_MS_ONLY
    + M25_MS_ONLY
    + _sw_pairs("s", "24")
    + _sw_pairs("w", "24")
    + _sw_pairs("s", "25")
    + _sw_pairs("w", "25")
)


def download_file(filename: str) -> bool:
    dest = os.path.join(EXTRACTED_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 10_000:
        print(f"  SKIP  {filename} (already exists)")
        return True

    url = BASE_URL + filename
    try:
        r = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        if r.status_code == 200:
            with open(dest, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            size_kb = os.path.getsize(dest) // 1024
            if size_kb < 10:
                os.remove(dest)
                print(f"  FAIL  {filename}  (response too small — may not exist yet)")
                return False
            print(f"  OK    {filename}  ({size_kb} KB)")
            return True
        else:
            print(f"  FAIL  {filename}  HTTP {r.status_code}")
            return False
    except Exception as e:
        print(f"  ERROR {filename}  {e}")
        return False


def main():
    total = len(ALL_FILES)
    print(f"Combined Science 0653 — Missing PDFs downloader")
    print(f"  m24 MS only   : {len(M24_MS_ONLY)} files")
    print(f"  m25 MS only   : {len(M25_MS_ONLY)} files")
    print(f"  s24 QP+MS     : {len(_sw_pairs('s','24'))} files")
    print(f"  w24 QP+MS     : {len(_sw_pairs('w','24'))} files")
    print(f"  s25 QP+MS     : {len(_sw_pairs('s','25'))} files")
    print(f"  w25 QP+MS     : {len(_sw_pairs('w','25'))} files")
    print(f"  Total         : {total}\n")

    failed = []
    for i, filename in enumerate(ALL_FILES, 1):
        print(f"[{i:>3}/{total}]", end=" ")
        ok = download_file(filename)
        if not ok:
            failed.append(filename)
        time.sleep(1.2)  # polite delay

    downloaded = total - len(failed)
    print(f"\nDone!  {downloaded}/{total} downloaded successfully.")

    if failed:
        print(f"\nFailed ({len(failed)}):")
        for f in failed:
            print(f"  {f}")
        print("\nNote: 2025 papers may not be on the server yet.")
    else:
        print("\nAll files downloaded.")

    print("\nNext steps:")
    print("  1. python scripts/python/theory_pipeline.py --subject 0653")
    print("  2. npx tsx src/server/scripts/seed-0653-theory-fast.ts")


if __name__ == "__main__":
    main()
