import json
import os
from collections import Counter

def analyze_topics():
    PROGRESS_FILE = "theory_seeds_progress.json"
    if not os.path.exists(PROGRESS_FILE):
        print("No theory_seeds_progress.json found.")
        return

    with open(PROGRESS_FILE, "r") as f:
        data = json.load(f)

    all_questions = []
    for paper in data:
        all_questions.extend(paper["questions"])

    topics = [q["topic"] for q in all_questions]
    topic_counts = Counter(topics)
    total_q = len(topics)

    print(f"--- Environmental Management Topic Analysis ({total_q} questions) ---")
    print(f"{'Topic':<40} | {'Frequency':<10} | {'Weight':<10}")
    print("-" * 65)
    
    # Sort by frequency
    for topic, count in topic_counts.most_common():
        weight = (count / total_q) * 100
        print(f"{topic:<40} | {count:<10} | {weight:>5.1f}%")

    # Important Insight for the user
    print("\n--- Important Topics Summary ---")
    top_3 = topic_counts.most_common(3)
    for i, (topic, count) in enumerate(top_3, 1):
        print(f"{i}. {topic} (High frequency in past papers)")

if __name__ == "__main__":
    analyze_topics()
