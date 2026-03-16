"""
download_maths_0580.py

Downloads Cambridge IGCSE Mathematics (0580) Extended papers from
dynamicpapers.com (2017–2025) into extracted_data/.

Papers downloaded:
  • Paper 2  (_qp_2x) — Extended short-answer, 1h 30m
  • Paper 4  (_qp_4x) — Extended structured questions, 2h 30m

Both papers are structured/theory (NOT MCQ), so both are processed by the
theory_pipeline.  Paper 1 (Core) and Paper 3 (Core) are deliberately omitted.

Feb/March sessions only exist as a single variant (2); May/June and Oct/Nov
have three variants (1, 2, 3).

Usage:
    python scripts/python/download_maths_0580.py
"""

import os
import sys
import time
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR = "extracted_data"
BASE_URL      = "https://dynamicpapers.com/wp-content/uploads/2015/09/"

os.makedirs(EXTRACTED_DIR, exist_ok=True)

# (QP filename, MS filename) pairs
# Naming convention: 0580_{season}{yy}_qp_{paper}{variant}.pdf
#   paper   2 = Extended short-answer
#   paper   4 = Extended structured
#   variant 1/2/3 = exam zone (Feb/March has only zone 2)
PAPERS = [
    # ════════════════════════════════════════════
    # 2025
    # ════════════════════════════════════════════
    # Feb/March
    ("0580_m25_qp_22.pdf", "0580_m25_ms_22.pdf"),
    ("0580_m25_qp_42.pdf", "0580_m25_ms_42.pdf"),
    # May/June
    ("0580_s25_qp_21.pdf", "0580_s25_ms_21.pdf"),
    ("0580_s25_qp_22.pdf", "0580_s25_ms_22.pdf"),
    ("0580_s25_qp_23.pdf", "0580_s25_ms_23.pdf"),
    ("0580_s25_qp_41.pdf", "0580_s25_ms_41.pdf"),
    ("0580_s25_qp_42.pdf", "0580_s25_ms_42.pdf"),
    ("0580_s25_qp_43.pdf", "0580_s25_ms_43.pdf"),
    # Oct/Nov
    ("0580_w25_qp_21.pdf", "0580_w25_ms_21.pdf"),
    ("0580_w25_qp_22.pdf", "0580_w25_ms_22.pdf"),
    ("0580_w25_qp_23.pdf", "0580_w25_ms_23.pdf"),
    ("0580_w25_qp_41.pdf", "0580_w25_ms_41.pdf"),
    ("0580_w25_qp_42.pdf", "0580_w25_ms_42.pdf"),
    ("0580_w25_qp_43.pdf", "0580_w25_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2024
    # ════════════════════════════════════════════
    ("0580_m24_qp_22.pdf", "0580_m24_ms_22.pdf"),
    ("0580_m24_qp_42.pdf", "0580_m24_ms_42.pdf"),
    ("0580_s24_qp_21.pdf", "0580_s24_ms_21.pdf"),
    ("0580_s24_qp_22.pdf", "0580_s24_ms_22.pdf"),
    ("0580_s24_qp_23.pdf", "0580_s24_ms_23.pdf"),
    ("0580_s24_qp_41.pdf", "0580_s24_ms_41.pdf"),
    ("0580_s24_qp_42.pdf", "0580_s24_ms_42.pdf"),
    ("0580_s24_qp_43.pdf", "0580_s24_ms_43.pdf"),
    ("0580_w24_qp_21.pdf", "0580_w24_ms_21.pdf"),
    ("0580_w24_qp_22.pdf", "0580_w24_ms_22.pdf"),
    ("0580_w24_qp_23.pdf", "0580_w24_ms_23.pdf"),
    ("0580_w24_qp_41.pdf", "0580_w24_ms_41.pdf"),
    ("0580_w24_qp_42.pdf", "0580_w24_ms_42.pdf"),
    ("0580_w24_qp_43.pdf", "0580_w24_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2023
    # ════════════════════════════════════════════
    ("0580_m23_qp_22.pdf", "0580_m23_ms_22.pdf"),
    ("0580_m23_qp_42.pdf", "0580_m23_ms_42.pdf"),
    ("0580_s23_qp_21.pdf", "0580_s23_ms_21.pdf"),
    ("0580_s23_qp_22.pdf", "0580_s23_ms_22.pdf"),
    ("0580_s23_qp_23.pdf", "0580_s23_ms_23.pdf"),
    ("0580_s23_qp_41.pdf", "0580_s23_ms_41.pdf"),
    ("0580_s23_qp_42.pdf", "0580_s23_ms_42.pdf"),
    ("0580_s23_qp_43.pdf", "0580_s23_ms_43.pdf"),
    ("0580_w23_qp_21.pdf", "0580_w23_ms_21.pdf"),
    ("0580_w23_qp_22.pdf", "0580_w23_ms_22.pdf"),
    ("0580_w23_qp_23.pdf", "0580_w23_ms_23.pdf"),
    ("0580_w23_qp_41.pdf", "0580_w23_ms_41.pdf"),
    ("0580_w23_qp_42.pdf", "0580_w23_ms_42.pdf"),
    ("0580_w23_qp_43.pdf", "0580_w23_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2022
    # ════════════════════════════════════════════
    ("0580_m22_qp_22.pdf", "0580_m22_ms_22.pdf"),
    ("0580_m22_qp_42.pdf", "0580_m22_ms_42.pdf"),
    ("0580_s22_qp_21.pdf", "0580_s22_ms_21.pdf"),
    ("0580_s22_qp_22.pdf", "0580_s22_ms_22.pdf"),
    ("0580_s22_qp_23.pdf", "0580_s22_ms_23.pdf"),
    ("0580_s22_qp_41.pdf", "0580_s22_ms_41.pdf"),
    ("0580_s22_qp_42.pdf", "0580_s22_ms_42.pdf"),
    ("0580_s22_qp_43.pdf", "0580_s22_ms_43.pdf"),
    ("0580_w22_qp_21.pdf", "0580_w22_ms_21.pdf"),
    ("0580_w22_qp_22.pdf", "0580_w22_ms_22.pdf"),
    ("0580_w22_qp_23.pdf", "0580_w22_ms_23.pdf"),
    ("0580_w22_qp_41.pdf", "0580_w22_ms_41.pdf"),
    ("0580_w22_qp_42.pdf", "0580_w22_ms_42.pdf"),
    ("0580_w22_qp_43.pdf", "0580_w22_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2021
    # ════════════════════════════════════════════
    ("0580_m21_qp_22.pdf", "0580_m21_ms_22.pdf"),
    ("0580_m21_qp_42.pdf", "0580_m21_ms_42.pdf"),
    ("0580_s21_qp_21.pdf", "0580_s21_ms_21.pdf"),
    ("0580_s21_qp_22.pdf", "0580_s21_ms_22.pdf"),
    ("0580_s21_qp_23.pdf", "0580_s21_ms_23.pdf"),
    ("0580_s21_qp_41.pdf", "0580_s21_ms_41.pdf"),
    ("0580_s21_qp_42.pdf", "0580_s21_ms_42.pdf"),
    ("0580_s21_qp_43.pdf", "0580_s21_ms_43.pdf"),
    ("0580_w21_qp_21.pdf", "0580_w21_ms_21.pdf"),
    ("0580_w21_qp_22.pdf", "0580_w21_ms_22.pdf"),
    ("0580_w21_qp_23.pdf", "0580_w21_ms_23.pdf"),
    ("0580_w21_qp_41.pdf", "0580_w21_ms_41.pdf"),
    ("0580_w21_qp_42.pdf", "0580_w21_ms_42.pdf"),
    ("0580_w21_qp_43.pdf", "0580_w21_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2020
    # ════════════════════════════════════════════
    ("0580_m20_qp_22.pdf", "0580_m20_ms_22.pdf"),
    ("0580_m20_qp_42.pdf", "0580_m20_ms_42.pdf"),
    ("0580_s20_qp_21.pdf", "0580_s20_ms_21.pdf"),
    ("0580_s20_qp_22.pdf", "0580_s20_ms_22.pdf"),
    ("0580_s20_qp_23.pdf", "0580_s20_ms_23.pdf"),
    ("0580_s20_qp_41.pdf", "0580_s20_ms_41.pdf"),
    ("0580_s20_qp_42.pdf", "0580_s20_ms_42.pdf"),
    ("0580_s20_qp_43.pdf", "0580_s20_ms_43.pdf"),
    ("0580_w20_qp_21.pdf", "0580_w20_ms_21.pdf"),
    ("0580_w20_qp_22.pdf", "0580_w20_ms_22.pdf"),
    ("0580_w20_qp_23.pdf", "0580_w20_ms_23.pdf"),
    ("0580_w20_qp_41.pdf", "0580_w20_ms_41.pdf"),
    ("0580_w20_qp_42.pdf", "0580_w20_ms_42.pdf"),
    ("0580_w20_qp_43.pdf", "0580_w20_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2019
    # ════════════════════════════════════════════
    ("0580_m19_qp_22.pdf", "0580_m19_ms_22.pdf"),
    ("0580_m19_qp_42.pdf", "0580_m19_ms_42.pdf"),
    ("0580_s19_qp_21.pdf", "0580_s19_ms_21.pdf"),
    ("0580_s19_qp_22.pdf", "0580_s19_ms_22.pdf"),
    ("0580_s19_qp_23.pdf", "0580_s19_ms_23.pdf"),
    ("0580_s19_qp_41.pdf", "0580_s19_ms_41.pdf"),
    ("0580_s19_qp_42.pdf", "0580_s19_ms_42.pdf"),
    ("0580_s19_qp_43.pdf", "0580_s19_ms_43.pdf"),
    ("0580_w19_qp_21.pdf", "0580_w19_ms_21.pdf"),
    ("0580_w19_qp_22.pdf", "0580_w19_ms_22.pdf"),
    ("0580_w19_qp_23.pdf", "0580_w19_ms_23.pdf"),
    ("0580_w19_qp_41.pdf", "0580_w19_ms_41.pdf"),
    ("0580_w19_qp_42.pdf", "0580_w19_ms_42.pdf"),
    ("0580_w19_qp_43.pdf", "0580_w19_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2018
    # ════════════════════════════════════════════
    ("0580_m18_qp_22.pdf", "0580_m18_ms_22.pdf"),
    ("0580_m18_qp_42.pdf", "0580_m18_ms_42.pdf"),
    ("0580_s18_qp_21.pdf", "0580_s18_ms_21.pdf"),
    ("0580_s18_qp_22.pdf", "0580_s18_ms_22.pdf"),
    ("0580_s18_qp_23.pdf", "0580_s18_ms_23.pdf"),
    ("0580_s18_qp_41.pdf", "0580_s18_ms_41.pdf"),
    ("0580_s18_qp_42.pdf", "0580_s18_ms_42.pdf"),
    ("0580_s18_qp_43.pdf", "0580_s18_ms_43.pdf"),
    ("0580_w18_qp_21.pdf", "0580_w18_ms_21.pdf"),
    ("0580_w18_qp_22.pdf", "0580_w18_ms_22.pdf"),
    ("0580_w18_qp_23.pdf", "0580_w18_ms_23.pdf"),
    ("0580_w18_qp_41.pdf", "0580_w18_ms_41.pdf"),
    ("0580_w18_qp_42.pdf", "0580_w18_ms_42.pdf"),
    ("0580_w18_qp_43.pdf", "0580_w18_ms_43.pdf"),

    # ════════════════════════════════════════════
    # 2017
    # ════════════════════════════════════════════
    ("0580_m17_qp_22.pdf", "0580_m17_ms_22.pdf"),
    ("0580_m17_qp_42.pdf", "0580_m17_ms_42.pdf"),
    ("0580_s17_qp_21.pdf", "0580_s17_ms_21.pdf"),
    ("0580_s17_qp_22.pdf", "0580_s17_ms_22.pdf"),
    ("0580_s17_qp_23.pdf", "0580_s17_ms_23.pdf"),
    ("0580_s17_qp_41.pdf", "0580_s17_ms_41.pdf"),
    ("0580_s17_qp_42.pdf", "0580_s17_ms_42.pdf"),
    ("0580_s17_qp_43.pdf", "0580_s17_ms_43.pdf"),
    ("0580_w17_qp_21.pdf", "0580_w17_ms_21.pdf"),
    ("0580_w17_qp_22.pdf", "0580_w17_ms_22.pdf"),
    ("0580_w17_qp_23.pdf", "0580_w17_ms_23.pdf"),
    ("0580_w17_qp_41.pdf", "0580_w17_ms_41.pdf"),
    ("0580_w17_qp_42.pdf", "0580_w17_ms_42.pdf"),
    ("0580_w17_qp_43.pdf", "0580_w17_ms_43.pdf"),
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
    # Separate Paper 2 vs Paper 4 for reporting
    p2_files = [f for pair in PAPERS for f in pair if "_qp_2" in f or "_ms_2" in f]
    p4_files = [f for pair in PAPERS for f in pair if "_qp_4" in f or "_ms_4" in f]
    all_files = [f for pair in PAPERS for f in pair]
    total = len(all_files)

    print(f"Mathematics 0580 — Paper 2 + Paper 4 Extended, 2017–2025")
    print(f"  Paper 2 files : {len(p2_files)}")
    print(f"  Paper 4 files : {len(p4_files)}")
    print(f"  Total         : {total}\n")

    failed = []
    for i, filename in enumerate(all_files, 1):
        paper_tag = "P2" if "_qp_2" in filename or "_ms_2" in filename else "P4"
        print(f"[{i:>3}/{total}] [{paper_tag}]", end=" ")
        ok = download_file(filename)
        if not ok:
            failed.append(filename)
        time.sleep(1.5)  # polite delay

    downloaded = total - len(failed)
    print(f"\nDone!  {downloaded}/{total} downloaded successfully.")

    if failed:
        # Split failures by paper
        p2_fail = [f for f in failed if "_qp_2" in f or "_ms_2" in f]
        p4_fail = [f for f in failed if "_qp_4" in f or "_ms_4" in f]
        print(f"\nFailed ({len(failed)}):")
        if p2_fail:
            print(f"  Paper 2 ({len(p2_fail)}): {', '.join(p2_fail[:5])}{'…' if len(p2_fail)>5 else ''}")
        if p4_fail:
            print(f"  Paper 4 ({len(p4_fail)}): {', '.join(p4_fail[:5])}{'…' if len(p4_fail)>5 else ''}")
        print("\nNote: 2025 Oct/Nov papers may not be on the server yet.")
    else:
        print("\nAll files downloaded.")

    print("\nNext steps:")
    print("  1. python scripts/python/theory_pipeline.py --subject 0580")
    print("     (processes both Paper 2 and Paper 4 — neither is MCQ)")
    print("  2. npx tsx src/server/scripts/seed-mathematics-0580.ts   (if syllabus not seeded yet)")
    print("  3. npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
