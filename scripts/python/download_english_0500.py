"""
download_english_0500.py

Downloads all English First Language (0500) question papers and mark schemes
from dynamicpapers.com (2017-2025) into extracted_data/.

Usage:
    python scripts/python/download_english_0500.py
"""

import os
import sys
import time
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR = "extracted_data"
BASE_URL      = "https://dynamicpapers.com/wp-content/uploads/2015/09/"

os.makedirs(EXTRACTED_DIR, exist_ok=True)

# All (QP, MS) filename pairs — 2017 to 2025
# Naming: 0500_{season}{yy}_qp_{paper}{variant}.pdf
#   season: m=Feb/March, s=May/June, w=Oct/Nov
#   Feb/March only has variant 2 (one zone)
#   May/June + Oct/Nov have variants 1, 2, 3 (three zones)
PAPERS = [
    # ── 2025 ──────────────────────────────────────────────
    ("0500_m25_qp_12.pdf", "0500_m25_ms_12.pdf"),
    ("0500_s25_qp_11.pdf", "0500_s25_ms_11.pdf"),
    ("0500_s25_qp_12.pdf", "0500_s25_ms_12.pdf"),
    ("0500_s25_qp_13.pdf", "0500_s25_ms_13.pdf"),
    ("0500_w25_qp_11.pdf", "0500_w25_ms_11.pdf"),
    ("0500_w25_qp_12.pdf", "0500_w25_ms_12.pdf"),
    ("0500_w25_qp_13.pdf", "0500_w25_ms_13.pdf"),
    # ── 2024 ──────────────────────────────────────────────
    ("0500_m24_qp_12.pdf", "0500_m24_ms_12.pdf"),
    ("0500_s24_qp_11.pdf", "0500_s24_ms_11.pdf"),
    ("0500_s24_qp_12.pdf", "0500_s24_ms_12.pdf"),
    ("0500_s24_qp_13.pdf", "0500_s24_ms_13.pdf"),
    ("0500_w24_qp_11.pdf", "0500_w24_ms_11.pdf"),
    ("0500_w24_qp_12.pdf", "0500_w24_ms_12.pdf"),
    ("0500_w24_qp_13.pdf", "0500_w24_ms_13.pdf"),
    # ── 2023 ──────────────────────────────────────────────
    ("0500_m23_qp_12.pdf", "0500_m23_ms_12.pdf"),
    ("0500_s23_qp_11.pdf", "0500_s23_ms_11.pdf"),
    ("0500_s23_qp_12.pdf", "0500_s23_ms_12.pdf"),
    ("0500_s23_qp_13.pdf", "0500_s23_ms_13.pdf"),
    ("0500_w23_qp_11.pdf", "0500_w23_ms_11.pdf"),
    ("0500_w23_qp_12.pdf", "0500_w23_ms_12.pdf"),
    ("0500_w23_qp_13.pdf", "0500_w23_ms_13.pdf"),
    # ── 2022 ──────────────────────────────────────────────
    ("0500_m22_qp_12.pdf", "0500_m22_ms_12.pdf"),
    ("0500_s22_qp_11.pdf", "0500_s22_ms_11.pdf"),
    ("0500_s22_qp_12.pdf", "0500_s22_ms_12.pdf"),
    ("0500_s22_qp_13.pdf", "0500_s22_ms_13.pdf"),
    ("0500_w22_qp_11.pdf", "0500_w22_ms_11.pdf"),
    ("0500_w22_qp_12.pdf", "0500_w22_ms_12.pdf"),
    ("0500_w22_qp_13.pdf", "0500_w22_ms_13.pdf"),
    # ── 2021 ──────────────────────────────────────────────
    ("0500_m21_qp_12.pdf", "0500_m21_ms_12.pdf"),
    ("0500_s21_qp_11.pdf", "0500_s21_ms_11.pdf"),
    ("0500_s21_qp_12.pdf", "0500_s21_ms_12.pdf"),
    ("0500_s21_qp_13.pdf", "0500_s21_ms_13.pdf"),
    ("0500_w21_qp_11.pdf", "0500_w21_ms_11.pdf"),
    ("0500_w21_qp_12.pdf", "0500_w21_ms_12.pdf"),
    ("0500_w21_qp_13.pdf", "0500_w21_ms_13.pdf"),
    # ── 2020 ──────────────────────────────────────────────
    ("0500_m20_qp_12.pdf", "0500_m20_ms_12.pdf"),
    ("0500_s20_qp_11.pdf", "0500_s20_ms_11.pdf"),
    ("0500_s20_qp_12.pdf", "0500_s20_ms_12.pdf"),
    ("0500_s20_qp_13.pdf", "0500_s20_ms_13.pdf"),
    ("0500_w20_qp_11.pdf", "0500_w20_ms_11.pdf"),
    ("0500_w20_qp_12.pdf", "0500_w20_ms_12.pdf"),
    ("0500_w20_qp_13.pdf", "0500_w20_ms_13.pdf"),
    # ── 2019 ──────────────────────────────────────────────
    ("0500_m19_qp_12.pdf", "0500_m19_ms_12.pdf"),
    ("0500_s19_qp_11.pdf", "0500_s19_ms_11.pdf"),
    ("0500_s19_qp_12.pdf", "0500_s19_ms_12.pdf"),
    ("0500_s19_qp_13.pdf", "0500_s19_ms_13.pdf"),
    ("0500_w19_qp_11.pdf", "0500_w19_ms_11.pdf"),
    ("0500_w19_qp_12.pdf", "0500_w19_ms_12.pdf"),
    ("0500_w19_qp_13.pdf", "0500_w19_ms_13.pdf"),
    # ── 2018 ──────────────────────────────────────────────
    ("0500_m18_qp_12.pdf", "0500_m18_ms_12.pdf"),
    ("0500_s18_qp_11.pdf", "0500_s18_ms_11.pdf"),
    ("0500_s18_qp_12.pdf", "0500_s18_ms_12.pdf"),
    ("0500_s18_qp_13.pdf", "0500_s18_ms_13.pdf"),
    ("0500_w18_qp_11.pdf", "0500_w18_ms_11.pdf"),
    ("0500_w18_qp_12.pdf", "0500_w18_ms_12.pdf"),
    ("0500_w18_qp_13.pdf", "0500_w18_ms_13.pdf"),
    # ── 2017 ──────────────────────────────────────────────
    ("0500_m17_qp_12.pdf", "0500_m17_ms_12.pdf"),
    ("0500_s17_qp_11.pdf", "0500_s17_ms_11.pdf"),
    ("0500_s17_qp_12.pdf", "0500_s17_ms_12.pdf"),
    ("0500_s17_qp_13.pdf", "0500_s17_ms_13.pdf"),
    ("0500_w17_qp_11.pdf", "0500_w17_ms_11.pdf"),
    ("0500_w17_qp_12.pdf", "0500_w17_ms_12.pdf"),
    ("0500_w17_qp_13.pdf", "0500_w17_ms_13.pdf"),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://dynamicpapers.com/",
}


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
    all_files = [f for pair in PAPERS for f in pair]
    total  = len(all_files)
    failed = []

    print(f"Downloading {total} files (QP + MS) for English First Language 0500 — 2017 to 2025\n")

    for i, filename in enumerate(all_files, 1):
        print(f"[{i:>3}/{total}]", end=" ")
        ok = download_file(filename)
        if not ok:
            failed.append(filename)
        time.sleep(1.5)  # polite delay

    downloaded = total - len(failed)
    print(f"\nDone!  {downloaded}/{total} downloaded successfully.")
    if failed:
        print(f"\nFailed / not yet available ({len(failed)}):")
        for f in failed:
            print(f"  {f}")
        print("\nNote: 2025 Oct/Nov papers may not exist yet on the server.")
    else:
        print("\nAll files downloaded.")

    print("\nNext steps:")
    print("  1. python scripts/python/theory_pipeline.py --subject 0500")
    print("  2. npx tsx src/server/scripts/seed-english-0500.ts   (seed syllabus)")
    print("  3. npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
