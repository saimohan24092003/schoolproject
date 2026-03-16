"""
extract_0500_direct.py  —  NO AI, pure pdfplumber + regex

Correctly parses Cambridge IGCSE English First Language (0500) paper format:
  QP:  "Question 1" header  →  sub-parts "(a)", "(b)(i)" etc.
  MS:  "1(a) [repeated question] [marks]" then bullet-point answers

Saves to: theory_seeds_progress.json
Usage:
    python scripts/python/extract_0500_direct.py
"""

import os, re, sys, json
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR = "extracted_data"
PROGRESS_FILE = "theory_seeds_progress.json"
PDF_PASSWORD  = "nokia2"

# ── Topic classifier ──────────────────────────────────────────────────────────

TOPIC_RULES = [
    ("1.6 Summary writing",
     re.compile(r"\bsummari[sz]", re.I)),
    ("1.5 Note-making",
     re.compile(r"\bnotes?\b|\bheadings?\b|\bnote.mak", re.I)),
    ("1.4 Reading for meaning — language and effect",
     re.compile(r"\blanguage\b|\beffect\b|\bhow does the writer\b|\bword choice\b|\bphrase\b|\bimagery\b|\bmetaphor\b|\bsimile\b|\bliterary", re.I)),
    ("1.3 Reading for meaning — inference and deduction",
     re.compile(r"\bsuggest\b|\bimpl[yi]\b|\bexplain\b|\bhow does\b|\bwhat do\b|\binfer\b|\busing your own words\b", re.I)),
    ("1.2 Reading for ideas — tone, attitude and bias",
     re.compile(r"\btone\b|\battitude\b|\bfeelings?\b|\bimpression\b|\bbias\b|\bviewpoint\b|\bopinion\b|\bnarrator.*feel", re.I)),
    ("2.1 Directed writing — adapting style and register",
     re.compile(r"\bdirected writing\b|\bsection\s+[aA]\b|\bwrite.*letter\b|\bwrite.*report\b|\bwrite.*speech\b|\bwrite.*article\b|\busing.*information.*passage\b|\busing.*passage", re.I)),
    ("2.3 Composition — narrative writing",
     re.compile(r"\bstory\b|\bnarrat\b|\bfiction\b|\bwrite.*about.*time\b|\bwrite.*when\b", re.I)),
    ("2.4 Composition — descriptive writing",
     re.compile(r"\bdescri[bp]\b|\bdescription\b", re.I)),
    ("2.5 Composition — argumentative writing",
     re.compile(r"\bargue\b|\bargument\b|\bpersuade\b|\bdiscuss whether\b", re.I)),
    ("2.6 Composition — discursive writing",
     re.compile(r"\bdiscuss\b|\bfor and against\b|\bboth sides\b", re.I)),
    ("1.1 Reading for ideas — purpose and audience",
     re.compile(r"\bpurpose\b|\baudience\b|\bwhy.*written\b|\bwhat is the.*aim\b", re.I)),
]

DEFAULT_TOPIC = "1.3 Reading for meaning — inference and deduction"

def classify(text: str) -> str:
    for topic, pat in TOPIC_RULES:
        if pat.search(text):
            return topic
    return DEFAULT_TOPIC


# ── PDF extraction ────────────────────────────────────────────────────────────

def pdf_pages(path: str) -> list[str]:
    pages = []
    def _read(pdf):
        for p in pdf.pages:
            t = p.extract_text()
            if t:
                pages.append(t)
    try:
        with pdfplumber.open(path) as pdf: _read(pdf)
    except Exception:
        try:
            with pdfplumber.open(path, password=PDF_PASSWORD) as pdf: _read(pdf)
        except Exception as e:
            print(f"  FAILED {path}: {e}")
    return pages


# ── QP Parser ─────────────────────────────────────────────────────────────────
# Format:
#   Question 1
#   (a) Question text here [2]
#   (b) Next question [1]
#   ...
#   Question 2
#   (a) ...

MAJOR_Q   = re.compile(r"^Question\s*(\d+)", re.I)
SUB_Q     = re.compile(r"^\(([a-z])\)\s*(?:\(([ivx]+)\))?\s*(.+)", re.I)
MARKS_PAT = re.compile(r"\[(\d+)\]")
SKIP_LINE = re.compile(r"^(www\.|Cambridge|UCLES|Page \d|This document|\*|DC |READ THESE|Write your|Do not|Answer all|Dictionaries|The number|The Reading|READ CAREFULLY)", re.I)


def parse_qp(pages: list[str]) -> list[dict]:
    questions = []
    major = None
    current_ref = None
    current_lines = []

    def flush():
        if current_ref and current_lines:
            body = " ".join(current_lines).strip()
            body = re.sub(r"\s{2,}", " ", body)
            marks = int(MARKS_PAT.search(body).group(1)) if MARKS_PAT.search(body) else 1
            questions.append({
                "number":    current_ref,
                "question":  body,
                "totalMarks": marks,
                "topic":     classify(body),
                "imageSrc":  None,
            })

    for page_text in pages:
        for line in page_text.split("\n"):
            line = line.strip()
            if not line or SKIP_LINE.match(line):
                continue
            if re.match(r"^\d+$", line):        # bare page number
                continue
            if "BLANK PAGE" in line.upper():
                continue

            m_maj = MAJOR_Q.match(line)
            if m_maj:
                flush()
                current_ref  = None
                current_lines = []
                major = m_maj.group(1)
                continue

            m_sub = SUB_Q.match(line)
            if m_sub and major:
                flush()
                sub  = m_sub.group(1)
                sub2 = m_sub.group(2)  # roman numeral sub-part if any
                text = m_sub.group(3).strip()
                current_ref   = f"{major}({sub})" + (f"({sub2})" if sub2 else "")
                current_lines = [text]
                continue

            if current_ref:
                # Skip answer lines (rows of dots)
                if re.match(r"^\.{5,}", line):
                    continue
                current_lines.append(line)

    flush()
    return questions


# ── MS Parser ─────────────────────────────────────────────────────────────────
# Format:
#   1(a) [repeated question text]   2
#   • bullet answer point
#   • another point
#   Note: ...
#   1(b) ...

MS_Q_REF = re.compile(r"^(\d+\([a-z]\)(?:\([ivx]+\))?)\s+.{10,}", re.I)
BULLET   = re.compile(r"^[•\-\*✓]|^(?:Accept|Allow|Award|Do not|Note\b|If\b|For\b|Max\b|\d\s+mark)", re.I)


def parse_ms(pages: list[str]) -> dict[str, str]:
    answers: dict[str, str] = {}
    current_ref   = None
    answer_lines  = []
    in_answer     = False   # True once we've passed the repeated question line

    def flush():
        if current_ref and answer_lines:
            answers[current_ref] = "\n".join(answer_lines).strip()

    for page_text in pages:
        for line in page_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Skip headers / watermarks
            if SKIP_LINE.match(line):
                continue
            if re.match(r"^(Question\s+Answer\s+Marks|PUBLISHED|This mark scheme|Mark schemes|Cambridge will|Cambridge is|UCLES|www\.|Page \d)", line, re.I):
                continue

            m = MS_Q_REF.match(line)
            if m:
                flush()
                current_ref  = m.group(1)
                answer_lines = []
                in_answer    = False   # next lines are the repeated question — skip them
                continue

            if current_ref:
                # The first content line(s) repeat the question — skip until we hit a bullet/note
                if not in_answer:
                    if BULLET.match(line) or re.match(r"^[A-Z]{2,}", line):
                        in_answer = True
                    else:
                        continue   # still repeating question text
                answer_lines.append(line)

    flush()
    return answers


# ── Helpers ───────────────────────────────────────────────────────────────────

def norm(s: str) -> str:
    return re.sub(r"\s+", "", s).lower()

def attach_ms(questions: list[dict], ms: dict[str, str]) -> list[dict]:
    normed = {norm(k): v for k, v in ms.items()}
    for q in questions:
        key = norm(q["number"])
        q["markingSchemeAnswer"] = normed.get(key, "See mark scheme.")
    return questions


# ── Progress I/O ──────────────────────────────────────────────────────────────

def load() -> list:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            try: return json.load(f)
            except: return []
    return []

def save(data: list):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    all_data  = load()
    processed = {d["source"] for d in all_data}

    all_files = sorted(os.listdir(EXTRACTED_DIR))
    pairs = [
        (f, re.sub(r"_qp_", "_ms_", f))
        for f in all_files
        if f.startswith("0500") and "_qp_" in f and f.endswith(".pdf")
        and re.sub(r"_qp_", "_ms_", f) in all_files
    ]
    todo = [(qp, ms) for qp, ms in pairs if qp not in processed]

    print(f"Found {len(pairs)} pairs | {len(todo)} to process\n")

    ms_matched = ms_fallback = 0

    for qp_name, ms_name in todo:
        print(f"  {qp_name} ...", end=" ", flush=True)

        qp_pages = pdf_pages(os.path.join(EXTRACTED_DIR, qp_name))
        ms_pages = pdf_pages(os.path.join(EXTRACTED_DIR, ms_name))

        if not qp_pages:
            print("SKIP (no QP text)")
            continue

        questions = parse_qp(qp_pages)
        ms_map    = parse_ms(ms_pages) if ms_pages else {}
        questions = attach_ms(questions, ms_map)

        # Filter noise
        questions = [q for q in questions if len(q["question"]) > 20]

        matched   = sum(1 for q in questions if q["markingSchemeAnswer"] != "See mark scheme.")
        fallback  = len(questions) - matched
        ms_matched  += matched
        ms_fallback += fallback

        print(f"{len(questions)} questions  (MS linked: {matched}, fallback: {fallback})")

        all_data.append({"source": qp_name, "ms_source": ms_name, "questions": questions})
        save(all_data)

    total_q = sum(len(p["questions"]) for p in all_data if p["source"].startswith("0500"))
    papers  = sum(1 for p in all_data if p["source"].startswith("0500"))
    print(f"\nDone!  {papers} papers | {total_q} questions")
    print(f"MS answers linked: {ms_matched}  |  fallback: {ms_fallback}")
    print("Next:  npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
