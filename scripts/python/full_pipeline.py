"""
Full pipeline: processes all PDFs in extracted_data/, extracts questions + diagrams,
and appends to bulk_seeds_progress.json.

Also validates existing entries -- removes fake/hallucinated imageSrc paths.

Usage:
    python scripts/python/full_pipeline.py
"""

import os
import sys
import json
import time
import re
import warnings

# Suppress deprecation warning for old google.generativeai package
warnings.filterwarnings("ignore")

import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

# Force UTF-8 output to avoid Windows cp1252 encoding errors
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD   = "nokia2"
EXTRACTED_DIR  = "extracted_data"
DIAGRAMS_DIR   = "public/diagrams"
PROGRESS_FILE  = "bulk_seeds_progress.json"

SYLLABUS_TOPICS = [
    "B1. Characteristics of living organisms", "B2. Cells", "B3. Biological molecules",
    "B4. Enzymes", "B5. Plant nutrition", "B6. Animal nutrition", "B7. Transport",
    "B8. Gas exchange and respiration", "B9. Coordination and response",
    "B10. Reproduction", "B11. Inheritance", "B12. Ecology",
    "C1. Particulate nature of matter", "C2. Experimental techniques",
    "C3. Atoms, elements and compounds", "C4. Stoichiometry",
    "C5. Electricity and chemistry", "C6. Energy changes in reactions",
    "C7. Chemical reactions", "C8. Acids, bases and salts", "C9. The Periodic Table",
    "C10. Metals", "C11. Air and water", "C12. Organic chemistry",
    "P1. Motion, forces and energy", "P2. Thermal physics", "P3. Waves",
    "P4. Electricity and magnetism", "P5. Atomic physics", "P6. Space physics",
]

os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

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

def real_diagrams_set():
    """Return set of web-paths for all PNGs that actually exist on disk."""
    existing = set()
    if os.path.isdir(DIAGRAMS_DIR):
        for fname in os.listdir(DIAGRAMS_DIR):
            if fname.lower().endswith(".png"):
                existing.add(f"/diagrams/{fname}")
    return existing

def validate_and_fix_progress(all_data, valid_paths):
    """Strip any imageSrc that does not exist on disk. Returns (data, count_fixed)."""
    fixed = 0
    for paper in all_data:
        for q in paper.get("questions", []):
            src = q.get("imageSrc")
            if src and src not in valid_paths:
                q["imageSrc"] = None
                fixed += 1
    return all_data, fixed

# ---------------------------------------------------------------------------
# PDF processing
# ---------------------------------------------------------------------------

def extract_pdf(pdf_path):
    """
    Extract text and images from a PDF.
    Text and image extraction are separated -- image rendering runs in a
    subprocess so a Windows crash in pdfplumber.to_image() cannot kill
    the main pipeline process.
    Returns (page_texts: dict, image_mapping: dict) or (None, None).
    """
    import subprocess, sys as _sys

    pdf_name = os.path.basename(pdf_path)
    page_texts = {}
    image_mapping = {}

    # --- Step 1: Extract text only (safe, in-process) ---
    def _extract_text(pdf):
        for i, page in enumerate(pdf.pages, start=1):
            txt = page.extract_text()
            if txt:
                page_texts[i] = txt

    try:
        with pdfplumber.open(pdf_path) as pdf:
            _extract_text(pdf)
    except Exception:
        try:
            with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
                _extract_text(pdf)
        except Exception as e:
            print(f"  FAILED to open {pdf_name}: {e}")
            return None, None

    if not page_texts:
        return None, None

    # --- Step 2: Extract images via subprocess (crash-safe) ---
    img_script = f"""
import pdfplumber, os, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
results = {{}}
try:
    pdf = pdfplumber.open({repr(pdf_path)}, password={repr(PDF_PASSWORD)})
except Exception:
    try:
        pdf = pdfplumber.open({repr(pdf_path)})
    except Exception as e:
        print(json.dumps(results))
        sys.exit(0)
for i, page in enumerate(pdf.pages, start=1):
    imgs = page.images
    if not imgs:
        continue
    results[i] = []
    for idx, img in enumerate(imgs):
        try:
            x0, top, x1, bot = img['x0'], img['top'], img['x1'], img['bottom']
            if x1 > x0 and bot > top:
                fname = {repr(pdf_name)} + '_' + str(i) + '_' + str(idx) + '.png'
                fpath = os.path.join({repr(DIAGRAMS_DIR)}, fname)
                cropped = page.within_bbox((x0, top, x1, bot)).to_image(resolution=150)
                cropped.save(fpath)
                results[i].append('/diagrams/' + fname)
        except Exception:
            pass
pdf.close()
print(json.dumps(results))
"""
    try:
        proc = subprocess.run(
            [_sys.executable, "-c", img_script],
            capture_output=True, text=True, timeout=60
        )
        if proc.stdout.strip():
            raw = json.loads(proc.stdout.strip())
            image_mapping = {int(k): v for k, v in raw.items() if v}
    except Exception:
        pass  # Image extraction failed entirely — continue with text only

    return page_texts, image_mapping

def call_gemini(prompt, retries=3):
    model = genai.GenerativeModel("gemini-2.5-flash")
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
            wait = 60
            m = re.search(r"retry in (\d+\.?\d*)s", str(e))
            if m:
                wait = int(float(m.group(1))) + 2
            if attempt < retries - 1:
                print(f"  Gemini error: {e}. Retry in {wait}s ...")
                time.sleep(wait)
            else:
                print(f"  Gemini failed after {retries} attempts: {e}")
                return None
    return None

def extract_questions(pdf_name, page_texts, image_mapping):
    """Build prompt and call Gemini to extract structured MCQ questions."""
    full_text = "\n".join(
        f"[PAGE {p}]\n{t}" for p, t in sorted(page_texts.items())
    )[:18000]

    img_lines = []
    for pg, paths in sorted(image_mapping.items()):
        for path in paths:
            img_lines.append(f"  Page {pg}: {path}")
    img_info = "\n".join(img_lines) if img_lines else "  (none)"

    topics_str = json.dumps(SYLLABUS_TOPICS)

    prompt = (
        "You are an IGCSE Combined Science (0653) question extractor.\n\n"
        "Extract every MCQ question from the text below and return a JSON array.\n\n"
        "DIAGRAM RULE - very important:\n"
        "The following image files were extracted from this paper. "
        "If a question references 'Fig', 'graph', 'diagram', 'table' etc. "
        "and the question appears on that page, set imageSrc to the EXACT path shown. "
        "Do NOT invent or guess paths.\n"
        f"Extracted images:\n{img_info}\n\n"
        "For each question return:\n"
        '{\"number\": <int>, \"topic\": \"<one of the syllabus topics>\", '
        '\"question\": \"<full question text>\", '
        '\"options\": [\"A: ...\", \"B: ...\", \"C: ...\", \"D: ...\"], '
        '\"correctAnswer\": \"<A/B/C/D or null>\", '
        '\"imageSrc\": \"<exact path from list above, or null>\"}\n\n'
        f"Valid syllabus topics: {topics_str}\n\n"
        f"Paper text:\n{full_text}\n\n"
        "Return ONLY the JSON array, no explanation."
    )

    return call_gemini(prompt)

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    valid_paths = real_diagrams_set()
    all_data    = load_progress()

    # Step 1: Fix hallucinated imageSrc in existing entries
    print("Validating existing imageSrc paths ...")
    all_data, fixed = validate_and_fix_progress(all_data, valid_paths)
    if fixed:
        print(f"  Fixed {fixed} fake imageSrc entries (set to null)")
        save_progress(all_data)
    else:
        print("  All existing imageSrc paths are valid.")

    processed_sources = {d["source"] for d in all_data}

    # Step 2: Process all question-paper PDFs in extracted_data/
    pdf_files = sorted([
        f for f in os.listdir(EXTRACTED_DIR)
        if f.endswith(".pdf") and "_qp_" in f
    ])

    print(f"\nFound {len(pdf_files)} question-paper PDFs")
    to_process = [f for f in pdf_files if f not in processed_sources]
    print(f"  {len(to_process)} still need processing")

    import subprocess as _sp, sys as _sys

    for pdf_name in to_process:
        pdf_path = os.path.join(EXTRACTED_DIR, pdf_name)
        print(f"\nProcessing {pdf_name} ...")

        # Run each PDF in its own subprocess for crash isolation.
        # If the subprocess crashes (Windows access violation, OOM, etc.)
        # the main loop catches it and moves on to the next PDF.
        per_pdf_script = f"""
import os, sys, json, time, re, warnings
warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD  = {repr(PDF_PASSWORD)}
DIAGRAMS_DIR  = {repr(DIAGRAMS_DIR)}
EXTRACTED_DIR = {repr(EXTRACTED_DIR)}
PROGRESS_FILE = {repr(PROGRESS_FILE)}
SYLLABUS_TOPICS = {repr(SYLLABUS_TOPICS)}

pdf_name = {repr(pdf_name)}
pdf_path = {repr(pdf_path)}

page_texts = {{}}
image_mapping = {{}}

def _extract_text(pdf):
    for i, page in enumerate(pdf.pages, start=1):
        txt = page.extract_text()
        if txt:
            page_texts[i] = txt

try:
    with pdfplumber.open(pdf_path) as pdf:
        _extract_text(pdf)
except Exception:
    try:
        with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
            _extract_text(pdf)
    except Exception as e:
        print("FAILED:" + str(e))
        sys.exit(1)

if not page_texts:
    print("FAILED:no text")
    sys.exit(1)

# Image extraction
try:
    def _open_pdf():
        try:
            return pdfplumber.open(pdf_path, password=PDF_PASSWORD)
        except Exception:
            return pdfplumber.open(pdf_path)
    with _open_pdf() as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            imgs = page.images
            if not imgs:
                continue
            image_mapping[i] = []
            for idx, img in enumerate(imgs):
                try:
                    x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                    if x1 > x0 and bot > top:
                        fname = pdf_name + "_" + str(i) + "_" + str(idx) + ".png"
                        fpath = os.path.join(DIAGRAMS_DIR, fname)
                        cropped = page.within_bbox((x0, top, x1, bot)).to_image(resolution=150)
                        cropped.save(fpath)
                        image_mapping[i].append("/diagrams/" + fname)
                except Exception:
                    pass
except Exception:
    image_mapping = {{}}

valid_paths = set()
if os.path.isdir(DIAGRAMS_DIR):
    for fn in os.listdir(DIAGRAMS_DIR):
        if fn.lower().endswith(".png"):
            valid_paths.add("/diagrams/" + fn)

print("PAGES:" + str(len(page_texts)) + " IMGS:" + str(len(image_mapping)))

full_text = "\\n".join(f"[PAGE {{p}}]\\n{{t}}" for p, t in sorted(page_texts.items()))[:18000]
img_lines = []
for pg, paths in sorted(image_mapping.items()):
    for path in paths:
        img_lines.append(f"  Page {{pg}}: {{path}}")
img_info = "\\n".join(img_lines) if img_lines else "  (none)"
topics_str = json.dumps(SYLLABUS_TOPICS)

prompt = (
    "You are an IGCSE Combined Science (0653) question extractor.\\n\\n"
    "Extract every MCQ question from the text below and return a JSON array.\\n\\n"
    "DIAGRAM RULE - very important:\\n"
    "The following image files were extracted from this paper. "
    "If a question references 'Fig', 'graph', 'diagram', 'table' etc. "
    "and the question appears on that page, set imageSrc to the EXACT path shown. "
    "Do NOT invent or guess paths.\\n"
    f"Extracted images:\\n{{img_info}}\\n\\n"
    "For each question return:\\n"
    '{{\\"number\\": <int>, \\"topic\\": \\"<one of the syllabus topics>\\", '
    '\\"question\\": \\"<full question text>\\", '
    '\\"options\\": [\\"A: ...\\", \\"B: ...\\", \\"C: ...\\", \\"D: ...\\"], '
    '\\"correctAnswer\\": \\"<A/B/C/D or null>\\", '
    '\\"imageSrc\\": \\"<exact path from list above, or null>\\"}}\\n\\n'
    f"Valid syllabus topics: {{topics_str}}\\n\\n"
    f"Paper text:\\n{{full_text}}\\n\\n"
    "Return ONLY the JSON array, no explanation."
)

model = genai.GenerativeModel("gemini-2.5-flash")
questions = None
for attempt in range(3):
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()
        questions = json.loads(raw)
        break
    except Exception as e:
        wait = 60
        m = re.search(r"retry in (\\d+\\.?\\d*)s", str(e))
        if m:
            wait = int(float(m.group(1))) + 2
        if attempt < 2:
            print(f"  Gemini error: {{e}}. Retry in {{wait}}s ...")
            time.sleep(wait)

if not questions:
    print("SKIPPED:ai_failed")
    sys.exit(0)

for q in questions:
    src = q.get("imageSrc")
    if src and src not in valid_paths:
        q["imageSrc"] = None

with_img = sum(1 for q in questions if q.get("imageSrc"))
print("DONE:" + str(len(questions)) + " IMG:" + str(with_img))

# Append to progress file
try:
    existing = json.load(open(PROGRESS_FILE, encoding="utf-8")) if os.path.exists(PROGRESS_FILE) else []
except Exception:
    existing = []
existing.append({{"source": pdf_name, "questions": questions}})
with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)
"""
        try:
            result = _sp.run(
                [_sys.executable, "-u", "-c", per_pdf_script],
                capture_output=False, timeout=180
            )
            if result.returncode not in (0, None):
                print(f"  Subprocess exited with code {result.returncode}")
        except _sp.TimeoutExpired:
            print("  Timed out after 180s — skipping")
        except Exception as e:
            print(f"  Subprocess error: {e}")

        # Reload progress after subprocess wrote it
        all_data = load_progress()

        time.sleep(8)   # respect Gemini rate limits

    # Summary
    total_q   = sum(len(p["questions"]) for p in all_data)
    total_img = sum(1 for p in all_data for q in p["questions"] if q.get("imageSrc"))
    print(f"\nDone! {len(all_data)} papers | {total_q} questions | {total_img} with diagrams")
    print("Next step:  npx tsx src/server/scripts/seed-all-questions.ts")

if __name__ == "__main__":
    main()
