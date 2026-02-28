"""
Extracts Theory/Short-answer questions and maps them to their Marking Scheme.
Specifically for Environmental Management (5014/0680).
"""
import os, sys, json, time, re, warnings
warnings.filterwarnings("ignore")

import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use a known-working model from our list_models output
MODEL_NAME = "gemini-flash-latest" 
PDF_PASSWORD = "nokia2"
EXTRACTED_DIR = "extracted_data"
DIAGRAMS_DIR = "public/diagrams"
PROGRESS_FILE = "theory_seeds_progress.json"

EM_TOPICS = [
    "1.1 Rocks and minerals", "1.2 Energy resources",
    "2.1 Agriculture", "2.2 Water management",
    "3.1 Oceans and fisheries", "3.2 Natural hazards",
    "4.1 The atmosphere", "4.2 Human population",
]

def extract_content(pdf_path):
    page_texts = {}
    image_mapping = {}
    
    def _do_extract(pdf):
        for i, page in enumerate(pdf.pages, start=1):
            # Text
            txt = page.extract_text()
            if txt: page_texts[i] = txt
            
            # Images
            imgs = page.images
            if imgs:
                image_mapping[i] = []
                for idx, img in enumerate(imgs):
                    try:
                        x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                        if x1 > x0 and bot > top:
                            pdf_name = os.path.basename(pdf_path)
                            fname = f"{pdf_name}_{i}_{idx}.png"
                            fpath = os.path.join(DIAGRAMS_DIR, fname)
                            if not os.path.exists(fpath):
                                cropped = page.within_bbox((x0, top, x1, bot)).to_image(resolution=150)
                                cropped.save(fpath)
                            image_mapping[i].append(f"/diagrams/{fname}")
                    except: pass

    try:
        with pdfplumber.open(pdf_path) as pdf: _do_extract(pdf)
    except:
        try:
            with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf: _do_extract(pdf)
        except Exception as e:
            print(f"FAILED to open {pdf_path}: {e}")
            return None, None
            
    return page_texts, image_mapping

def process_theory_paper(qp_name, ms_name):
    qp_path = os.path.join(EXTRACTED_DIR, qp_name)
    ms_path = os.path.join(EXTRACTED_DIR, ms_name)
    
    if not os.path.exists(qp_path) or not os.path.exists(ms_path):
        print(f"Missing files: {qp_name} or {ms_name}")
        return
        
    print(f"Processing Theory: {qp_name} with MS {ms_name} ...")
    
    qp_text, qp_images = extract_content(qp_path)
    ms_text, _ = extract_content(ms_path)
    
    if not qp_text or not ms_text: return
    
    # Format for Gemini
    full_qp = "\n".join(f"[PAGE {p}]\n{t}" for p, t in sorted(qp_text.items()))[:30000]
    full_ms = "\n".join(f"[PAGE {p}]\n{t}" for p, t in sorted(ms_text.items()))[:30000]
    
    img_lines = []
    for pg, paths in sorted(qp_images.items()):
        for path in paths: img_lines.append(f"  Page {pg}: {path}")
    img_info = "\n".join(img_lines) if img_lines else "(none)"

    prompt = (
        "You are an expert examiner for O Level Environmental Management (5014/0680).\n"
        "I will provide the Question Paper (QP) and the Marking Scheme (MS).\n"
        "Your task is to extract every structured question and its corresponding perfect answer from the marking scheme.\n\n"
        "Return a JSON array of objects:\n"
        "{\n"
        '  "number": "1(a)(i)",\n'
        '  "topic": "<one of the EM topics>",\n'
        '  "question": "<full question text from QP>",\n'
        '  "markingSchemeAnswer": "<full answer/points from MS>",\n'
        '  "totalMarks": <int>,\n'
        '  "imageSrc": "<path from list if applicable, else null>"\n'
        "}\n\n"
        f"Valid Topics: {json.dumps(EM_TOPICS)}\n\n"
        f"Extracted Images from QP:\n{img_info}\n\n"
        f"--- QUESTION PAPER TEXT ---\n{full_qp}\n\n"
        f"--- MARKING SCHEME TEXT ---\n{full_ms}\n\n"
        "Return ONLY the JSON array. Ensure high accuracy. If a question has multiple parts, separate them as individual objects."
    )

    model = genai.GenerativeModel(MODEL_NAME)
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()
        
        questions = json.loads(raw)
        
        # Save results
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, "r") as f: data = json.load(f)
        else: data = []
        
        data.append({
            "source": qp_name,
            "ms_source": ms_name,
            "questions": questions
        })
        
        with open(PROGRESS_FILE, "w") as f:
            json.dump(data, f, indent=2)
            
        print(f"SUCCESS: Extracted {len(questions)} theory questions.")
    except Exception as e:
        print(f"AI Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python theory_processor.py <qp_pdf> <ms_pdf>")
    else:
        process_theory_paper(sys.argv[1], sys.argv[2])
