import os
import requests
import pdfplumber
import json
import re
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD = "nokia2"
OUTPUT_DIR = "extracted_data"
DIAGRAMS_DIR = "public/diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# Exact titles for mapping
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
    """Extracts text and saves images from the PDF."""
    text_content = []
    image_mapping = {} # page_num -> list of image_paths
    
    print(f"Processing PDF: {pdf_path}")
    try:
        with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
            for i, page in enumerate(pdf.pages):
                # Extract text
                content = page.extract_text()
                if content:
                    text_content.append(f"--- PAGE {i+1} ---\n{content}")
                
                # Extract images
                page_images = page.images
                if page_images:
                    image_mapping[i+1] = []
                    for img_idx, img in enumerate(page_images):
                        # Extract the image using pdfplumber's cropping or the raw image data
                        # For simplicity in this script, we'll save a screenshot of the page 
                        # if images are detected, or crop the image bounding box.
                        try:
                            bbox = (img["x0"], img["top"], img["x1"], img["bottom"])
                            # Ensure bbox is valid
                            if bbox[2] > bbox[0] and bbox[3] > bbox[1]:
                                cropped = page.within_bbox(bbox).to_image()
                                img_filename = f"{os.path.basename(pdf_path)}_{i+1}_{img_idx}.png"
                                img_path = os.path.join(DIAGRAMS_DIR, img_filename)
                                cropped.save(img_path)
                                image_mapping[i+1].append(f"/diagrams/{img_filename}")
                        except Exception as e:
                            print(f"Image extraction error on page {i+1}: {e}")
                            
        return "\n".join(text_content), image_mapping
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None, None

def analyze_qp_with_ai(qp_text, image_mapping, metadata):
    model = genai.GenerativeModel('gemini-flash-latest')
    prompt = f"""
    You are an expert at extracting educational data.
    Extract questions from this IGCSE 0653 Combined Science paper.
    
    CRITICAL: You MUST map each question to EXACTLY one of the following syllabus topics:
    {json.dumps(SYLLABUS_TITLES, indent=2)}
    
    Images were found on the following pages:
    {json.dumps(image_mapping, indent=2)}
    
    Rules:
    1. Identify Question Number.
    2. Extract Question Text and Options (A, B, C, D).
    3. If a question refers to a diagram on its page, pick the most relevant image from the mapping.
    
    Format:
    [
      {{
        "number": 1,
        "topic": "B4. Enzymes",
        "question": "...",
        "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
        "imageSrc": "/diagrams/..." # Path if diagram exists
      }}
    ]
    
    Text:
    {qp_text[:18000]}
    """
    
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"AI Error: {e}")
        return None

def main():
    with open("dynamic_links.json", "r") as f:
        links = json.load(f)
    
    qp_links = [l for l in links if "_qp_" in l and any(yr in l for yr in ["23", "24"])]
    qp_links = qp_links[:5] # Process same 5 for consistency
    
    all_extracted_data = []
    
    for qp_link in qp_links:
        qp_path = download_file(qp_link)
        if not qp_path: continue
        
        qp_text, image_mapping = extract_content_and_images(qp_path)
        if qp_text:
            print(f"Analyzing {os.path.basename(qp_path)} with AI...")
            questions = analyze_qp_with_ai(qp_text, image_mapping, {"filename": os.path.basename(qp_path)})
            if questions:
                paper_data = {"source": os.path.basename(qp_path), "questions": questions}
                all_extracted_data.append(paper_data)
                with open("bulk_seeds_progress.json", "w") as f:
                    json.dump(all_extracted_data, f, indent=2)
                print(f"Completed {os.path.basename(qp_path)}.")
        time.sleep(10)

if __name__ == "__main__":
    main()
