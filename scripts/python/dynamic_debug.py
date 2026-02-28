import os
import requests
import re

ACCESS_CODE = "159357"
URL = "https://dynamicpapers.com/past-papers/cambridge-past-papers/o-level/subjects-a-e/combined-science/"
LOGIN_URL = "https://dynamicpapers.com/wp-login.php?action=postpass"

def debug_page():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": URL,
    })
    
    payload = {"post_password": ACCESS_CODE, "Submit": "Enter"}
    print("Logging in...")
    response = session.post(LOGIN_URL, data=payload, allow_redirects=True)
    
    if response.status_code == 200:
        print("Logged in. Fetching content...")
        response = session.get(URL)
        print(f"Content Length: {len(response.text)}")
        
        with open("dynamic_debug.html", "w", encoding="utf-8") as f:
            f.write(response.text)
            
        print("Searching for keywords...")
        for kw in ["0653", "5129", "2019", "2024", "pdf", ".pdf", "href="]:
            count = response.text.lower().count(kw.lower())
            print(f"Keyword '{kw}': {count}")
            
        # Try finding any hrefs at all
        hrefs = re.findall(r'href="([^"]+)"', response.text)
        print(f"Found {len(hrefs)} total hrefs.")
        
        # Look for iframe or scripts that load content
        if "iframe" in response.text.lower():
            iframes = re.findall(r'<iframe[^>]+src="([^"]+)"', response.text, re.I)
            print(f"Found {len(iframes)} iframes.")
            for i, src in enumerate(iframes):
                print(f"Iframe {i}: {src}")
                
        # Some WP plugins use data attributes
        if "data-link" in response.text:
            print("Detected data-link attributes.")
            
    else:
        print(f"Login failed: {response.status_code}")

if __name__ == "__main__":
    debug_page()
