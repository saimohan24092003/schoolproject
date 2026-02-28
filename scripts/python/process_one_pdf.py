"""
Processes a single PDF and appends result to bulk_seeds_progress.json.
Usage: python process_one_pdf.py <pdf_filename>
e.g.:  python process_one_pdf.py 0653_m22_qp_12.pdf
"""
import os, sys, json, time, re, warnings
warnings.filterwarnings("ignore")

import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD  = "nokia2"
EXTRACTED_DIR = "extracted_data"
DIAGRAMS_DIR  = "public/diagrams"
PROGRESS_FILE = "bulk_seeds_progress.json"

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

if len(sys.argv) < 2:
    print("Usage: python process_one_pdf.py <pdf_filename>")
    sys.exit(1)

pdf_name = sys.argv[1]
pdf_path = os.path.join(EXTRACTED_DIR, pdf_name)

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
    sys.exit(1)

# Check if already processed
if os.path.exists(PROGRESS_FILE):
    try:
        existing = json.load(open(PROGRESS_FILE, encoding="utf-8"))
    except Exception:
        existing = []
else:
    existing = []

if any(d["source"] == pdf_name for d in existing):
    print(f"Already processed: {pdf_name} — skipping")
    sys.exit(0)

print(f"Processing {pdf_name} ...")

# --- Extract text ---
page_texts = {}

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
        print(f"FAILED to open: {e}")
        sys.exit(1)

if not page_texts:
    print("No text found — skipping")
    sys.exit(0)

# --- Extract images ---
image_mapping = {}
try:
    def _open():
        try:
            return pdfplumber.open(pdf_path, password=PDF_PASSWORD)
        except Exception:
            return pdfplumber.open(pdf_path)
    with _open() as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            imgs = page.images
            if not imgs:
                continue
            image_mapping[i] = []
            for idx, img in enumerate(imgs):
                try:
                    x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                    if x1 > x0 and bot > top:
                        fname = f"{pdf_name}_{i}_{idx}.png"
                        fpath = os.path.join(DIAGRAMS_DIR, fname)
                        cropped = page.within_bbox((x0, top, x1, bot)).to_image(resolution=150)
                        cropped.save(fpath)
                        image_mapping[i].append(f"/diagrams/{fname}")
                except Exception:
                    pass
except Exception:
    image_mapping = {}

# Valid paths on disk
valid_paths = set()
for fn in os.listdir(DIAGRAMS_DIR):
    if fn.lower().endswith(".png"):
        valid_paths.add(f"/diagrams/{fn}")

print(f"  Text: {len(page_texts)} pages | Images from: {len(image_mapping)} pages")

# --- Call Gemini ---
full_text = "\n".join(f"[PAGE {p}]\n{t}" for p, t in sorted(page_texts.items()))[:18000]
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
    '{"number": <int>, "topic": "<one of the syllabus topics>", '
    '"question": "<full question text>", '
    '"explanation": "<a brief one-sentence learning concept related to this question>", '
    '"options": ["A: ...", "B: ...", "C: ...", "D: ..."], '
    '"correctAnswer": "<A/B/C/D or null>", '
    '"imageSrc": "<exact path from list above, or null>"}\n\n'
    f"Valid syllabus topics: {topics_str}\n\n"
    f"Paper text:\n{full_text}\n\n"
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
        m = re.search(r"retry in (\d+\.?\d*)s", str(e))
        if m:
            wait = int(float(m.group(1))) + 2
        if attempt < 2:
            print(f"  Gemini error: {e}. Retry in {wait}s ...")
            time.sleep(wait)
        else:
            print(f"  Gemini failed: {e}")

if not questions:
    print("  AI extraction failed — skipping")
    sys.exit(0)

# Validate imageSrc
for q in questions:
    src = q.get("imageSrc")
    if src and src not in valid_paths:
        q["imageSrc"] = None

with_img = sum(1 for q in questions if q.get("imageSrc"))
print(f"  DONE: {len(questions)} questions ({with_img} with diagrams)")

# Save to progress file
existing.append({"source": pdf_name, "questions": questions})
with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)
print(f"  Saved to {PROGRESS_FILE}")
