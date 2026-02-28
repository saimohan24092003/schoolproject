import os
import requests
import re
import json

# Access details
ACCESS_CODE = "159357"
PDF_PASSWORD = "nokia2"
URL = "https://dynamicpapers.com/past-papers/cambridge-past-papers/o-level/subjects-a-e/combined-science/"
LOGIN_URL = "https://dynamicpapers.com/wp-login.php?action=postpass"

def get_session():
    """Authenticates with Dynamic Papers and returns a session object."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": URL,
    })
    
    payload = {"post_password": ACCESS_CODE, "Submit": "Enter"}
    print("Logging into Dynamic Papers...")
    try:
        response = session.post(LOGIN_URL, data=payload, allow_redirects=True)
        if response.status_code == 200:
            print("Successfully established session.")
            return session
        else:
            print(f"Login failed. Status: {response.status_code}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def find_pdf_links(session):
    print(f"Fetching {URL}...")
    response = session.get(URL)
    
    if "This content is password protected" in response.text:
        print("Still locked! Access code incorrect or session not set.")
        return []
    
    print("Content unlocked. Searching for 0653 PDF links...")
    # More robust regex: look for any href containing .pdf
    all_hrefs = re.findall(r'href="([^"]+\.pdf)"', response.text, re.I)
    
    # Filter for 0653 and year (2019-2025)
    filtered = []
    # Match strings like 0653_s19_qp_11.pdf or 0653/2019/May-June/0653_s19_qp_11.pdf
    # Pattern to find years: 19, 20, 21, 22, 23, 24, 25
    year_pattern = re.compile(r'(?:[ /_])(19|20|21|22|23|24|25)(?:[ /_])', re.I)
    
    for l in all_hrefs:
        # Check if 0653 is in the link
        if "0653" in l:
            # Check if it's qp or ms for Paper 1 or 2
            # Paper 1: MCQ, Paper 2: MCQ (sometimes Extended), Paper 3: Theory, Paper 4: Theory (Extended)
            # The user asked for "Combined Science", let's take QP and MS for Papers 1, 2, 3, 4
            if any(p in l.lower() for p in ["qp_1", "qp_2", "qp_3", "qp_4", "ms_1", "ms_2", "ms_3", "ms_4"]):
                # Check for year 2019-2025
                if any(yr in l for yr in ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "_s19_", "_w19_", "_m19_", "_s20_", "_w20_", "_m20_", "_s21_", "_w21_", "_m21_", "_s22_", "_w22_", "_m22_", "_s23_", "_w23_", "_m23_", "_s24_", "_w24_", "_m24_", "_s25_", "_w25_", "_m25_"]):
                    filtered.append(l)
    
    # De-duplicate
    unique_links = sorted(list(set(filtered)))
    return unique_links

def main():
    session = get_session()
    if session:
        links = find_pdf_links(session)
        print(f"Found {len(links)} PDF links for 0653 (2019-2025).")
        
        if links:
            # Print sample
            for l in links[:5]:
                print(f" - {l}")
                
            with open("dynamic_links.json", "w") as f:
                json.dump(links, f, indent=2)
            print("Links saved to dynamic_links.json")
    else:
        print("Could not establish session.")

if __name__ == "__main__":
    main()
