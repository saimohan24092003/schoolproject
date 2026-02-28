import os
import subprocess
import time
import json

def run_command(command, description):
    print(f"\n{'='*50}")
    print(f"🚀 RUNNING: {description}")
    print(f"{'='*50}")
    
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"❌ ERROR: Command failed with exit code {result.returncode}")
        return False
    return True

def main():
    if not os.path.exists("dynamic_links.json"):
        print("Missing dynamic_links.json. Please run dynamic_access.py first.")
        return
        
    with open("dynamic_links.json", "r") as f:
        links = json.load(f)
        
    qp_links = sorted([l for l in links if "_qp_" in l])
    total_papers = len(qp_links)
    batch_size = 10
    
    print(f"Starting Master Pipeline for {total_papers} Question Papers...")
    
    # Let's start from index 5 since we already did 0-4 as a sample
    for start_idx in range(5, total_papers, batch_size):
        print(f"\n\n🟢 STARTING BATCH {start_idx} to {min(start_idx + batch_size - 1, total_papers - 1)}")
        
        # Step 1: AI Extraction & Diagram Cropping
        cmd_extract = f"python scripts/python/bulk_processor_v2.py --start {start_idx} --batch_size {batch_size}"
        if not run_command(cmd_extract, f"Extraction Phase (Batch {start_idx})"):
            print("Stopping pipeline due to extraction error.")
            break
            
        # Step 2: Marking Scheme Answer Sync
        cmd_ms = "python scripts/python/ms_processor.py"
        run_command(cmd_ms, "Marking Scheme Verification Phase")
        
        # Step 3: Database Seeding (Idempotent)
        cmd_seed = "npx tsx ./src/server/scripts/seed-bulk.ts"
        if not run_command(cmd_seed, "Database Seeding Phase"):
             print("Stopping pipeline due to database error.")
             break
             
        print(f"✅ Batch {start_idx} fully integrated into the application.")
        
        # Pause to reset AI Quotas (Gemini Free Tier has limits per minute/day)
        print("⏳ Pausing for 120 seconds to reset API quotas before next batch...")
        time.sleep(120)

if __name__ == "__main__":
    main()
