"""
Deterministic IGCSE diagram/table cropper for Cambridge QP PDFs (0653 & 0680).

For every question referencing a diagram/figure/table:
  1. Detects question regions on each page using word-level bboxes.
  2. Finds embedded images (page.images) inside the question region.
  3. Falls back to vector-figure detection (page.rects) when no embedded image found.
  4. Crops and saves PNG to public/diagrams/ with a deterministic filename that
     matches the resource-fallback.ts resolver prefix pattern.
  5. Writes/updates data/diagram_manifest.json.

Filename scheme:
  {subject}_{season}{year}_qp_{paper}_p{page}_q{qnum}[_i{idx}].png
  e.g.  0653_m25_qp_12_p4_q7.png

Usage:
    python scripts/python/crop_question_diagrams.py
    python scripts/python/crop_question_diagrams.py --pdf 0653_m25_qp_12.pdf
    python scripts/python/crop_question_diagrams.py --subject 0653
    python scripts/python/crop_question_diagrams.py --subject 0680 --year 2024
"""

import os, sys, re, json, argparse
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PDF_PASSWORD  = "nokia2"
EXTRACTED_DIR = "extracted_data"
DIAGRAMS_DIR  = "public/diagrams"
MANIFEST_FILE = "data/diagram_manifest.json"
RESOLUTION    = 150          # DPI for output PNGs
MARGIN        = 6            # padding in pts around each crop
MIN_IMG_W     = 60           # pts — ignore tiny embedded images (glyphs, watermarks)
MIN_IMG_H     = 40
MAX_CROPS_PER_Q = 6          # hard cap — more than this is almost certainly noise

RESOURCE_RE = re.compile(
    r"\b(fig(ure)?\.?\s*\d*\.?\d*|diagram|table\s*\d*|graph|chart|show[ns]?)\b",
    re.IGNORECASE,
)

FNAME_RE = re.compile(r"^(\d{4})_([mswn])(\d{2})_qp_(\d{2,3})\.pdf$", re.IGNORECASE)

SEASON_MAP = {"m": "Feb/Mar", "s": "May/Jun", "w": "Oct/Nov", "n": "Oct/Nov"}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def parse_filename(fname):
    m = FNAME_RE.match(fname)
    return (m.group(1), m.group(2).lower(), m.group(3), m.group(4)) if m else None


def open_pdf(path):
    try:
        return pdfplumber.open(path, password=PDF_PASSWORD)
    except Exception:
        return pdfplumber.open(path)


def make_png_name(subject, season, year2d, paper, page_num, q_num, idx=0):
    base = f"{subject}_{season}{year2d}_qp_{paper}_p{page_num}_q{q_num}"
    return base + (f"_i{idx}.png" if idx > 0 else ".png")


# ---------------------------------------------------------------------------
# per-page analysis
# ---------------------------------------------------------------------------

def find_question_regions(page):
    """
    Return list of dicts for questions referencing a diagram on this page.
    Each dict: {q_num, y_top, y_bottom, text}
    """
    words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
    if not words:
        return []

    pw = page.width
    ph = page.height

    # Detect question-number tokens on left margin (x0 < 15% page width, text = 1-2 digit int)
    starts = []
    for w in words:
        t = w["text"].strip().rstrip(".")
        if re.fullmatch(r"\d{1,2}", t) and 1 <= int(t) <= 60 and w["x0"] < pw * 0.15:
            starts.append((int(t), float(w["top"])))

    if not starts:
        return []

    starts.sort(key=lambda x: x[1])

    regions = []
    for i, (qnum, y_top) in enumerate(starts):
        y_bottom = starts[i + 1][1] if i + 1 < len(starts) else ph
        region_text = (page.within_bbox((0, y_top - 2, pw, y_bottom)).extract_text() or "").strip()
        if RESOURCE_RE.search(region_text):
            regions.append({
                "q_num": qnum,
                "y_top": y_top,
                "y_bottom": y_bottom,
                "text": region_text[:500],
            })

    return regions


def find_crops_in_region(page, y_top, y_bottom):
    """
    Return list of (x0, top, x1, bot, src_type) for images inside [y_top, y_bottom].
    Tries embedded images first, then vector rects.
    """
    pw = page.width
    ph = page.height
    crops = []

    # 1 — embedded raster images (skip tiny glyphs/watermarks)
    for img in getattr(page, "images", []):
        it = float(img["top"])
        ib = float(img["bottom"])
        iw = float(img["x1"]) - float(img["x0"])
        ih = ib - it
        if it < y_bottom and ib > y_top and iw >= MIN_IMG_W and ih >= MIN_IMG_H:
            x0  = max(0,  float(img["x0"])  - MARGIN)
            top = max(0,  it                 - MARGIN)
            x1  = min(pw, float(img["x1"])  + MARGIN)
            bot = min(ph, ib                + MARGIN)
            if x1 > x0 and bot > top:
                crops.append((x0, top, x1, bot, "embedded"))

    if crops:
        return crops[:MAX_CROPS_PER_Q]

    # 2 — vector rectangles (figure boxes, table borders)
    for rect in getattr(page, "rects", []) or []:
        rt = float(rect.get("top",    rect.get("y0", 0)))
        rb = float(rect.get("bottom", rect.get("y1", 0)))
        rx0 = float(rect.get("x0", 0))
        rx1 = float(rect.get("x1", pw))
        if rt < y_bottom and rb > y_top:
            w_pt = rx1 - rx0
            h_pt = rb - rt
            if w_pt > 50 and h_pt > 30:          # ignore thin borders/lines
                x0  = max(0,  rx0 - MARGIN)
                top = max(0,  rt  - MARGIN)
                x1  = min(pw, rx1 + MARGIN)
                bot = min(ph, rb  + MARGIN)
                if x1 > x0 and bot > top:
                    crops.append((x0, top, x1, bot, "vector"))

    return crops[:MAX_CROPS_PER_Q]


# ---------------------------------------------------------------------------
# process one PDF
# ---------------------------------------------------------------------------

def process_pdf(pdf_path, subject, season, year2d, paper):
    fname = os.path.basename(pdf_path)
    entries = []

    try:
        pdf = open_pdf(pdf_path)
    except Exception as e:
        print(f"  ERROR opening {fname}: {e}")
        return []

    with pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            regions = find_question_regions(page)
            if not regions:
                continue

            for region in regions:
                qnum  = region["q_num"]
                ytop  = region["y_top"]
                ybot  = region["y_bottom"]
                qtext = region["text"]

                crops = find_crops_in_region(page, ytop, ybot)
                multi = len(crops) > 1

                if not crops:
                    entries.append({
                        "paper": fname, "subject": subject,
                        "season": SEASON_MAP.get(season, season),
                        "year": f"20{year2d}", "page": page_num,
                        "question": qnum, "question_stem": qtext[:250],
                        "crop": None, "filename": None,
                        "description": "UNRESOLVED – no image region detected",
                        "has_multiple_diagrams": False,
                        "safe_to_link_directly": False,
                        "status": "unresolved",
                    })
                    continue

                for idx, (x0, top, x1, bot, src_type) in enumerate(crops):
                    png_name = make_png_name(subject, season, year2d, paper, page_num, qnum,
                                             idx if multi else 0)
                    out_path = os.path.join(DIAGRAMS_DIR, png_name)
                    web_path = f"/diagrams/{png_name}"

                    if os.path.exists(out_path):
                        print(f"    [exists] {png_name}")
                    else:
                        try:
                            page.within_bbox((x0, top, x1, bot)).to_image(resolution=RESOLUTION).save(out_path)
                            print(f"    [saved]  {png_name}  ({src_type})")
                        except Exception as e:
                            print(f"    [ERROR]  {png_name}: {e}")
                            web_path = None

                    entries.append({
                        "paper": fname, "subject": subject,
                        "season": SEASON_MAP.get(season, season),
                        "year": f"20{year2d}", "page": page_num,
                        "question": qnum, "question_stem": qtext[:250],
                        "crop": {"x0": round(x0,1), "y0": round(top,1),
                                 "x1": round(x1,1), "y1": round(bot,1)},
                        "filename": web_path,
                        "description": f"{src_type} – page {page_num} Q{qnum}"
                                       + (" [one of multiple]" if multi else ""),
                        "has_multiple_diagrams": multi,
                        "safe_to_link_directly": not multi and web_path is not None,
                        "status": "resolved" if web_path else "error",
                    })

    return entries


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf",     help="single PDF filename in extracted_data/")
    ap.add_argument("--subject", help="filter by subject code, e.g. 0653")
    ap.add_argument("--year",    type=int, help="filter by year, e.g. 2025")
    args = ap.parse_args()

    os.makedirs(DIAGRAMS_DIR, exist_ok=True)
    os.makedirs("data", exist_ok=True)

    # Load existing manifest
    manifest = []
    if os.path.exists(MANIFEST_FILE):
        try:
            manifest = json.load(open(MANIFEST_FILE, encoding="utf-8"))
        except Exception:
            pass

    already_done = {e["paper"] for e in manifest}

    # Collect PDFs to process
    if args.pdf:
        raw = [args.pdf if args.pdf.endswith(".pdf") else args.pdf + ".pdf"]
    else:
        raw = sorted(f for f in os.listdir(EXTRACTED_DIR) if "_qp_" in f and f.endswith(".pdf"))

    todo = []
    for fname in raw:
        meta = parse_filename(fname)
        if not meta:
            continue
        subject, season, year2d, paper = meta
        if args.subject and subject != args.subject:
            continue
        if args.year and f"20{year2d}" != str(args.year):
            continue
        if fname in already_done:
            print(f"[skip] {fname}  (already in manifest)")
            continue
        todo.append((fname, subject, season, year2d, paper))

    print(f"\nProcessing {len(todo)} QP PDFs …\n")

    for fname, subject, season, year2d, paper in todo:
        pdf_path = os.path.join(EXTRACTED_DIR, fname)
        if not os.path.exists(pdf_path):
            print(f"[skip] {fname}  not found")
            continue
        print(f"→ {fname}")
        entries = process_pdf(pdf_path, subject, season, year2d, paper)
        resolved = sum(1 for e in entries if e["status"] == "resolved")
        print(f"   {len(entries)} refs  |  {resolved} resolved  |  {len(entries)-resolved} unresolved\n")
        manifest.extend(entries)

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # Summary
    total      = len(manifest)
    resolved   = sum(1 for e in manifest if e.get("status") == "resolved")
    unresolved = sum(1 for e in manifest if e.get("status") == "unresolved")
    multi      = sum(1 for e in manifest if e.get("has_multiple_diagrams"))
    safe       = sum(1 for e in manifest if e.get("safe_to_link_directly"))

    print("=" * 50)
    print(f"Total diagram refs : {total}")
    print(f"Resolved           : {resolved}")
    print(f"Unresolved         : {unresolved}")
    print(f"Multi-diagram Qs   : {multi}  (flag: pick manually)")
    print(f"Safe to link direct: {safe}")
    pct = round(100 * resolved / total, 1) if total else 0
    print(f"Resolution rate    : {pct}%  (target < 5% unresolved)")
    print(f"\nManifest → {MANIFEST_FILE}")
    print(f"PNGs     → {DIAGRAMS_DIR}/")
    print(f"\nNext: npx tsx src/server/scripts/seed-all-questions.ts")


if __name__ == "__main__":
    main()
