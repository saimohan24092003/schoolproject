"""
link_diagrams.py
Match high-quality QP diagram PNGs in public/diagrams/ to questions in
bulk_seeds_progress.json by paper + question number.

Run:
  python scripts/link_diagrams.py
"""

import json
import re
import struct
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).parent.parent
DIAGRAMS_DIR = ROOT / "public" / "diagrams"
SEEDS_FILE = ROOT / "bulk_seeds_progress.json"

# Reject tiny/corrupt crops that appear broken in UI.
MIN_BYTES = 1800
MIN_W = 120
MIN_H = 60


def read_png_meta(path: Path):
    try:
        data = path.read_bytes()
    except Exception:
        return None

    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return len(data), int(width), int(height)


def is_good_diagram(path: Path, quality_map: dict[str, tuple[int, int, int]]) -> bool:
    # Only use question-paper diagrams for student display.
    if "_ms_" in path.name.lower():
        return False

    meta = read_png_meta(path)
    if not meta:
        return False

    size_b, w, h = meta
    quality_map[path.name] = meta
    return size_b >= MIN_BYTES and w >= MIN_W and h >= MIN_H


def rank_score(src: str, quality_map: dict[str, tuple[int, int, int]]) -> int:
    name = src.split("/")[-1]
    size_b, w, h = quality_map.get(name, (0, 0, 0))
    area_score = w * h
    return area_score + (size_b * 2)


# Build index: {paper_stem}_q{number} -> ["/diagrams/file.png", ...]
diagram_index: dict[str, list[str]] = {}
diagram_quality: dict[str, tuple[int, int, int]] = {}
skipped_bad = 0

for file_path in sorted(DIAGRAMS_DIR.glob("*.png")):
    if not is_good_diagram(file_path, diagram_quality):
        skipped_bad += 1
        continue

    # Expected pattern:
    #   {paper_stem}_p{page}_q{qnum}.png
    #   {paper_stem}_p{page}_q{qnum}_i{idx}.png
    m = re.match(r"^(.+)_p\d+_q(\d+)(?:_i\d+)?$", file_path.stem)
    if not m:
        continue

    paper_stem = m.group(1)  # e.g. 0653_m20_qp_32
    q_num = int(m.group(2))
    key = f"{paper_stem}_q{q_num}"

    is_sub = bool(re.search(r"_i\d+$", file_path.stem))
    if key not in diagram_index:
        diagram_index[key] = []
    if not is_sub:
        diagram_index[key].insert(0, f"/diagrams/{file_path.name}")
    else:
        diagram_index[key].append(f"/diagrams/{file_path.name}")

print(
    f"[link_diagrams] Diagram groups: {len(diagram_index)} | "
    f"usable files: {len(diagram_quality)} | skipped low-quality: {skipped_bad}"
)

with open(SEEDS_FILE, encoding="utf-8") as fh:
    data = json.load(fh)

matched = 0
total = 0

for paper in data:
    source = paper.get("source", "") or paper.get("file", "") or paper.get("paper", "")
    paper_stem = source.replace(".pdf", "").strip()

    for q in paper.get("questions", []):
        total += 1
        q_num = q.get("number")
        if q_num is None:
            continue

        q_int = re.match(r"(\d+)", str(q_num))
        if not q_int:
            continue

        key = f"{paper_stem}_q{q_int.group(1)}"
        imgs = diagram_index.get(key, [])
        if not imgs:
            continue

        imgs = sorted(imgs, key=lambda s: rank_score(s, diagram_quality), reverse=True)
        q["imageSrc"] = imgs[0]
        if len(imgs) > 1:
            q["additionalImages"] = imgs[1:]
        matched += 1

print(f"[link_diagrams] Matched {matched}/{total} questions with clear diagrams")

with open(SEEDS_FILE, "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, indent=2)

print(f"[link_diagrams] Updated {SEEDS_FILE.name}")
print("[link_diagrams] Next: npx tsx src/server/scripts/seed-all-questions.ts")
