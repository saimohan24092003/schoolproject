"""
extract_maths_0580_direct.py  —  Pure pdfplumber extractor for IGCSE Maths 0580
                                  No AI/Gemini required.

Processes Paper 2 (short answer) and Paper 4 (extended) question papers + mark
schemes using pdfplumber text and table extraction.

Usage:
    python scripts/python/extract_maths_0580_direct.py [--limit N] [--dry-run]

Flags:
    --limit N     Stop after processing N new PDFs (default: no limit)
    --dry-run     Print what would be processed without writing anything
"""

import argparse
import json
import os
import re
import sys
import warnings

warnings.filterwarnings("ignore")

import pdfplumber

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR  = "extracted_data"
DIAGRAMS_DIR   = "public/diagrams"
PROGRESS_FILE  = "theory_seeds_progress.json"
PDF_PASSWORD   = "nokia2"

os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# Valid paper numbers for 0580 (Paper 2 = short-answer, Paper 4 = extended)
VALID_PAPERS   = {2, 4}

# Syllabus topics for 0580 — kept in sync with seed-mathematics-0580.ts
TOPICS_0580 = [
    "1.1 Types of numbers",
    "1.2 Fractions, decimals and percentages",
    "1.3 Powers and roots",
    "1.4 Ratio and proportion",
    "1.5 Estimation and bounds",
    "1.6 Speed, distance and time",
    "2.1 Algebraic manipulation",
    "2.2 Solving equations",
    "2.3 Inequalities",
    "2.4 Sequences",
    "2.5 Functions",
    "2.6 Graphs of functions",
    "3.1 Straight-line graphs",
    "3.2 Distance and midpoint",
    "3.3 Graphs in real-life contexts",
    "4.1 Angles and lines",
    "4.2 Triangles and quadrilaterals",
    "4.3 Circles",
    "4.4 Constructions and loci",
    "5.1 Perimeter and area",
    "5.2 Volume and surface area",
    "5.3 Similar shapes",
    "6.1 Right-angled triangles",
    "6.2 Sine and cosine rules",
    "6.3 Trigonometric graphs",
    "6.4 3D trigonometry",
    "7.1 Transformations",
    "7.2 Vectors",
    "7.3 Vector geometry",
    "8.1 Probability",
    "8.2 Statistical diagrams",
    "8.3 Measures of central tendency",
    "8.4 Spread and correlation",
]

# Quick-lookup: first 4 chars of topic keyword → official topic string
# e.g. "alge" → "2.1 Algebraic manipulation"
KEYWORD_MAP: dict[str, str] = {}
for _t in TOPICS_0580:
    # Use word after the dot-number prefix
    _words = _t.split(" ", 1)
    if len(_words) > 1:
        KEYWORD_MAP[_words[1][:4].lower()] = _t

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_progress() -> list:
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_progress(data: list) -> None:
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_paper_num(filename: str) -> int:
    """Extract the first digit of the paper code, e.g. _qp_21 → 2, _qp_42 → 4."""
    m = re.search(r"_qp_(\d)", filename, re.I)
    return int(m.group(1)) if m else 0


def find_ms_file(qp_name: str) -> str | None:
    ms_name = re.sub(r"_qp_", "_ms_", qp_name, flags=re.I)
    return ms_name if os.path.exists(os.path.join(EXTRACTED_DIR, ms_name)) else None


def open_pdf(path: str):
    """Open PDF, trying without then with password."""
    try:
        pdf = pdfplumber.open(path)
        _ = pdf.pages[0].extract_text()  # force-open to detect password errors
        return pdf
    except Exception:
        try:
            return pdfplumber.open(path, password=PDF_PASSWORD)
        except Exception as e:
            print(f"  FAILED to open {os.path.basename(path)}: {e}")
            return None


def extract_images(pdf_path: str) -> dict[int, list[str]]:
    """Extract page images to DIAGRAMS_DIR, return {page: [/diagrams/fname, ...]}."""
    pdf_name = os.path.basename(pdf_path)
    mapping: dict[int, list[str]] = {}
    pdf = open_pdf(pdf_path)
    if not pdf:
        return mapping
    with pdf:
        for i, page in enumerate(pdf.pages, start=1):
            for idx, img in enumerate(page.images):
                try:
                    x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                    if x1 > x0 and bot > top:
                        fname = f"{pdf_name}_{i}_{idx}.png"
                        fpath = os.path.join(DIAGRAMS_DIR, fname)
                        if not os.path.exists(fpath):
                            page.within_bbox((x0, top, x1, bot)).to_image(resolution=150).save(fpath)
                        mapping.setdefault(i, []).append(f"/diagrams/{fname}")
                except Exception:
                    pass
    return mapping


# ── QP parser ────────────────────────────────────────────────────────────────

# Matches major-question lines, including:
#   - "1 Some text"
#   - "1 (a) Some text"
#   - "2" (bare number, text may follow on next line)
_RE_MAJOR = re.compile(
    r"^\s*(\d+)"                           # major question number
    r"(?=\s|\(|$)"                         # prevent matching decimals like 17.8
    r"(?:\s*\(([a-z]+)\))?"                # optional inline part marker
    r"(?:\s+(.*))?$",                      # optional inline text
    re.I
)
# Matches sub-part lines: (a), (b), ... with optional text
_RE_ALPHA   = re.compile(r"^\(([a-z])\)\s*(.*)$", re.I)
# Matches sub-sub-part lines: (i), (ii), ... with optional text
_RE_ROMAN   = re.compile(r"^\(([ivx]+)\)\s*(.*)$", re.I)
# Inline mark allocation, e.g. "[2]" at end of line
_RE_MARKS   = re.compile(r"\[(\d+)\]")
# Lines to skip: site/copyright headers
_RE_SKIP    = re.compile(
    r"www\."                              # website header
    r"|© UCLES"                           # copyright line
    r"|Cambridge (International|IGCSE)"  # header
    r"|Turn over"                         # footer
    r"|BLANK PAGE"
    r"|\[Turn over\]",
    re.I
)


def _extract_marks(text: str) -> tuple[int, str]:
    """Return (total_marks, text_without_mark_bracket)."""
    marks = sum(int(m) for m in _RE_MARKS.findall(text))
    clean = _RE_MARKS.sub("", text).strip()
    return marks, clean


def _is_roman_token(token: str) -> bool:
    return bool(re.fullmatch(r"[ivx]+", token, re.I))


def _pop_leading_roman(text: str) -> tuple[str | None, str]:
    """
    If text starts with "(i)/(ii)/..." return (roman, rest), else (None, text).
    Handles compact forms like "(a)(i) text" after alpha parsing.
    """
    m = re.match(r"^\(([ivx]+)\)\s*(.*)$", text, re.I)
    if not m:
        return None, text
    return m.group(1).lower(), m.group(2)


def parse_qp(pdf_path: str, qp_images: dict[int, list[str]]) -> list[dict]:
    """
    Extract raw questions from a 0580 question paper.
    Returns list of {number, text, marks, page, imageSrc}.
    State is maintained across pages so multi-page questions are handled correctly.
    """
    questions: list[dict] = []
    pdf = open_pdf(pdf_path)
    if not pdf:
        return questions

    # State shared across all pages
    major_num      = None
    next_major     = 1      # sequential validation: only accept N if N == next_major
    alpha_part     = None
    roman_part     = None
    buffer: list[str] = []
    marks_buf      = 0
    cur_page       = 1
    cur_images: list[str] = []

    def flush():
        nonlocal buffer, marks_buf
        if not buffer or major_num is None:
            buffer    = []
            marks_buf = 0
            return
        text = " ".join(buffer).strip()
        marks_total = marks_buf
        buffer    = []
        marks_buf = 0
        if not text:
            return

        num = str(major_num)
        if alpha_part:
            num += f"({alpha_part})"
        if roman_part:
            num += f"({roman_part})"

        img_src = cur_images[0] if cur_images else None
        questions.append({
            "number":   num,
            "text":     text,
            "marks":    marks_total,
            "page":     cur_page,
            "imageSrc": img_src,
        })

    with pdf:
        # Skip cover page (page 1)
        for page_num, page in enumerate(pdf.pages[1:], start=2):
            cur_page   = page_num
            cur_images = qp_images.get(page_num, [])
            raw        = page.extract_text() or ""

            for line in raw.splitlines():
                line = line.strip()
                if not line or _RE_SKIP.search(line):
                    continue
                # Skip only the actual page-number footer/header line.
                # Do NOT skip other bare numbers, because some papers put
                # major question starts on a line by themselves ("2", "5", ...).
                if re.fullmatch(r"\d{1,3}", line) and int(line) == page_num:
                    continue

                m_major = _RE_MAJOR.match(line)
                m_roman = _RE_ROMAN.match(line)
                m_alpha = _RE_ALPHA.match(line)

                if m_major:
                    candidate = int(m_major.group(1))
                    # Only accept if this is the next sequential question number
                    # (avoids picking up numbers from diagram captions / formulas)
                    if candidate == next_major:
                        flush()
                        major_num  = candidate
                        next_major = candidate + 1
                        inline_part = (m_major.group(2) or "").lower()
                        text_raw    = (m_major.group(3) or "").strip()
                        if inline_part:
                            if _is_roman_token(inline_part):
                                alpha_part = None
                                roman_part = inline_part
                            else:
                                alpha_part = inline_part
                                roman_part = None
                                leading_roman, text_raw = _pop_leading_roman(text_raw)
                                if leading_roman:
                                    roman_part = leading_roman
                        else:
                            alpha_part = None
                            roman_part = None
                        mk, clean  = _extract_marks(text_raw or "")
                        marks_buf  = mk
                        buffer     = [clean] if clean else []
                    else:
                        # Not the expected next question — treat as continuation text
                        mk, clean = _extract_marks(line)
                        marks_buf += mk
                        if clean:
                            buffer.append(clean)

                elif m_roman and major_num is not None:
                    # Roman sub-sub-part, e.g. (i), (ii), ...
                    flush()
                    roman_part = m_roman.group(1).lower()
                    mk, clean  = _extract_marks(m_roman.group(2) or "")
                    marks_buf  = mk
                    buffer     = [clean] if clean else []

                elif m_alpha and major_num is not None:
                    # Alpha sub-part, e.g. (a), (b), ...
                    flush()
                    alpha_part = m_alpha.group(1).lower()
                    roman_part = None
                    text_raw   = m_alpha.group(2) or ""
                    leading_roman, text_raw = _pop_leading_roman(text_raw)
                    if leading_roman:
                        roman_part = leading_roman
                    mk, clean = _extract_marks(text_raw)
                    marks_buf  = mk
                    buffer     = [clean] if clean else []

                else:
                    mk, clean = _extract_marks(line)
                    marks_buf += mk
                    if clean:
                        buffer.append(clean)

    flush()
    return questions


# ── MS parser ────────────────────────────────────────────────────────────────

_RE_MS_NUM = re.compile(r"^\d+\s*[\(\s]", re.I)
_RE_ALPHA_PART = re.compile(r"\(([a-z])\)", re.I)
_RE_ROMAN_PART = re.compile(r"\(([ivxlc]+)\)", re.I)


def _clean(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _detect_layout(table: list[list]) -> tuple[int, int, int, int] | None:
    """
    Detect column offsets (q_col, ans_col, marks_col, partial_col) from the table.
    Two known layouts:
      - 4-col  (2017 format):  0 | 1 | 2 | 3
      - 12-col (2023 format):  0 | 3 | 6 | 9
    Returns None if layout is unrecognised.
    """
    for row in table:
        if not row:
            continue
        ncols = len(row)
        if ncols >= 12:
            return (0, 3, 6, 9)
        if ncols >= 4:
            return (0, 1, 2, 3)
    return None


def _normalise_num(raw: str) -> str:
    """'13 (a)(i)' → '13(a)(i)', strip whitespace."""
    return re.sub(r"\s+", "", raw).lower()


def _expand_multipart_row(raw_num: str, answer: str, marks_str: str, partial: str
                          ) -> list[tuple[str, str, int, str]]:
    """
    Some 2017 rows encode multiple sub-parts in one cell, e.g.:
        raw_num = "13 (a)\n(b)"  answer = "5c...\n(2p−m)..."  marks = "2\n2"
    We split these and return one tuple per sub-part.
    Each tuple: (normalised_number, answer, marks_int, partial)
    """
    num_parts    = [l.strip() for l in raw_num.splitlines() if l.strip()]
    ans_parts    = [l.strip() for l in answer.splitlines() if l.strip()]
    marks_parts  = [l.strip() for l in marks_str.splitlines() if l.strip()]

    results: list[tuple[str, str, int, str]] = []

    # Build the base question number (just the digits)
    base_match = re.match(r"(\d+)", num_parts[0])
    base_num   = base_match.group(1) if base_match else num_parts[0]

    # Collect all (alpha, roman) parts explicitly named in the cell
    sub_parts: list[str] = []
    for chunk in num_parts:
        alpha = re.findall(r"\(([a-z])\)", chunk, re.I)
        roman = re.findall(r"\(([ivxlc]+)\)", chunk, re.I)
        if alpha:
            sub_parts.extend(f"({p})" for p in alpha)
        if roman:
            sub_parts.extend(f"({p})" for p in roman)

    if not sub_parts:
        # Simple single row with no sub-parts labelled — use as-is
        mk = int(marks_parts[0]) if marks_parts and marks_parts[0].isdigit() else 0
        norm = _normalise_num(num_parts[0])
        return [(norm, answer, mk, partial)]

    # Pair sub-parts with their answers/marks (best-effort by index)
    for i, sp in enumerate(sub_parts):
        norm = _normalise_num(base_num + sp)
        ans  = ans_parts[i]  if i < len(ans_parts)  else ""
        mstr = marks_parts[i] if i < len(marks_parts) else "0"
        mk   = int(mstr) if mstr.isdigit() else 0
        results.append((norm, ans, mk, partial))

    return results


def parse_ms(pdf_path: str) -> dict[str, dict]:
    """
    Parse a 0580 mark-scheme PDF using table extraction.
    Returns {question_number: {answer, marks, partial}}.

    Handles two table layouts:
      - 4-col  (2017 format): col 0=Question, 1=Answer, 2=Marks, 3=Part Marks
      - 12-col (2023 format): col 0=Question, 3=Answer, 6=Marks, 9=Part Marks
    """
    answers: dict[str, dict] = {}
    pdf = open_pdf(pdf_path)
    if not pdf:
        return answers

    with pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in (tables or []):
                layout = _detect_layout(table)
                if layout is None:
                    continue
                q_col, ans_col, marks_col, partial_col = layout

                for row in table:
                    if not row or len(row) <= max(q_col, ans_col, marks_col, partial_col):
                        continue
                    raw_num = _clean(row[q_col])
                    if not raw_num or not re.match(r"\d", raw_num):
                        continue
                    answer  = _clean(row[ans_col])
                    marks   = _clean(row[marks_col])
                    partial = _clean(row[partial_col])

                    for norm, ans, mk, part in _expand_multipart_row(raw_num, answer, marks, partial):
                        answers[norm] = {"answer": ans, "marks": mk, "partial": part}

    return answers


# ── Topic inference ───────────────────────────────────────────────────────────

def infer_topic(question_text: str, question_number: str) -> str:
    """
    Best-effort topic assignment based on keywords in the question text.
    Falls back to the generic topic for the question number group.
    """
    text_lower = question_text.lower()

    # Ordered keyword → topic mapping (most specific first)
    KEYWORD_RULES: list[tuple[str, str]] = [
        # Statistics
        ("histogram",          "8.2 Statistical diagrams"),
        ("cumulative frequency","8.2 Statistical diagrams"),
        ("stem-and-leaf",      "8.2 Statistical diagrams"),
        ("scatter",            "8.4 Spread and correlation"),
        ("correlation",        "8.4 Spread and correlation"),
        ("mean",               "8.3 Measures of central tendency"),
        ("median",             "8.3 Measures of central tendency"),
        ("mode",               "8.3 Measures of central tendency"),
        ("probability",        "8.1 Probability"),
        # Trigonometry / Vectors
        ("sine rule",          "6.2 Sine and cosine rules"),
        ("cosine rule",        "6.2 Sine and cosine rules"),
        ("3d",                 "6.4 3D trigonometry"),
        ("pythagoras",         "6.1 Right-angled triangles"),
        ("trigon",             "6.1 Right-angled triangles"),
        ("sin ", "6.1 Right-angled triangles"),
        ("cos ", "6.1 Right-angled triangles"),
        ("tan ", "6.1 Right-angled triangles"),
        ("vector",             "7.2 Vectors"),
        ("transform",          "7.1 Transformations"),
        ("reflect",            "7.1 Transformations"),
        ("rotat",              "7.1 Transformations"),
        ("translat",           "7.1 Transformations"),
        ("enlarg",             "7.1 Transformations"),
        # Mensuration
        ("volume",             "5.2 Volume and surface area"),
        ("surface area",       "5.2 Volume and surface area"),
        ("similar",            "5.3 Similar shapes"),
        ("perimeter",          "5.1 Perimeter and area"),
        ("area",               "5.1 Perimeter and area"),
        # Geometry
        ("circle",             "4.3 Circles"),
        ("arc",                "4.3 Circles"),
        ("chord",              "4.3 Circles"),
        ("tangent",            "4.3 Circles"),
        ("angle",              "4.1 Angles and lines"),
        ("bearing",            "4.1 Angles and lines"),
        ("parallel",           "4.1 Angles and lines"),
        ("triangle",           "4.2 Triangles and quadrilaterals"),
        ("quadrilateral",      "4.2 Triangles and quadrilaterals"),
        ("polygon",            "4.2 Triangles and quadrilaterals"),
        ("construct",          "4.4 Constructions and loci"),
        ("locus",              "4.4 Constructions and loci"),
        # Coordinate / Graphs
        ("gradient",           "3.1 Straight-line graphs"),
        ("straight-line",      "3.1 Straight-line graphs"),
        ("midpoint",           "3.2 Distance and midpoint"),
        ("distance",           "3.2 Distance and midpoint"),
        ("speed",              "3.3 Graphs in real-life contexts"),
        ("travel graph",       "3.3 Graphs in real-life contexts"),
        # Algebra
        ("sequence",           "2.4 Sequences"),
        ("nth term",           "2.4 Sequences"),
        ("function",           "2.5 Functions"),
        ("inequalit",          "2.3 Inequalities"),
        ("simultaneous",       "2.2 Solving equations"),
        ("quadratic",          "2.2 Solving equations"),
        ("equation",           "2.2 Solving equations"),
        ("expand",             "2.1 Algebraic manipulation"),
        ("factoris",           "2.1 Algebraic manipulation"),
        ("simplif",            "2.1 Algebraic manipulation"),
        ("expression",         "2.1 Algebraic manipulation"),
        ("graph of",           "2.6 Graphs of functions"),
        # Number
        ("bound",              "1.5 Estimation and bounds"),
        ("estimat",            "1.5 Estimation and bounds"),
        ("speed",              "1.6 Speed, distance and time"),
        ("ratio",              "1.4 Ratio and proportion"),
        ("proportion",         "1.4 Ratio and proportion"),
        ("percentage",         "1.2 Fractions, decimals and percentages"),
        ("fraction",           "1.2 Fractions, decimals and percentages"),
        ("decimal",            "1.2 Fractions, decimals and percentages"),
        ("power",              "1.3 Powers and roots"),
        ("root",               "1.3 Powers and roots"),
        ("standard form",      "1.3 Powers and roots"),
        ("prime",              "1.1 Types of numbers"),
        ("integer",            "1.1 Types of numbers"),
        ("factor",             "1.1 Types of numbers"),
        ("multiple",           "1.1 Types of numbers"),
    ]

    for keyword, topic in KEYWORD_RULES:
        if keyword in text_lower:
            return topic

    return "1.1 Types of numbers"  # safest fallback


# ── Merge QP + MS ─────────────────────────────────────────────────────────────

def merge(qp_questions: list[dict], ms_answers: dict[str, dict],
          source: str, paper_type: str) -> list[dict]:
    """
    Combine parsed QP questions with MS answers.
    Returns list in the same format as theory_pipeline.py produces.
    """
    merged = []
    for q in qp_questions:
        num = q["number"]
        # Normalise for lookup: "1(a)(i)" → "1(a)(i)", strip spaces
        num_norm = re.sub(r"\s+", "", num).lower()
        ms = ms_answers.get(num_norm, {})

        question_text = q["text"]
        answer_text   = ms.get("answer", "")
        partial       = ms.get("partial", "")
        marks         = ms.get("marks") or q["marks"] or 1

        # Build a rich marking scheme answer
        if partial:
            marking = f"{answer_text}\n{partial}" if answer_text else partial
        else:
            marking = answer_text or "(See mark scheme)"

        topic = infer_topic(question_text, num)

        merged.append({
            "number":              num,
            "topic":               topic,
            "question":            question_text,
            "markingSchemeAnswer": marking,
            "totalMarks":          marks,
            "imageSrc":            q.get("imageSrc"),
            "paperType":           paper_type,  # "P2" or "P4"
        })

    return merged


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract 0580 Maths questions without AI.")
    parser.add_argument("--limit",   type=int, default=0, help="Max PDFs to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true",  help="Print plan without writing")
    args = parser.parse_args()

    all_data  = load_progress()
    processed = {d["source"] for d in all_data}

    # Collect 0580 Paper 2 and Paper 4 QP files
    all_pdfs = sorted([
        f for f in os.listdir(EXTRACTED_DIR)
        if f.startswith("0580") and "_qp_" in f.lower() and f.endswith(".pdf")
        and get_paper_num(f) in VALID_PAPERS
    ])

    to_process = [f for f in all_pdfs if f not in processed]
    print(f"Found {len(all_pdfs)} 0580 P2/P4 files | {len(to_process)} need processing")

    if not to_process:
        print("Nothing to do.")
        return

    valid_imgs = {
        f"/diagrams/{f}"
        for f in os.listdir(DIAGRAMS_DIR) if f.lower().endswith(".png")
    }

    done = 0
    for qp_name in to_process:
        if args.limit and done >= args.limit:
            print(f"Reached limit of {args.limit}.")
            break

        ms_name = find_ms_file(qp_name)
        if not ms_name:
            print(f"  No mark scheme for {qp_name} — skipping")
            continue

        paper_num  = get_paper_num(qp_name)
        paper_type = f"P{paper_num}"
        print(f"\n[{paper_type}] {qp_name}")

        if args.dry_run:
            print(f"  → would process with MS: {ms_name}")
            done += 1
            continue

        qp_path = os.path.join(EXTRACTED_DIR, qp_name)
        ms_path = os.path.join(EXTRACTED_DIR, ms_name)

        # Extract images from QP
        qp_images = extract_images(qp_path)

        # Parse QP questions and MS answers
        qp_questions = parse_qp(qp_path, qp_images)
        ms_answers   = parse_ms(ms_path)

        if not qp_questions:
            print("  No questions extracted — skipping")
            continue

        print(f"  QP: {len(qp_questions)} questions | MS: {len(ms_answers)} answers matched")

        questions = merge(qp_questions, ms_answers, qp_name, paper_type)

        # Validate imageSrc — clear hallucinated or missing paths
        for q in questions:
            if q.get("imageSrc") and q["imageSrc"] not in valid_imgs:
                q["imageSrc"] = None

        all_data.append({
            "source":     qp_name,
            "ms_source":  ms_name,
            "paperType":  paper_type,
            "questions":  questions,
        })
        save_progress(all_data)
        done += 1
        print(f"  Saved {len(questions)} questions ({paper_type})")

    total_q  = sum(len(p["questions"]) for p in all_data if p["source"].startswith("0580"))
    print(f"\nDone! {done} PDFs processed. 0580 total: {total_q} questions")
    print("Next: npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
