import json
import os
import re
import pdfplumber

def extract_mcq_answers(text):
    answers = {}
    pattern = re.compile(r'(\d+)\s+([A-D])(?:\s|$)')
    matches = pattern.findall(text)
    for num, letter in matches:
        if int(num) <= 40:
            answers[num] = letter
    return answers

def main():
    if not os.path.exists("bulk_seeds_progress.json"): return
    
    with open("bulk_seeds_progress.json", "r") as f:
        papers = json.load(f)
        
    ms_files = {
        "0653_m23_qp_12.pdf": "0653_m23_ms_12.pdf",
        "0653_m23_qp_22.pdf": "0653_m23_ms_22.pdf"
    }
    
    PDF_PASSWORD = "nokia2"
    
    for qp_file, ms_file in ms_files.items():
        ms_path = os.path.join("extracted_data", ms_file)
        if not os.path.exists(ms_path): continue
        
        print(f"Parsing MCQ grid from {ms_file}...")
        text_content = []
        try:
            with pdfplumber.open(ms_path, password=PDF_PASSWORD) as pdf:
                for page in pdf.pages:
                    content = page.extract_text()
                    if content:
                        text_content.append(content)
            
            text = "\n".join(text_content)
            answers = extract_mcq_answers(text)
            print(f"Found {len(answers)} answers.")
            
            for paper in papers:
                if paper["source"] == qp_file:
                    for q in paper["questions"]:
                        q_num = str(q["number"])
                        if q_num in answers:
                            q["correctAnswer"] = answers[q_num]
        except Exception as e:
            print(f"Error reading {ms_file}: {e}")
                        
    with open("bulk_seeds_progress.json", "w") as f:
        json.dump(papers, f, indent=2)
    print("Deterministically updated MCQ answers.")

if __name__ == "__main__":
    main()
