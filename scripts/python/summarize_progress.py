import json, os

if not os.path.exists("bulk_seeds_progress.json"):
    print("No progress file found.")
else:
    data = json.load(open("bulk_seeds_progress.json", encoding="utf-8"))
    total_q = sum(len(p["questions"]) for p in data)
    total_img = sum(1 for p in data for q in p["questions"] if q.get("imageSrc"))
    print(f"\nSummary: {len(data)} papers | {total_q} questions | {total_img} with diagrams")
    for p in data:
        imgs = sum(1 for q in p["questions"] if q.get("imageSrc"))
        print(f"  {p['source']}: {len(p['questions'])} Qs ({imgs} with diagrams)")
