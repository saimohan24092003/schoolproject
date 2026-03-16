"""
extract_hindi_0549.py  —  NO AI, pdfplumber text + PyMuPDF page rendering

Extracts questions AND images from Cambridge IGCSE Hindi as a Second Language (0549).

Strategy for image MCQ questions (e.g. clothing, objects, food):
  - Detect pages that have image-based MCQ options (by checking rendered pixel density)
  - Render those pages as high-resolution PNG screenshots (correct colors, vectors, fonts)
  - Attach the page screenshot as imageSrc for all questions on that page

Paper structure:
  Paper 1 (Reading & Writing) — qp_11:  numbered questions 1, 2(a), 3(b) etc.
  Paper 2 (Listening)         — qp_21:  "प्रश्न 1", "प्रश्न 2" etc. + image MCQ options

Saves to: hindi_seeds_0549.json
Images saved to: public/diagrams/hindi/

Usage:
    python scripts/python/extract_hindi_0549.py
"""

import os, re, json, sys, warnings
warnings.filterwarnings("ignore")
import pdfplumber
import fitz  # PyMuPDF

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HINDI_DIR      = "extracted_data/hindi"
PROGRESS_FILE  = "hindi_seeds_0549.json"
DIAGRAMS_DIR   = "public/diagrams/hindi"

os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# ── Topic classifier ──────────────────────────────────────────────────────────
TOPIC_RULES = [
    ("1.1 Family & Relationships (परिवार और रिश्ते)",
     re.compile(r"\b(परिवार|family|माता|पिता|भाई|बहन|रिश्ता|घर में|daily routine|दिनचर्या)\b", re.I)),
    ("1.2 Identity & Personal Life (पहचान और व्यक्तिगत जीवन)",
     re.compile(r"\b(hobby|शौक|पसंद|interest|describe yourself|व्यक्तित्व|appearance|looks|personality|पहन|कपड़|वस्त्र)\b", re.I)),
    ("1.3 Home & Local Area (घर और स्थानीय क्षेत्र)",
     re.compile(r"\b(home|house|घर|neighbourhood|local area|directions|where you live|area|locality)\b", re.I)),
    ("2.1 School & Education (स्कूल और शिक्षा)",
     re.compile(r"\b(school|education|subject|teacher|class|lesson|study|स्कूल|शिक्षा|पढ़ाई|छात्र|कक्षा|अध्याप)\b", re.I)),
    ("2.2 Work & Career (काम और करियर)",
     re.compile(r"\b(job|work|career|profession|काम|नौकरी|workplace|part.time|employment)\b", re.I)),
    ("2.3 Future Plans & Ambitions (भविष्य की योजनाएं)",
     re.compile(r"\b(future|plan|ambition|hope|भविष्य|योजना|want to be|when I grow|aspiration)\b", re.I)),
    ("3.1 Free Time & Hobbies (खाली समय और शौक)",
     re.compile(r"\b(free time|leisure|sport|hobby|खेल|entertainment|activities|weekend|pastime|समारोह|उत्सव)\b", re.I)),
    ("3.2 Travel & Transport (यात्रा और परिवहन)",
     re.compile(r"\b(travel|transport|journey|trip|यात्रा|holiday|bus|train|flight|ticket|direction|जाना|स्कूल जा)\b", re.I)),
    ("3.3 Food & Health (भोजन और स्वास्थ्य)",
     re.compile(r"\b(food|eat|diet|health|खाना|भोजन|restaurant|meal|healthy|fitness|exercise|doctor|ill|सब्ज़ी|फल)\b", re.I)),
    ("4.1 Environment & Sustainability (पर्यावरण और स्थिरता)",
     re.compile(r"\b(environment|climate|pollution|recycle|पर्यावरण|sustainable|green|global warm|nature|पंडाल)\b", re.I)),
    ("4.2 Technology & Media (प्रौद्योगिकी और मीडिया)",
     re.compile(r"\b(technology|internet|social media|mobile|phone|digital|online|computer|media|app|फ़ोन)\b", re.I)),
    ("4.3 Global & Social Issues (वैश्विक और सामाजिक मुद्दे)",
     re.compile(r"\b(poverty|equality|community|society|global|social|समाज|issue|problem|world|मीटिंग|सोसाइटी)\b", re.I)),
    ("5.1 Reading Comprehension (पठन बोध)",
     re.compile(r"\b(read the passage|read the text|answer.*following|according to|comprehension|passage)\b", re.I)),
    ("5.2 Inference & Implication (अनुमान और निहितार्थ)",
     re.compile(r"\b(infer|imply|suggest|attitude|tone|writer.*think|what does.*mean|implied)\b", re.I)),
    ("5.3 Summary & Note-Making (सारांश और नोट बनाना)",
     re.compile(r"\b(summary|summarise|note|key point|main idea|सारांश|in your own words)\b", re.I)),
    ("6.1 Directed Writing (निर्देशित लेखन)",
     re.compile(r"\b(write a letter|write an email|write a report|write an article|directed|letter|email|report)\b", re.I)),
    ("6.2 Narrative & Descriptive Writing (कथात्मक और वर्णनात्मक लेखन)",
     re.compile(r"\b(story|narrative|describe|description|कहानी|imagine|scene|setting|once upon)\b", re.I)),
    ("6.3 Argumentative & Discursive Writing (तर्कपूर्ण और विमर्शात्मक लेखन)",
     re.compile(r"\b(argue|persuade|discuss|opinion|agree|disagree|advantages|disadvantages|argument|debate)\b", re.I)),
    ("7.1 Listening for Gist (मुख्य विचार सुनना)",
     re.compile(r"\b(listen|heard|speaker|topic of|what is.*about|general meaning|gist|संवाद|संक्षिप्त)\b", re.I)),
    ("7.2 Listening for Detail (विस्तार से सुनना)",
     re.compile(r"\b(name|number|time|place|when|where|how many|specific|detail|fact|कहाँ|कब|क्या|कौन)\b", re.I)),
    ("7.3 Extended Listening (विस्तारित श्रवण)",
     re.compile(r"\b(interview|discussion|conversation|longer|extended|explain|speaker.*attitude|निर्देश)\b", re.I)),
    ("8.1 Vocabulary & Word Choice (शब्द भंडार)",
     re.compile(r"\b(synonym|antonym|meaning|पर्यायवाची|विलोम|vocabulary|word|शब्द)\b", re.I)),
    ("8.2 Grammar & Sentence Structure (व्याकरण और वाक्य संरचना)",
     re.compile(r"\b(grammar|tense|verb|noun|sentence|व्याकरण|correct|fill in the blank|काल)\b", re.I)),
    ("8.3 Spelling & Script Accuracy (वर्तनी और लिपि शुद्धता)",
     re.compile(r"\b(spell|spelling|वर्तनी|correct form|script|devanagari|matra|शुद्ध)\b", re.I)),
]

FALLBACK_TOPIC = "7.2 Listening for Detail (विस्तार से सुनना)"


def classify_topic(text: str) -> str:
    for topic, pattern in TOPIC_RULES:
        if pattern.search(text):
            return topic
    return FALLBACK_TOPIC


def extract_marks(text: str) -> int:
    m = re.search(r"\[(\d+)\s*(?:marks?)?\]", text)
    return int(m.group(1)) if m else 1


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


# ── Page renderer ─────────────────────────────────────────────────────────────
def render_page_as_png(pdf_path: str, page_num: int, base_name: str, zoom: float = 2.5) -> str | None:
    """
    Render a PDF page as a high-quality PNG screenshot.
    This correctly renders vectors, text, and embedded images together.
    Returns path relative to public/ e.g. /diagrams/hindi/xxx.png
    """
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        filename = f"{base_name}_page{page_num + 1}.png"
        filepath = os.path.join(DIAGRAMS_DIR, filename)
        pix.save(filepath)
        doc.close()
        size_kb = os.path.getsize(filepath) // 1024
        return f"/diagrams/hindi/{filename}", size_kb
    except Exception as e:
        print(f"    WARN (render p{page_num+1}): {e}")
        return None, 0


def has_visual_content(pdf_path: str, page_num: int) -> bool:
    """
    Check if a page has meaningful visual content (images, drawings).
    Uses PyMuPDF drawing commands — pages with only text have few paths.
    """
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        # Check for images
        imgs = page.get_images(full=True)
        # Check for vector drawings (paths with fill)
        paths = page.get_drawings()
        filled_paths = [p for p in paths if p.get("fill") is not None]
        doc.close()
        return len(imgs) > 0 or len(filled_paths) > 5
    except Exception:
        return False


# ── Text extraction ───────────────────────────────────────────────────────────
def extract_pdf_pages_text(pdf_path: str) -> list[list[str]]:
    """Returns list of pages, each page is a list of text lines."""
    pages = []
    try:
        with pdfplumber.open(pdf_path, password="nokia2") as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                pages.append(lines)
    except Exception as e:
        print(f"    WARN (text): {e}")
    return pages


# ── Question extractors ───────────────────────────────────────────────────────
def extract_paper1_questions(pages: list[list[str]], ms_lines: list[str], source: str) -> list[dict]:
    """
    Paper 1 (Reading & Writing): numbered questions like '1', '2(a)', '3(b)(i)'
    """
    q_pattern = re.compile(r"^(\d+)\s*[\(\[]?([a-z]?)[\)\]]?\s+(.+)$")
    ms_text = "\n".join(ms_lines)
    questions = []

    all_lines = []
    for page_lines in pages:
        all_lines.extend(page_lines)

    blocks = []
    current = []
    for line in all_lines:
        if q_pattern.match(line):
            if current:
                blocks.append(" ".join(current))
            current = [line]
        elif current:
            current.append(line)
    if current:
        blocks.append(" ".join(current))

    for block in blocks:
        if len(block) < 12:
            continue
        marks = extract_marks(block)
        topic = classify_topic(block)

        answer = ""
        words = [w for w in block.lower().split() if len(w) > 4][:3]
        for word in words:
            pat = re.compile(rf".{{0,80}}{re.escape(word)}.{{0,80}}", re.I)
            m = pat.search(ms_text)
            if m:
                answer = m.group(0).strip()
                break

        questions.append({
            "question": block,
            "markingSchemeAnswer": answer or "See mark scheme",
            "topic": topic,
            "totalMarks": marks,
            "questionType": "THEORY",
        })

    return questions


def extract_paper2_questions(
    pdf_path: str,
    pages: list[list[str]],
    ms_lines: list[str],
    source: str,
    audio_src: str | None,
) -> list[dict]:
    """
    Paper 2 (Listening): Hindi question format 'प्रश्न N' with image MCQ options A B C D.
    Renders image-heavy pages as PNG screenshots for visual questions.
    """
    # Hindi question pattern: "प्रश्न 1" or "प्रश्न 1." etc.
    q_pattern = re.compile(r"^प्रश्न\s+(\d+)\.?\s*$")
    abcd_pattern = re.compile(r"^A\s+B\s+C\s+D$")
    ms_text = "\n".join(ms_lines)

    base_name = source.replace(".pdf", "")

    # Pre-render pages that have visual content
    page_screenshots: dict[int, str] = {}
    print(f"\n    Scanning {len(pages)} pages for visual content...", end=" ")
    for page_num in range(len(pages)):
        if has_visual_content(pdf_path, page_num):
            img_path, size_kb = render_page_as_png(pdf_path, page_num, base_name)
            if img_path:
                page_screenshots[page_num] = img_path
                print(f"p{page_num+1}({size_kb}KB)", end=" ")
    print()

    questions = []
    for page_num, page_lines in enumerate(pages):
        i = 0
        while i < len(page_lines):
            line = page_lines[i]
            m = q_pattern.match(line)
            if m:
                q_num = int(m.group(1))
                # Collect question text (next non-empty lines until A B C D or next प्रश्न)
                q_text_lines = []
                j = i + 1
                while j < len(page_lines):
                    next_line = page_lines[j]
                    if q_pattern.match(next_line):
                        break
                    if abcd_pattern.match(next_line):
                        j += 1  # skip the A B C D line
                        break
                    q_text_lines.append(next_line)
                    j += 1

                q_text = " ".join(q_text_lines).strip()
                if not q_text:
                    i = j
                    continue

                # Marks — look for [1] near this question
                marks = 1
                remaining = " ".join(page_lines[i:min(i+5, len(page_lines))])
                mm = re.search(r"\[(\d+)\]", remaining)
                if mm:
                    marks = int(mm.group(1))

                topic = classify_topic(q_text)

                # Find MS answer
                answer = ""
                words = [w for w in q_text.split() if len(w) > 3][:3]
                for word in words:
                    pat = re.compile(rf".{{0,80}}{re.escape(word)}.{{0,80}}", re.I)
                    mm2 = pat.search(ms_text)
                    if mm2:
                        answer = mm2.group(0).strip()
                        break

                q_entry: dict = {
                    "question": f"प्रश्न {q_num}: {q_text}",
                    "markingSchemeAnswer": answer or "See mark scheme",
                    "topic": topic,
                    "totalMarks": marks,
                    "questionType": "SELECT",  # image MCQ
                }

                # Attach screenshot if this page has visual content
                if page_num in page_screenshots:
                    q_entry["imageSrc"] = page_screenshots[page_num]
                else:
                    # Check adjacent pages
                    for nearby in [page_num - 1, page_num + 1]:
                        if nearby in page_screenshots:
                            q_entry["imageSrc"] = page_screenshots[nearby]
                            break

                if audio_src:
                    q_entry["audioSrc"] = audio_src

                questions.append(q_entry)
                i = j
            else:
                i += 1

    return questions


# ── Main paper processor ──────────────────────────────────────────────────────
def process_paper(qp_path: str, ms_path: str | None) -> list[dict]:
    source = os.path.basename(qp_path)
    print(f"  {source} ...", end=" ", flush=True)

    pages = extract_pdf_pages_text(qp_path)
    ms_lines = []
    if ms_path:
        ms_pages = extract_pdf_pages_text(ms_path)
        for p in ms_pages:
            ms_lines.extend(p)

    if not pages:
        print("SKIP (no text)")
        return []

    is_listening = "_qp_2" in source

    # Determine audio src
    audio_src = None
    if is_listening:
        if "_w24_" in source:
            audio_src = "/audio/hindi/0549_w24_listening.mp3"
        elif "_specimen27_" in source:
            audio_src = "/audio/hindi/0549_specimen27_listening.mp3"
        elif "_specimen19_" in source:
            audio_src = "/audio/hindi/0549_specimen19_listening.mp3"

    if is_listening:
        questions = extract_paper2_questions(qp_path, pages, ms_lines, source, audio_src)
    else:
        questions = extract_paper1_questions(pages, ms_lines, source)

    with_images = sum(1 for q in questions if q.get("imageSrc"))
    with_audio  = sum(1 for q in questions if q.get("audioSrc"))
    print(f"  → {len(questions)} questions  (img:{with_images}  audio:{with_audio}  MS:{'yes' if ms_lines else 'no'})")
    return questions


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    if not os.path.exists(HINDI_DIR):
        print(f"ERROR: {HINDI_DIR} not found.")
        return

    all_data = []

    qp_files = sorted([
        f for f in os.listdir(HINDI_DIR)
        if f.endswith(".pdf") and "_qp_" in f
    ])

    print(f"Found {len(qp_files)} QP files — image-aware extraction\n")
    print(f"Screenshots → {DIAGRAMS_DIR}\n")

    total_q = 0
    for qp_name in qp_files:
        qp_path = os.path.join(HINDI_DIR, qp_name)
        ms_name = qp_name.replace("_qp_", "_ms_")
        ms_path = os.path.join(HINDI_DIR, ms_name)

        questions = process_paper(qp_path, ms_path if os.path.exists(ms_path) else None)
        total_q += len(questions)

        all_data.append({
            "source": qp_name,
            "ms_source": ms_name if os.path.exists(ms_path) else None,
            "questions": questions,
        })
        save_progress(all_data)

    print(f"\n{'='*50}")
    print(f"Done! {len(qp_files)} papers | {total_q} questions total")
    img_q   = sum(1 for p in all_data for q in p["questions"] if q.get("imageSrc"))
    audio_q = sum(1 for p in all_data for q in p["questions"] if q.get("audioSrc"))
    print(f"  With images : {img_q}")
    print(f"  With audio  : {audio_q}")
    print(f"\nSaved: {PROGRESS_FILE}")
    print(f"Images: {DIAGRAMS_DIR}/")
    print(f"\nNext: npx tsx --env-file=.env.local src/server/scripts/seed-hindi-0549.ts")


if __name__ == "__main__":
    main()
