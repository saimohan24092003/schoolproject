"""
Stricter deterministic QP diagram cropper (v2).

Targets clear student-facing diagrams only and rejects:
- header/logo crops,
- tiny fragments,
- line-like artifacts.

Usage:
  python scripts/python/crop_question_diagrams_v2.py --pdf 0653_m25_qp_12.pdf
  python scripts/python/crop_question_diagrams_v2.py --subject 0653 --year 2025
"""

from __future__ import annotations

import argparse
import json
import re
import struct
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
EXTRACTED_DIR = ROOT / "extracted_data"
DIAGRAMS_DIR = ROOT / "public" / "diagrams"
DEFAULT_MANIFEST = ROOT / "data" / "diagram_manifest_v2.json"

PDF_PASSWORD = "nokia2"
RESOLUTION = 160
MARGIN = 6
HEADER_TOP_PT = 70
MIN_IMG_W = 90
MIN_IMG_H = 60
MIN_VEC_W = 85
MIN_VEC_H = 55
MIN_OUT_W = 140
MIN_OUT_H = 80
MIN_OUT_BYTES = 1800
MAX_ASPECT = 16.0
MAX_CROPS_PER_Q = 6

RESOURCE_RE = re.compile(
    r"\b(fig(ure)?\.?\s*\d*\.?\d*|diagram|table\s*\d*|graph|chart|shown?)\b",
    re.IGNORECASE,
)
FNAME_RE = re.compile(r"^(\d{4})_([mswn])(\d{2})_qp_(\d{2,3})\.pdf$", re.IGNORECASE)


def parse_filename(name: str):
    m = FNAME_RE.match(name)
    if not m:
        return None
    return m.group(1), m.group(2).lower(), m.group(3), m.group(4)


def open_pdf(path: Path):
    try:
        return pdfplumber.open(str(path), password=PDF_PASSWORD)
    except Exception:
        return pdfplumber.open(str(path))


def png_meta(path: Path):
    try:
        data = path.read_bytes()
    except Exception:
        return None
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    w, h = struct.unpack(">II", data[16:24])
    return len(data), int(w), int(h)


def output_is_clear(path: Path) -> bool:
    meta = png_meta(path)
    if not meta:
        return False
    size_b, w, h = meta
    aspect = (w / h) if h else 999
    return (
        size_b >= MIN_OUT_BYTES
        and w >= MIN_OUT_W
        and h >= MIN_OUT_H
        and aspect <= MAX_ASPECT
    )


def make_name(subject: str, season: str, year2d: str, paper: str, page_num: int, q_num: int, idx: int):
    base = f"{subject}_{season}{year2d}_qp_{paper}_p{page_num}_q{q_num}"
    return base + (f"_i{idx}.png" if idx > 0 else ".png")


def find_regions(page):
    words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
    if not words:
        return []

    pw = page.width
    ph = page.height
    starts = []
    for w in words:
        t = w["text"].strip().rstrip(".")
        if re.fullmatch(r"\d{1,2}", t) and 1 <= int(t) <= 60 and float(w["x0"]) < pw * 0.15:
            starts.append((int(t), float(w["top"])))

    if not starts:
        return []
    starts.sort(key=lambda x: x[1])

    out = []
    for i, (q_no, y_top) in enumerate(starts):
        if y_top < HEADER_TOP_PT:
            continue
        y_bottom = starts[i + 1][1] if i + 1 < len(starts) else ph
        text = (page.within_bbox((0, y_top - 2, pw, y_bottom)).extract_text() or "").strip()
        if RESOURCE_RE.search(text):
            out.append({"q_no": q_no, "y_top": y_top, "y_bottom": y_bottom, "text": text[:500]})
    return out


def find_crops(page, y_top, y_bottom):
    pw, ph = page.width, page.height
    crops = []

    for img in getattr(page, "images", []):
        it = float(img["top"])
        ib = float(img["bottom"])
        iw = float(img["x1"]) - float(img["x0"])
        ih = ib - it
        if it < y_bottom and ib > y_top and iw >= MIN_IMG_W and ih >= MIN_IMG_H:
            if it < HEADER_TOP_PT and ib < HEADER_TOP_PT + 30:
                continue
            x0 = max(0, float(img["x0"]) - MARGIN)
            top = max(0, it - MARGIN)
            x1 = min(pw, float(img["x1"]) + MARGIN)
            bot = min(ph, ib + MARGIN)
            if x1 > x0 and bot > top:
                crops.append((x0, top, x1, bot, "embedded"))

    if crops:
        return crops[:MAX_CROPS_PER_Q]

    for rect in getattr(page, "rects", []) or []:
        rt = float(rect.get("top", rect.get("y0", 0)))
        rb = float(rect.get("bottom", rect.get("y1", 0)))
        rx0 = float(rect.get("x0", 0))
        rx1 = float(rect.get("x1", pw))
        if rt < y_bottom and rb > y_top:
            rw, rh = rx1 - rx0, rb - rt
            if rw > MIN_VEC_W and rh > MIN_VEC_H:
                x0 = max(0, rx0 - MARGIN)
                top = max(0, rt - MARGIN)
                x1 = min(pw, rx1 + MARGIN)
                bot = min(ph, rb + MARGIN)
                if x1 > x0 and bot > top:
                    crops.append((x0, top, x1, bot, "vector"))
    return crops[:MAX_CROPS_PER_Q]


def process_pdf(path: Path, subject: str, season: str, year2d: str, paper: str):
    entries = []
    with open_pdf(path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no == 1:
                continue
            regions = find_regions(page)
            if not regions:
                continue

            for region in regions:
                q_no = region["q_no"]
                crops = find_crops(page, region["y_top"], region["y_bottom"])
                if not crops:
                    entries.append(
                        {
                            "paper": path.name,
                            "page": page_no,
                            "question": q_no,
                            "status": "unresolved",
                            "filename": None,
                            "reason": "no-clear-crop-found",
                        }
                    )
                    continue

                for idx, (x0, top, x1, bot, src_type) in enumerate(crops):
                    png_name = make_name(subject, season, year2d, paper, page_no, q_no, idx if len(crops) > 1 else 0)
                    out_path = DIAGRAMS_DIR / png_name
                    try:
                        page.within_bbox((x0, top, x1, bot)).to_image(resolution=RESOLUTION).save(str(out_path))
                        if not output_is_clear(out_path):
                            out_path.unlink(missing_ok=True)
                            entries.append(
                                {
                                    "paper": path.name,
                                    "page": page_no,
                                    "question": q_no,
                                    "status": "rejected",
                                    "filename": None,
                                    "reason": "low-quality-output",
                                }
                            )
                            continue
                        entries.append(
                            {
                                "paper": path.name,
                                "page": page_no,
                                "question": q_no,
                                "status": "resolved",
                                "filename": f"/diagrams/{png_name}",
                                "source": src_type,
                                "safe_to_link_directly": len(crops) == 1,
                            }
                        )
                    except Exception as exc:
                        entries.append(
                            {
                                "paper": path.name,
                                "page": page_no,
                                "question": q_no,
                                "status": "error",
                                "filename": None,
                                "reason": str(exc),
                            }
                        )
    return entries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", help="single QP PDF filename in extracted_data/")
    ap.add_argument("--subject", help="subject code filter, e.g. 0653")
    ap.add_argument("--year", type=int, help="year filter, e.g. 2025")
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="manifest output path")
    args = ap.parse_args()

    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)
    Path(args.manifest).parent.mkdir(parents=True, exist_ok=True)

    if args.pdf:
        files = [EXTRACTED_DIR / (args.pdf if args.pdf.endswith(".pdf") else args.pdf + ".pdf")]
    else:
        files = sorted(EXTRACTED_DIR.glob("*_qp_*.pdf"))

    todo = []
    for f in files:
        meta = parse_filename(f.name)
        if not meta:
            continue
        subject, season, year2d, paper = meta
        if args.subject and subject != args.subject:
            continue
        if args.year and int("20" + year2d) != int(args.year):
            continue
        todo.append((f, subject, season, year2d, paper))

    all_entries = []
    for file_path, subject, season, year2d, paper in todo:
        print(f"Processing {file_path.name} ...")
        entries = process_pdf(file_path, subject, season, year2d, paper)
        all_entries.extend(entries)
        resolved = sum(1 for e in entries if e["status"] == "resolved")
        print(f"  refs={len(entries)} resolved={resolved}")

    manifest_path = Path(args.manifest)
    manifest_path.write_text(json.dumps(all_entries, indent=2), encoding="utf-8")

    resolved = sum(1 for e in all_entries if e.get("status") == "resolved")
    unresolved = sum(1 for e in all_entries if e.get("status") == "unresolved")
    rejected = sum(1 for e in all_entries if e.get("status") == "rejected")
    print("\nDone.")
    print(f"Total refs: {len(all_entries)}")
    print(f"Resolved: {resolved} | Unresolved: {unresolved} | Rejected(low quality): {rejected}")
    print(f"Manifest: {manifest_path}")
    print("Next: python scripts/link_diagrams.py")


if __name__ == "__main__":
    main()
