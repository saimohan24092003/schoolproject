import pdfplumber
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(dotenv_path='.env.local')

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def extract_text_from_pdf(pdf_path):
    """Extracts raw text from a PDF file."""
    text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text.append(content)
    return "\n".join(text)

def structure_questions(raw_text):
    """Uses Gemini to structure raw text into a JSON format."""
    model = genai.GenerativeModel('gemini-flash-latest')
    
    prompt = """
    You are an expert at extracting educational data. 
    Below is raw text from a science question paper. 
    Extract each question and structure it into a JSON list.
    
    Rules:
    1. Identify the question number.
    2. Extract the question text.
    3. Extract options (A, B, C, D) if present.
    4. Identify the subject/topic if possible (Biology, Chemistry, Physics).
    5. If a question refers to a diagram, set "has_diagram" to true.
    
    Format:
    [
      {
        "id": 1,
        "subject": "Biology",
        "topic": "Cells",
        "question": "...",
        "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
        "has_diagram": false
      }
    ]
    
    Raw Text:
    """ + raw_text
    
    response = model.generate_content(prompt)
    try:
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print("Response text was:", response.text)
        return None

def main():
    pdf_path = "School project - Question Paper & Marking scheme/Question Paper/O level/Combined Science/2015/October - November/1.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return

    print(f"Reading PDF: {pdf_path}")
    raw_text = extract_text_from_pdf(pdf_path)
    
    # Limit text to first 20000 characters to avoid token limits for a quick test
    if len(raw_text) > 20000:
        raw_text = raw_text[:20000]

    print("Structuring questions using AI...")
    structured_data = structure_questions(raw_text)
    
    if structured_data:
        output_file = "extracted_questions.json"
        with open(output_file, "w") as f:
            json.dump(structured_data, f, indent=2)
        print(f"Successfully saved {len(structured_data)} questions to {output_file}")
        
        # Print the first question as an example
        print("\nStructured output example (First question):")
        print(json.dumps(structured_data[0], indent=2))
    else:
        print("Failed to structure data.")

if __name__ == "__main__":
    main()
