import os
import requests
import pdfplumber
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PASSWORD = "nokia2"
OUTPUT_DIR = "extracted_data"

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

def extract_text(pdf_path):
    text_content = []
    try:
        with pdfplumber.open(pdf_path, password=PDF_PASSWORD) as pdf:
            for page in pdf.pages:
                content = page.extract_text()
                if content: text_content.append(content)
        # Fix: using double quotes for join
        return "\n".join(text_content)
    except Exception as e:
        print(f"MS Extraction error: {e}")
        return None

def extract_answers_with_ai(ms_text, metadata):
    model = genai.GenerativeModel('gemini-flash-latest')
    prompt = """
    Extract correct answers from this IGCSE 0653 Marking Scheme.
    Format: {"answers": [{"number": 1, "answer": "A" or "Detailed Explanation"}]}
    
    Text:
    """ + ms_text[:18000]
    
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"MS AI Error: {e}")
        return None

def main():
    if not os.path.exists("bulk_seeds_progress.json"):
        return
        
    with open("bulk_seeds_progress.json", "r") as f:
        papers = json.load(f)
    
    ms_urls = [
        "//dynamicpapers.com/wp-content/uploads/2015/09/0653_m23_ms_12.pdf",
        "//dynamicpapers.com/wp-content/uploads/2015/09/0653_m23_ms_22.pdf",
        "//dynamicpapers.com/wp-content/uploads/2015/09/0653_m23_ms_32.pdf",
        "//dynamicpapers.com/wp-content/uploads/2015/09/0653_m23_ms_42.pdf"
    ]
    
    ms_data = {}
    
    for url in ms_urls:
        ms_path = download_file(url)
        if ms_path:
            ms_text = extract_text(ms_path)
            if ms_text:
                print(f"Extracting answers from {os.path.basename(ms_path)}...")
                answers = extract_answers_with_ai(ms_text, {"filename": os.path.basename(ms_path)})
                if answers:
                    qp_key = os.path.basename(ms_path).replace("_ms_", "_qp_")
                    ms_data[qp_key] = {str(a["number"]): a["answer"] for a in answers["answers"]}
    
    for paper in papers:
        qp_filename = paper["source"]
        if qp_filename in ms_data:
            for q in paper["questions"]:
                q_num_str = str(q["number"])
                if q_num_str in ms_data[qp_filename]:
                    q["correctAnswer"] = ms_data[qp_filename][q_num_str]
    
    with open("bulk_seeds_progress.json", "w") as f:
        json.dump(papers, f, indent=2)
    print("Updated bulk_seeds_progress.json with correct answers.")

if __name__ == "__main__":
    main()
