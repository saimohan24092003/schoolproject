"""
reextract_hindi_w24.py  —  Gemini Vision re-extraction for 0549_w24_qp_11.pdf

The w24 paper uses custom font encoding that breaks pdfplumber (gives cid: garbage).
This script renders each page as a high-res PNG and sends to Gemini to extract
clean Hindi question text.

Saves updated questions into hindi_seeds_0549.json.
"""

import os, sys, json, base64, time, re, fitz
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(".env.local")
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.0-flash")

HINDI_DIR     = "extracted_data/hindi"
PROGRESS_FILE = "hindi_seeds_0549.json"

# ── Topic classifier (same as main extractor) ──────────────────────────────
TOPIC_RULES = [
    ("1.1 Family & Relationships (परिवार और रिश्ते)",
     re.compile(r"\b(परिवार|family|माता|पिता|भाई|बहन|रिश्ता|घर में)\b", re.I)),
    ("1.2 Identity & Personal Life (पहचान और व्यक्तिगत जीवन)",
     re.compile(r"\b(hobby|शौक|पसंद|interest|व्यक्तित्व|पहन|कपड़)\b", re.I)),
    ("1.3 Home & Local Area (घर और स्थानीय क्षेत्र)",
     re.compile(r"\b(home|house|घर|neighbourhood|local area|directions)\b", re.I)),
    ("2.1 School & Education (स्कूल और शिक्षा)",
     re.compile(r"\b(school|education|subject|teacher|class|study|स्कूल|शिक्षा|पढ़ाई|छात्र)\b", re.I)),
    ("2.2 Work & Career (काम और करियर)",
     re.compile(r"\b(job|work|career|profession|काम|नौकरी|workplace)\b", re.I)),
    ("2.3 Future Plans & Ambitions (भविष्य की योजनाएं)",
     re.compile(r"\b(future|plan|ambition|भविष्य|योजना|aspiration)\b", re.I)),
    ("3.1 Free Time & Hobbies (खाली समय और शौक)",
     re.compile(r"\b(free time|leisure|sport|hobby|खेल|entertainment|weekend)\b", re.I)),
    ("3.2 Travel & Transport (यात्रा और परिवहन)",
     re.compile(r"\b(travel|transport|journey|trip|यात्रा|bus|train|flight)\b", re.I)),
    ("3.3 Food & Health (भोजन और स्वास्थ्य)",
     re.compile(r"\b(food|eat|diet|health|खाना|भोजन|meal|healthy|fitness|doctor)\b", re.I)),
    ("4.1 Environment & Sustainability (पर्यावरण और स्थिरता)",
     re.compile(r"\b(environment|climate|pollution|पर्यावरण|sustainable|green)\b", re.I)),
    ("4.2 Technology & Media (प्रौद्योगिकी और मीडिया)",
     re.compile(r"\b(technology|internet|social media|mobile|phone|digital|online|computer)\b", re.I)),
    ("4.3 Global & Social Issues (वैश्विक और सामाजिक मुद्दे)",
     re.compile(r"\b(poverty|equality|community|society|global|social|समाज)\b", re.I)),
    ("5.1 Reading Comprehension (पठन बोध)",
     re.compile(r"\b(passage|text|read|paragraph|आलेख|अनुच्छेद|पठन|पाठ|पढ़|reading)\b", re.I)),
    ("7.2 Listening for Detail (विस्तार से सुनना)",
     re.compile(r"\b(listen|audio|conversation|dialogue|सुन|वार्तालाप|संवाद|बातचीत|interview)\b", re.I)),
]

def classify_topic(text: str) -> str:
    for topic, pattern in TOPIC_RULES:
        if pattern.search(text):
            return topic
    return "5.1 Reading Comprehension (पठन बोध)"


EXTRACTION_PROMPT = """You are extracting questions from a Cambridge IGCSE Hindi as a Second Language Paper 1 (Reading & Writing) exam paper.

This page is from the November 2024 paper. Extract ALL questions visible on this page.

For each question, output in this EXACT JSON format:
[
  {
    "questionNumber": 1,
    "questionText": "full question text in clean Hindi (Devanagari)",
    "questionType": "SHORT_ANSWER" or "MCQ" or "FILL_BLANK",
    "marks": 1,
    "passageContext": "brief description of the passage this question is based on (if applicable)",
    "options": ["A option text", "B option text"] or null if not MCQ
  }
]

IMPORTANT:
- Use clean Devanagari Hindi characters — NO (cid:xxx) codes, NO garbled text
- Preserve the EXACT question text as printed in the paper
- Include question numbers
- For reading comprehension questions, include the passage title/context in passageContext
- Return ONLY the JSON array, no other text
- If no questions on this page, return []
"""

def render_page_to_base64(page, dpi=200):
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    return base64.b64encode(pix.tobytes("png")).decode("utf-8")


def extract_questions_from_page(page_img_b64: str, page_num: int) -> list[dict]:
    """Send rendered page to Gemini and get structured questions."""
    try:
        resp = model.generate_content([
            EXTRACTION_PROMPT,
            {"mime_type": "image/png", "data": page_img_b64},
        ], generation_config={"temperature": 0.1})
        raw = resp.text.strip()
        # Strip markdown code fences
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        raw = raw.strip()
        if not raw or raw == "[]":
            return []
        return json.loads(raw)
    except Exception as e:
        print(f"  [Gemini error page {page_num}]: {e}")
        return []


def main():
    qp_path = os.path.join(HINDI_DIR, "0549_w24_qp_11.pdf")
    ms_path  = os.path.join(HINDI_DIR, "0549_w24_ms_11.pdf")
    if not os.path.exists(qp_path):
        print(f"❌ Not found: {qp_path}")
        return

    # Load mark scheme text (for answers)
    ms_text = ""
    if os.path.exists(ms_path):
        ms_doc = fitz.open(ms_path)
        ms_text = "\n".join(p.get_text("text") for p in ms_doc)

    print(f"Processing: {qp_path}")
    doc = fitz.open(qp_path)

    all_extracted = []
    # Skip page 0 (cover/instructions), process content pages
    for page_num in range(1, len(doc)):
        page = doc[page_num]
        # Quick check: skip pages with no Hindi content
        quick_text = page.get_text("text")
        if len(quick_text.strip()) < 50 and page_num > 0:
            print(f"  Page {page_num+1}: skipping (blank/instructions)")
            continue

        print(f"  Page {page_num+1}: extracting via Gemini Vision...")
        img_b64 = render_page_to_base64(page, dpi=200)
        questions = extract_questions_from_page(img_b64, page_num)
        print(f"    → {len(questions)} questions found")
        for q in questions:
            all_extracted.append({
                "pageNum": page_num + 1,
                **q,
            })
        time.sleep(1)  # rate limit

    print(f"\nTotal extracted: {len(all_extracted)} questions")

    # Convert to seeds format
    seeds_questions = []
    for q in all_extracted:
        q_num = q.get("questionNumber", 0)
        text = q.get("questionText", "").strip()
        if not text:
            continue

        # Try to get answer from mark scheme
        ms_answer = "See mark scheme"
        # Simple lookup: find Q number in mark scheme
        ms_match = re.search(rf"(?:^|\n)\s*{q_num}\s+([^\n]{{5,120}})", ms_text)
        if ms_match:
            ms_answer = ms_match.group(1).strip()

        context = q.get("passageContext", "")
        full_question = f"[{context}]\n\n{text}" if context else text

        topic = classify_topic(text + " " + context)
        q_type = "SELECT" if q.get("questionType") == "MCQ" else "THEORY"
        options = q.get("options") or []

        seeds_questions.append({
            "question": full_question,
            "questionType": q_type,
            "topic": topic,
            "marks": q.get("marks", 1),
            "totalMarks": q.get("marks", 1),
            "markingSchemeAnswer": ms_answer,
            "imageSrc": None,
            "audioSrc": None,
            "options": options if options else None,
        })

    if not seeds_questions:
        print("No questions extracted — check Gemini responses above")
        return

    # Update hindi_seeds_0549.json
    with open(PROGRESS_FILE, encoding="utf-8") as f:
        seeds = json.load(f)

    # Remove old w24 qp_11 entry
    seeds = [p for p in seeds if "w24_qp_11" not in p.get("source", "")]

    # Add new entry
    seeds.append({
        "source": "0549_w24_qp_11.pdf",
        "questions": seeds_questions,
    })

    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {len(seeds_questions)} questions to {PROGRESS_FILE}")
    print("Now run: npx tsx src/server/scripts/reseed-hindi.ts")


if __name__ == "__main__":
    main()
