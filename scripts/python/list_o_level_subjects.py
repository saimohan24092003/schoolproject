import os
import requests
import re
import json

# Access details
ACCESS_CODE = "159357"
URL = "https://dynamicpapers.com/past-papers/cambridge-past-papers/o-level/"
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

def find_subjects(session):
    print(f"Fetching {URL}...")
    response = session.get(URL)
    
    if "This content is password protected" in response.text:
        print("Still locked! Access code incorrect or session not set.")
        return []
    
    print("Content unlocked. Searching for subject links...")
    # Find all links in the main content area
    links = re.findall(r'href="([^"]+)"', response.text)
    
    # Filter for o-level subjects
    subjects = []
    for l in links:
        if "/o-level/" in l.lower() and not l.endswith("/o-level/"):
            subjects.append(l)
    
    unique_subjects = sorted(list(set(subjects)))
    return unique_subjects

def main():
    session = get_session()
    if session:
        subjects = find_subjects(session)
        print(f"Found {len(subjects)} subject links.")
        for s in subjects:
            print(f" - {s}")
    else:
        print("Could not establish session.")

if __name__ == "__main__":
    main()
