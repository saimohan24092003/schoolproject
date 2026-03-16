"""
theory_pipeline.py  —  Unified short-answer / theory extractor

Processes Papers 2, 3, 4 (structured / extended / alt-practical) for all
subjects found in extracted_data/.  Paper 1 is always MCQ and is skipped.

For each question paper PDF the script:
  1. Locates the matching mark scheme (replaces _qp_ with _ms_).
  2. Extracts text (and images) from both files.
  3. Sends both to Gemini and asks it to return every question with its
     marking-scheme answer as a JSON array.
  4. Appends the result to  theory_seeds_progress.json.

Usage:
    python scripts/python/theory_pipeline.py [--subject 0653] [--limit 5]

Optional flags
    --subject <code>   Only process PDFs whose filename starts with <code>
                       (e.g. 0653, 0680).  Default: all subjects.
    --limit <n>        Stop after processing <n> new PDFs.  Default: no limit.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import warnings

warnings.filterwarnings("ignore")

import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(dotenv_path=".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME     = "gemini-2.0-flash"
PDF_PASSWORD   = "nokia2"
EXTRACTED_DIR  = "extracted_data"
DIAGRAMS_DIR   = "public/diagrams"
PROGRESS_FILE  = "theory_seeds_progress.json"

os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# Subjects where Paper 1 is NOT MCQ (structured reading, not multiple-choice).
# For these, ALL papers are processed (nothing is skipped as MCQ).
NON_MCQ_SUBJECTS = {"0500", "0510", "0580"}  # 0580: Paper 2 & 4 are both structured, not MCQ

# ── Topic lists per subject ──────────────────────────────────────────────────

TOPICS_BY_SUBJECT = {
    "0500": [
        "1.1 Reading for ideas — purpose and audience",
        "1.2 Reading for ideas — tone, attitude and bias",
        "1.3 Reading for meaning — inference and deduction",
        "1.4 Reading for meaning — language and effect",
        "1.5 Note-making",
        "1.6 Summary writing",
        "2.1 Directed writing — adapting style and register",
        "2.2 Directed writing — selecting and re-using information",
        "2.3 Composition — narrative writing",
        "2.4 Composition — descriptive writing",
        "2.5 Composition — argumentative writing",
        "2.6 Composition — discursive writing",
    ],
    "0653": [
        "B1. Characteristics of living organisms", "B2. Cells",
        "B3. Movement into and out of cells", "B4. Biological molecules",
        "B5. Enzymes", "B6. Plant nutrition", "B7. Human nutrition",
        "B8. Transport in plants", "B9. Transport in animals",
        "B10. Diseases and immunity", "B11. Gas exchange in humans",
        "B12. Respiration", "B13. Drugs", "B14. Reproduction",
        "B15. Organisms and their environment",
        "B16. Human influences on ecosystems",
        "C1. States of matter", "C2. Atoms, elements and compounds",
        "C3. Stoichiometry", "C4. Electrochemistry",
        "C5. Chemical energetics", "C6. Chemical reactions",
        "C7. Acids, bases and salts", "C8. The Periodic Table",
        "C9. Metals", "C10. Chemistry of the environment",
        "C11. Organic chemistry",
        "C12. Experimental techniques and chemical analysis",
        "P1. Motion, forces and energy", "P2. Thermal physics",
        "P3. Waves", "P4. Electricity", "P5. Space physics",
    ],
    "0580": [
        # Unit 1: Number
        "1.1 Types of numbers",
        "1.2 Fractions, decimals and percentages",
        "1.3 Powers and roots",
        "1.4 Ratio and proportion",
        "1.5 Estimation and bounds",
        "1.6 Speed, distance and time",
        # Unit 2: Algebra
        "2.1 Algebraic manipulation",
        "2.2 Solving equations",
        "2.3 Inequalities",
        "2.4 Sequences",
        "2.5 Functions",
        "2.6 Graphs of functions",
        # Unit 3: Coordinate Geometry
        "3.1 Straight-line graphs",
        "3.2 Distance and midpoint",
        "3.3 Graphs in real-life contexts",
        # Unit 4: Geometry
        "4.1 Angles and lines",
        "4.2 Triangles and quadrilaterals",
        "4.3 Circles",
        "4.4 Constructions and loci",
        # Unit 5: Mensuration
        "5.1 Perimeter and area",
        "5.2 Volume and surface area",
        "5.3 Similar shapes",
        # Unit 6: Trigonometry
        "6.1 Right-angled triangles",
        "6.2 Sine and cosine rules",
        "6.3 Trigonometric graphs",
        "6.4 3D trigonometry",
        # Unit 7: Transformations and Vectors
        "7.1 Transformations",
        "7.2 Vectors",
        "7.3 Vector geometry",
        # Unit 8: Probability and Statistics
        "8.1 Probability",
        "8.2 Statistical diagrams",
        "8.3 Measures of central tendency",
        "8.4 Spread and correlation",
    ],
    "0680": [
        "1.1 Rocks and minerals", "1.2 Energy resources",
        "2.1 Agriculture", "2.2 Water management",
        "3.1 Oceans and fisheries", "3.2 Natural hazards",
        "4.1 The atmosphere", "4.2 Human population",
    ],
}

# Fallback for unknown subjects: infer a generic list
FALLBACK_TOPICS = ["General"]


# ── Helpers ──────────────────────────────────────────────────────────────────

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            try:
                return json.load(f)
            except Exception:
                return []
    return []


def save_progress(data):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def is_mcq_paper(filename: str) -> bool:
    """
    Paper 1 (e.g. _qp_12, _qp_11) is MCQ for most subjects — skip it.
    Exception: subjects in NON_MCQ_SUBJECTS (e.g. 0500) have no MCQ paper;
    all their papers are structured and should be processed.
    """
    subject = filename[:4]
    if subject in NON_MCQ_SUBJECTS:
        return False  # never skip — no MCQ paper for these subjects
    m = re.search(r"_qp_(\d)(\d)\.pdf", filename, re.I)
    if not m:
        return False
    paper_num = int(m.group(1))
    return paper_num == 1


def find_ms_file(qp_name: str) -> str | None:
    ms_name = re.sub(r"_qp_", "_ms_", qp_name, flags=re.I)
    ms_path = os.path.join(EXTRACTED_DIR, ms_name)
    return ms_name if os.path.exists(ms_path) else None


def extract_text_and_images(pdf_path: str):
    """Returns (page_texts: dict, image_mapping: dict)."""
    page_texts = {}
    image_mapping = {}
    pdf_name = os.path.basename(pdf_path)

    def _read(pdf):
        for i, page in enumerate(pdf.pages, start=1):
            txt = page.extract_text()
            if txt:
                page_texts[i] = txt
            for idx, img in enumerate(page.images):
                try:
                    x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                    if x1 > x0 and bot > top:
                        fname = f"{pdf_name}_{i}_{idx}.png"
                        fpath = os.path.join(DIAGRAMS_DIR, fname)
                        if not os.path.exists(fpath):
                            page.within_bbox((x0, top, x1, bot)).to_image(resolution=150).save(fpath)
                        image_mapping.setdefault(i, []).append(f"/diagrams/{fname}")
                except Exception:
                    pass

    try:
        with pdfplumber.open(pdf_path) as pdf:
            _read(pdf)
    except Exception:
        try:
            with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
                _read(pdf)
        except Exception as e:
            print(f"  FAILED to open {pdf_name}: {e}")
            return None, None

    return page_texts, image_mapping


def call_gemini(prompt: str, retries: int = 3):
    model = genai.GenerativeModel(MODEL_NAME)
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except Exception as e:
            err = str(e)
            # Daily quota exhausted — no point retrying, exit immediately
            if "quota" in err.lower() and "retry in" not in err.lower():
                print(f"  QUOTA EXHAUSTED: {e}")
                print("  Daily Gemini quota exceeded. Re-run tomorrow or upgrade your API plan.")
                sys.exit(1)
            wait = 60
            m = re.search(r"retry in (\d+\.?\d*)s", err)
            if m:
                wait = int(float(m.group(1))) + 2
            if attempt < retries - 1:
                print(f"  Gemini error: {e}. Retry in {wait}s …")
                time.sleep(wait)
            else:
                print(f"  Gemini failed after {retries} attempts: {e}")
    return None


def build_prompt(qp_name: str, qp_text: str, ms_text: str,
                 img_info: str, topics: list[str]) -> str:
    subject_code = qp_name[:4]
    paper_match = re.search(r"_qp_(\d)", qp_name)
    paper_num = int(paper_match.group(1)) if paper_match else 2

    return (
        f"You are an expert IGCSE examiner for subject {subject_code}, Paper {paper_num}.\n"
        "I provide the full Question Paper text and the full Mark Scheme text below.\n"
        "Extract EVERY structured / short-answer question (NOT MCQ) with its ideal marking-scheme answer.\n\n"
        "For multi-part questions (e.g. 1(a)(i)), output EACH part as a SEPARATE object.\n\n"
        "Return a JSON array of objects with these exact keys:\n"
        '{ "number": "1(a)(i)",\n'
        '  "topic": "<closest topic from the list>",\n'
        '  "question": "<complete question text including any necessary context>",\n'
        '  "markingSchemeAnswer": "<model answer / mark points from MS, preserve mark allocation>",\n'
        '  "totalMarks": <integer>,\n'
        '  "imageSrc": "<exact path from the image list below if the question references a figure, else null>"\n'
        "}\n\n"
        f"Valid topics:\n{json.dumps(topics, indent=2)}\n\n"
        f"Extracted images from the question paper:\n{img_info}\n\n"
        f"--- QUESTION PAPER ---\n{qp_text}\n\n"
        f"--- MARK SCHEME ---\n{ms_text}\n\n"
        "Return ONLY the JSON array. Be thorough — do not skip any question or part."
    )


def get_topics(qp_name: str) -> list[str]:
    code = qp_name[:4]
    return TOPICS_BY_SUBJECT.get(code, FALLBACK_TOPICS)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract theory/short-answer questions from past papers.")
    parser.add_argument("--subject", default=None, help="Filter by 4-digit subject code, e.g. 0653")
    parser.add_argument("--limit", type=int, default=0, help="Max new PDFs to process (0 = no limit)")
    parser.add_argument("--paper", type=int, default=None, help="Only process this paper number (e.g. 2 for Paper 2)")
    parser.add_argument("--year-end", type=int, default=None, help="Only process up to this year (2-digit, e.g. 23 for 2023)")
    args = parser.parse_args()

    all_data = load_progress()
    processed = {d["source"] for d in all_data}

    # Collect all theory QP files (Paper 2, 3, 4)
    all_pdfs = sorted([
        f for f in os.listdir(EXTRACTED_DIR)
        if f.endswith(".pdf") and "_qp_" in f.lower() and not is_mcq_paper(f)
    ])

    if args.subject:
        all_pdfs = [f for f in all_pdfs if f.startswith(args.subject)]

    if args.paper:
        # e.g. --paper 2 keeps only files matching _qp_2x (Paper 2, any variant)
        all_pdfs = [f for f in all_pdfs if re.search(rf"_qp_{args.paper}\d\.pdf", f, re.I)]

    if args.year_end:
        # filename format: SSSS_SYY_qp_... where YY is 2-digit year
        all_pdfs = [f for f in all_pdfs if re.search(r"_[msw](\d{2})_", f) and
                    int(re.search(r"_[msw](\d{2})_", f).group(1)) <= args.year_end]

    to_process = [f for f in all_pdfs if f not in processed]
    print(f"Found {len(all_pdfs)} theory QP files | {len(to_process)} need processing")

    if not to_process:
        print("Nothing to do.")
        return

    processed_count = 0
    for qp_name in to_process:
        if args.limit and processed_count >= args.limit:
            print(f"Reached limit of {args.limit} PDFs.")
            break

        ms_name = find_ms_file(qp_name)
        if not ms_name:
            print(f"  No mark scheme found for {qp_name} — skipping")
            continue

        print(f"\nProcessing {qp_name} …")
        qp_path = os.path.join(EXTRACTED_DIR, qp_name)
        ms_path = os.path.join(EXTRACTED_DIR, ms_name)

        qp_texts, qp_images = extract_text_and_images(qp_path)
        ms_texts, _         = extract_text_and_images(ms_path)

        if not qp_texts or not ms_texts:
            print("  Skipping — could not extract text")
            continue

        full_qp = "\n".join(f"[PAGE {p}]\n{t}" for p, t in sorted(qp_texts.items()))[:30000]
        full_ms = "\n".join(f"[PAGE {p}]\n{t}" for p, t in sorted(ms_texts.items()))[:30000]

        img_lines = [
            f"  Page {pg}: {path}"
            for pg, paths in sorted(qp_images.items())
            for path in paths
        ]
        img_info = "\n".join(img_lines) if img_lines else "  (none)"

        topics  = get_topics(qp_name)
        prompt  = build_prompt(qp_name, full_qp, full_ms, img_info, topics)
        questions = call_gemini(prompt)

        if not questions:
            print("  AI extraction failed — skipping")
            continue

        # Validate imageSrc paths
        valid = {f"/diagrams/{f}" for f in os.listdir(DIAGRAMS_DIR) if f.lower().endswith(".png")}
        for q in questions:
            if q.get("imageSrc") and q["imageSrc"] not in valid:
                q["imageSrc"] = None

        print(f"  Extracted {len(questions)} question parts")
        all_data.append({"source": qp_name, "ms_source": ms_name, "questions": questions})
        save_progress(all_data)

        processed_count += 1
        time.sleep(5)  # Gemini rate limit (gemini-1.5-flash: 15 RPM)

    total_q = sum(len(p["questions"]) for p in all_data)
    print(f"\nDone! {len(all_data)} papers | {total_q} total theory questions")
    print("Next:  npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
