import os
import requests
import pdfplumber
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Access details
PDF_PASSWORD = "nokia2"

def download_file(url, local_path):
    if url.startswith("//"):
        url = "https:" + url
    print(f"Downloading {url}...")
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            print(f"Failed to download. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"Download error: {e}")
        return False

def extract_text(pdf_path, password):
    text_content = []
    print(f"Opening PDF with password: {pdf_path}")
    try:
        with pdfplumber.open(pdf_path, password=password) as pdf:
            for page in pdf.pages:
                content = page.extract_text()
                if content:
                    text_content.append(content)
        # Use single quotes for join
        return '\n'.join(text_content)
    except Exception as e:
        print(f"Error decrypting PDF: {e}")
        return None

def structure_questions(raw_text, metadata):
    model = genai.GenerativeModel('gemini-flash-latest')
    prompt = """
    Extract IGCSE Combined Science (0653) questions. 
    Format: [{"id": num, "subject": "Bio/Chem/Phys", "question": "...", "options": ["A", "B", "C", "D"]}]
    
    Text:
    """ + raw_text[:15000]
    
    response = model.generate_content(prompt)
    try:
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        return json.loads(json_str)
    except Exception:
        return None

def main():
    if not os.path.exists("dynamic_links.json"):
        print("Run dynamic_access.py first.")
        return
        
    with open("dynamic_links.json", "r") as f:
        links = json.load(f)
        
    sample_links = [l for l in links if "24_qp" in l or "23_qp" in l]
    if not sample_links:
        print("No sample links found.")
        return
        
    link = sample_links[0]
    filename = os.path.basename(link)
    local_path = f"data/{filename}"
    os.makedirs("data", exist_ok=True)
    
    if download_file(link, local_path):
        raw_text = extract_text(local_path, PDF_PASSWORD)
        if raw_text:
            print(f"Successfully extracted {len(raw_text)} chars of text.")
            print("Structuring with AI...")
            data = structure_questions(raw_text, {"filename": filename})
            if data:
                output_file = f"data/{filename.replace('.pdf', '.json')}"
                with open(output_file, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"Extraction complete! Saved to {output_file}")
                if data:
                    print("\nSample Question:")
                    print(json.dumps(data[0], indent=2))
            else:
                print("AI structuring failed.")
        else:
            print("Text extraction failed.")
            
if __name__ == "__main__":
    main()
