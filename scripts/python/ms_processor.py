import json
import os
import re
import pdfplumber
import requests

PDF_PASSWORD = "nokia2"
OUTPUT_DIR = "extracted_data"
PROGRESS_FILE = "bulk_seeds_progress.json"
LINKS_FILE = "dynamic_links.json"

def download_file(url):
    if url.startswith("//"): url = "https:" + url
    filename = os.path.basename(url)
    local_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(local_path): return local_path
    try:
        response = requests.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return local_path
    except:
        pass
    return None

def extract_mcq_answers(text):
    answers = {}
    pattern = re.compile(r'(\d+)\s+([A-D])(?:\s|$)')
    matches = pattern.findall(text)
    for num, letter in matches:
        if int(num) <= 40:
            answers[num] = letter
    return answers

def main():
    if not os.path.exists(PROGRESS_FILE) or not os.path.exists(LINKS_FILE): 
        return
    
    with open(PROGRESS_FILE, "r") as f:
        papers = json.load(f)
        
    with open(LINKS_FILE, "r") as f:
        all_links = json.load(f)
        
    # Get all MS links
    ms_links = {os.path.basename(l): l for l in all_links if "_ms_" in l}
    
    updates_made = 0
    
    for paper in papers:
        qp_file = paper["source"]
        # Only process Paper 1 and Paper 2 (MCQ) for deterministic extraction
        if "_qp_1" not in qp_file and "_qp_2" not in qp_file:
            continue
            
        ms_file = qp_file.replace("_qp_", "_ms_")
        
        # Check if we already processed answers for this paper
        has_answers = any("correctAnswer" in q for q in paper["questions"])
        if has_answers: continue
        
        if ms_file in ms_links:
            ms_path = download_file(ms_links[ms_file])
            if not ms_path: continue
            
            print(f"Parsing answers from {ms_file}...")
            text_content = []
            try:
                with pdfplumber.open(ms_path, password=PDF_PASSWORD) as pdf:
                    for page in pdf.pages:
                        content = page.extract_text()
                        if content: text_content.append(content)
                
                text = "\n".join(text_content)
                answers = extract_mcq_answers(text)
                
                if answers:
                    for q in paper["questions"]:
                        q_num = str(q["number"])
                        if q_num in answers:
                            q["correctAnswer"] = answers[q_num]
                    updates_made += 1
                    print(f"Updated {len(answers)} answers for {qp_file}")
            except Exception as e:
                print(f"Error reading {ms_file}: {e}")
                
    if updates_made > 0:
        with open(PROGRESS_FILE, "w") as f:
            json.dump(papers, f, indent=2)
        print(f"Generalized MS Sync complete. Updated {updates_made} papers.")
    else:
        print("No new MCQ answers needed syncing.")

if __name__ == "__main__":
    main()
