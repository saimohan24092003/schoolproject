import json
import os
import subprocess
import time

LINKS_FILE = "em_dynamic_links.json"
PROGRESS_FILE = "theory_seeds_progress.json"

def main():
    if not os.path.exists(LINKS_FILE):
        print("No em_dynamic_links.json found.")
        return

    with open(LINKS_FILE, "r") as f:
        links = json.load(f)

    # Load existing progress
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            try:
                progress = json.load(f)
            except:
                progress = []
    else:
        progress = []

    processed_sources = {p["source"] for p in progress}

    # Focus on 2015 papers
    qp_2015 = [l for l in links if "qp_" in l.lower() and ("_s15_" in l or "_w15_" in l or "_m15_" in l or "2015" in l)]
    
    count = 0
    for qp_link in qp_2015:
        if count >= 2:
            print("Reached limit of 2 papers for this run.")
            break

        qp_file = os.path.basename(qp_link)
        if qp_file in processed_sources:
            print(f"Skipping {qp_file}, already processed.")
            continue

        # Find corresponding MS
        ms_file = qp_file.replace("_qp_", "_ms_")
        ms_link = next((l for l in links if ms_file in l), None)

        if not ms_link:
            print(f"No MS found for {qp_file}. Skipping.")
            continue

        print(f"\n--- Processing {qp_file} ---")
        
        # 1. Download QP
        subprocess.run(["python", "scripts/python/download_pdfs.py", qp_link, qp_file])
        
        # 2. Download MS
        subprocess.run(["python", "scripts/python/download_pdfs.py", ms_link, ms_file])
        
        # 3. Process with theory_processor.py
        try:
            subprocess.run(["python", "scripts/python/theory_processor.py", qp_file, ms_file], check=True)
            print(f"Successfully processed {qp_file}")
            count += 1
            # Rate limiting for Gemini
            time.sleep(10) 
        except Exception as e:
            print(f"Error processing {qp_file}: {e}")

if __name__ == "__main__":
    main()
