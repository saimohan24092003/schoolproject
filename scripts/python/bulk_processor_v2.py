import os
import requests
import pdfplumber
import json
import re
import time
import argparse
import google.generativeai as genai
from google.api_core import exceptions
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD = "nokia2"
OUTPUT_DIR = "extracted_data"
DIAGRAMS_DIR = "public/diagrams"
PROGRESS_FILE = "bulk_seeds_progress.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

SYLLABUS_TITLES = [
    "B1. Characteristics of living organisms", "B2. Cells", "B3. Biological molecules", "B4. Enzymes",
    "B5. Plant nutrition", "B6. Animal nutrition", "B7. Transport", "B8. Gas exchange and respiration",
    "B9. Coordination and response", "B10. Reproduction", "B11. Inheritance", "B12. Ecology",
    "C1. Particulate nature of matter", "C2. Experimental techniques", "C3. Atoms, elements and compounds",
    "C4. Stoichiometry", "C5. Electricity and chemistry", "C6. Energy changes in reactions",
    "C7. Chemical reactions", "C8. Acids, bases and salts", "C9. The Periodic Table", "C10. Metals",
    "C11. Air and water", "C12. Organic chemistry",
    "P1. Motion, forces and energy", "P2. Thermal physics", "P3. Waves", "P4. Electricity and magnetism",
    "P5. Atomic physics", "P6. Space physics"
]

def download_file(url):
    if url.startswith("//"): url = "https:" + url
    filename = os.path.basename(url)
    local_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(local_path): return local_path
    print(f"Downloading {filename}...")
    try:
        response = requests.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return local_path
    except Exception as e:
        print(f"Download error: {e}")
    return None

def extract_content_and_images(pdf_path):
    text_content = []
    image_mapping = {}
    try:
        with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
            for i, page in enumerate(pdf.pages):
                content = page.extract_text()
                if content:
                    text_content.append(f"PAGE_{i+1}: {content}")
                page_images = page.images
                if page_images:
                    image_mapping[i+1] = []
                    for img_idx, img in enumerate(page_images):
                        try:
                            bbox = (img["x0"], img["top"], img["x1"], img["bottom"])
                            if bbox[2] > bbox[0] and bbox[3] > bbox[1]:
                                cropped = page.within_bbox(bbox).to_image()
                                img_filename = f"{os.path.basename(pdf_path)}_{i+1}_{img_idx}.png"
                                img_path = os.path.join(DIAGRAMS_DIR, img_filename)
                                cropped.save(img_path)
                                image_mapping[i+1].append(f"/diagrams/{img_filename}")
                        except Exception:
                            pass
        return "\n".join(text_content), image_mapping
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None, None

def analyze_qp_with_ai(qp_text, image_mapping, metadata, retries=6):
    # Explicitly using models/gemini-flash-latest for best compatibility
    model = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"Extract IGCSE 0653 questions. Map to: {json.dumps(SYLLABUS_TITLES)}. Images: {json.dumps(image_mapping)}. Format: [{{'number': 1, 'topic': 'B4. Enzymes', 'question': '...', 'options': ['A: ...', 'B: ...', 'C: ...', 'D: ...'], 'imageSrc': '/diagrams/...'}}]. Text: {qp_text[:15000]}"
    
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)
            json_str = response.text.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            return json.loads(json_str)
        except exceptions.ResourceExhausted as e:
            wait_time = 90  # Default wait — free tier needs longer pauses
            match = re.search(r"retry in (\d+\.?\d*)s", str(e))
            if match:
                wait_time = max(90, int(float(match.group(1))) + 5)
            print(f"⚠️ Quota exceeded. Waiting {wait_time}s before retry {attempt+1}/{retries}...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"AI Error: {e}")
            time.sleep(5)
            
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--batch_size', type=int, default=10)
    args = parser.parse_args()

    with open("dynamic_links.json", "r") as f:
        links = json.load(f)
    
    qp_links = sorted([l for l in links if "_qp_" in l])
    batch_links = qp_links[args.start : args.start + args.batch_size]
    
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            try:
                all_extracted_data = json.load(f)
            except:
                all_extracted_data = []
    else:
        all_extracted_data = []

    processed_sources = {d["source"] for d in all_extracted_data}
    
    for qp_link in batch_links:
        filename = os.path.basename(qp_link)
        if filename in processed_sources:
            continue
            
        qp_path = download_file(qp_link)
        if not qp_path: continue
        
        qp_text, image_mapping = extract_content_and_images(qp_path)
        if qp_text:
            print(f"Analyzing {filename} with AI...")
            questions = analyze_qp_with_ai(qp_text, image_mapping, {"filename": filename})
            if questions:
                paper_data = {"source": filename, "questions": questions}
                all_extracted_data.append(paper_data)
                with open(PROGRESS_FILE, "w") as f:
                    json.dump(all_extracted_data, f, indent=2)
                print(f"Completed {filename}.")
        # Longer delay between PDFs — free tier allows ~15 req/min
        time.sleep(30)

if __name__ == "__main__":
    main()
