import os
import requests
import re
import json

# Access details
ACCESS_CODE = "159357"
URL = "https://dynamicpapers.com/past-papers/cambridge-past-papers/o-level/subjects-a-e/environmental-management/"
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
    
    print("Content unlocked. Searching for PDF links...")
    # More robust regex: look for any href containing .pdf
    all_hrefs = re.findall(r'href="([^"]+\.pdf)"', response.text, re.I)
    print(f"Total PDF links found: {len(all_hrefs)}")
    if all_hrefs:
        print("Sample links:")
        for l in all_hrefs[:10]:
            print(f" - {l}")
    
    # Filter for 0680 and 5014 and year (2015-2025)
    filtered = []
    years = [str(y) for y in range(2015, 2026)]
    short_years = [str(y)[2:] for y in range(2015, 2026)]
    
    for l in all_hrefs:
        if "5014" in l or "0680" in l:
            if "qp_" in l.lower() or "ms_" in l.lower():
                # Check for years like 2015 or _s15_
                year_match = False
                for yr in years:
                    if yr in l:
                        year_match = True
                        break
                if not year_match:
                    for syr in short_years:
                        if f"_s{syr}_" in l or f"_w{syr}_" in l or f"_m{syr}_" in l:
                            year_match = True
                            break
                if year_match:
                    filtered.append(l)
    
    unique_links = sorted(list(set(filtered)))
    return unique_links

def main():
    session = get_session()
    if session:
        links = find_pdf_links(session)
        print(f"Found {len(links)} PDF links for 5014/0680 (2015-2025).")
        
        if links:
            # Print sample
            for l in links[:20]:
                print(f" - {l}")
                
            with open("em_dynamic_links.json", "w") as f:
                json.dump(links, f, indent=2)
            print("Links saved to em_dynamic_links.json")
    else:
        print("Could not establish session.")

if __name__ == "__main__":
    main()
