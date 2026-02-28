import os
import requests
import sys

def download_file(url, local_path):
    if url.startswith("//"):
        url = "https:" + url
        
    if os.path.exists(local_path):
        print(f"File already exists: {local_path}")
        return True
    
    print(f"Downloading {url} ...")
    try:
        response = requests.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"  Done.")
            return True
        else:
            print(f"  Failed. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python download_pdfs.py <url> <filename>")
        return

    url = sys.argv[1]
    filename = sys.argv[2]
    
    target_dir = "extracted_data"
    os.makedirs(target_dir, exist_ok=True)
    
    local_path = os.path.join(target_dir, filename)
    download_file(url, local_path)

if __name__ == "__main__":
    main()
