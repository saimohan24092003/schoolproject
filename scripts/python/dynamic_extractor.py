import os
import requests
import pdfplumber
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='.env.local')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def download_file(url, local_path):
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

def extract_from_encrypted_pdf(pdf_path, password):
    text_content = []
    print(f"Opening PDF: {pdf_path}")
    try:
        # Some PDFs might not actually be encrypted, try without password first
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    content = page.extract_text()
                    if content:
                        text_content.append(content)
                return "\n".join(text_content)
        except Exception:
            # If standard opening fails, try with password
            with pdfplumber.open(pdf_path, password=password) as pdf:
                for page in pdf.pages:
                    content = page.extract_text()
                    if content:
                        text_content.append(content)
                return "\n".join(text_content)
    except Exception as e:
        print(f"Error decrypting/reading PDF: {e}")
        return None

def structure_questions(raw_text):
    model = genai.GenerativeModel('gemini-flash-latest')
    prompt = """
    Extract IGCSE Combined Science (0653) questions from this text. 
    Structure as JSON list: [{"id": num, "subject": "Bio/Chem/Phys", "question": "...", "options": ["A", "B", "C", "D"]}]
    
    Text:
    """ + raw_text[:15000]
    
    response = model.generate_content(prompt)
    json_str = response.text.strip()
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0].strip()
    return json.loads(json_str)

def main():
    # URL for 2024 Paper 1 Variant 1 (GCE Guide)
    url = "https://pastpapers.gceguide.com/IGCSE/Science%20-%20Combined%20(0653)/2024/0653_s24_qp_11.pdf"
    local_path = "0653_2024_sample.pdf"
    password = "nokia2"
    
    if download_file(url, local_path):
        raw_text = extract_from_encrypted_pdf(local_path, password)
        if raw_text:
            print("Structuring questions...")
            data = structure_questions(raw_text)
            with open("extracted_2024_sample.json", "w") as f:
                json.dump(data, f, indent=2)
            print("Successfully extracted 2024 sample questions.")
        else:
            print("Extraction failed.")

if __name__ == "__main__":
    main()
