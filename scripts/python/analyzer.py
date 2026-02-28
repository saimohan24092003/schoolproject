import json
import re
from collections import Counter

def calculate_priority(frequency):
    if frequency >= 15: return "HIGH"
    if frequency >= 5: return "MEDIUM"
    return "LOW"

def main():
    try:
        with open('bulk_seeds_progress.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Data file not found.")
        return

    # Count occurrences of each topic
    topic_counts = Counter()
    for paper in data:
        # Weight recent papers (2023-2025) more heavily
        weight = 2.5 if any(yr in paper['source'] for yr in ['23', '24', '25']) else 1.0
        for q in paper['questions']:
            topic_counts[q['topic']] += weight

    # Map to priority levels
    analysis = {}
    for topic, count in topic_counts.items():
        analysis[topic] = {
            "frequency": round(count, 1),
            "priority": calculate_priority(count)
        }

    with open('topic_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2)
    
    print(f"✅ Analyzed {len(analysis)} topics. Results saved to topic_analysis.json")

if __name__ == "__main__":
    main()
