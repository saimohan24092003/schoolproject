"""
generate_topic_analysis.py

Reads theory_seeds_progress.json, counts how many times each syllabus topic
appears across ALL past papers, then writes / merges the results into
topic_analysis.json — the file that Smart Practice uses for priority + frequency.

Priority tiers (per subject):
  HIGH   — top 35% of topics by question count
  MEDIUM — middle 35%
  LOW    — bottom 30%

Also adds paper-type breakdown: how many questions come from Paper 2 vs Paper 4.

Usage:
    python scripts/python/generate_topic_analysis.py [--subject 0580]

Pass --subject to only update a single subject; otherwise ALL subjects are updated.
Existing entries for other subjects are preserved.
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROGRESS_FILE = "theory_seeds_progress.json"
ANALYSIS_FILE = "topic_analysis.json"

# Official syllabus topics per subject ─────────────────────────────────────────
SYLLABUS = {
    "0653": [
        "B1. Characteristics of living organisms", "B2. Cells",
        "B3. Movement into and out of cells", "B4. Biological molecules",
        "B5. Enzymes", "B6. Plant nutrition", "B7. Human nutrition",
        "B8. Transport in plants", "B9. Transport in animals",
        "B10. Diseases and immunity", "B11. Gas exchange in humans",
        "B12. Respiration", "B13. Drugs", "B14. Reproduction",
        "B15. Organisms and their environment",
        "B16. Human influences on ecosystems",
        "C1. States of matter", "C2. Atoms, elements and compounds",
        "C3. Stoichiometry", "C4. Electrochemistry",
        "C5. Chemical energetics", "C6. Chemical reactions",
        "C7. Acids, bases and salts", "C8. The Periodic Table",
        "C9. Metals", "C10. Chemistry of the environment",
        "C11. Organic chemistry",
        "C12. Experimental techniques and chemical analysis",
        "P1. Motion, forces and energy", "P2. Thermal physics",
        "P3. Waves", "P4. Electricity", "P5. Space physics",
    ],
    "0580": [
        "1.1 Types of numbers", "1.2 Fractions, decimals and percentages",
        "1.3 Powers and roots", "1.4 Ratio and proportion",
        "1.5 Estimation and bounds", "1.6 Speed, distance and time",
        "2.1 Algebraic manipulation", "2.2 Solving equations",
        "2.3 Inequalities", "2.4 Sequences", "2.5 Functions",
        "2.6 Graphs of functions",
        "3.1 Straight-line graphs", "3.2 Distance and midpoint",
        "3.3 Graphs in real-life contexts",
        "4.1 Angles and lines", "4.2 Triangles and quadrilaterals",
        "4.3 Circles", "4.4 Constructions and loci",
        "5.1 Perimeter and area", "5.2 Volume and surface area",
        "5.3 Similar shapes",
        "6.1 Right-angled triangles", "6.2 Sine and cosine rules",
        "6.3 Trigonometric graphs", "6.4 3D trigonometry",
        "7.1 Transformations", "7.2 Vectors", "7.3 Vector geometry",
        "8.1 Probability", "8.2 Statistical diagrams",
        "8.3 Measures of central tendency", "8.4 Spread and correlation",
    ],
    "0500": [
        "1.1 Reading for ideas — purpose and audience",
        "1.2 Reading for ideas — tone, attitude and bias",
        "1.3 Reading for meaning — inference and deduction",
        "1.4 Reading for meaning — language and effect",
        "1.5 Note-making",
        "1.6 Summary writing",
        "2.1 Directed writing — adapting style and register",
        "2.2 Directed writing — selecting and re-using information",
        "2.3 Composition — narrative writing",
        "2.4 Composition — descriptive writing",
        "2.5 Composition — argumentative writing",
        "2.6 Composition — discursive writing",
    ],
    "0680": [
        "1.1 Rocks and minerals", "1.2 Energy resources",
        "2.1 Agriculture", "2.2 Water management",
        "3.1 Oceans and fisheries", "3.2 Natural hazards",
        "4.1 The atmosphere", "4.2 Human population",
    ],
}


def load_json(path: str, default):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def save_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_paper_num(source: str) -> int:
    """Return paper number (first digit of variant code) from filename."""
    m = re.search(r"_qp_(\d)", source, re.I)
    return int(m.group(1)) if m else 0


def get_year(source: str) -> str:
    m = re.search(r"_[msw](\d{2})_", source, re.I)
    return f"20{m.group(1)}" if m else "unknown"


def assign_priority(rank_pct: float) -> str:
    """rank_pct = 0 (lowest count) → 1 (highest count)."""
    if rank_pct >= 0.65:
        return "HIGH"
    if rank_pct >= 0.30:
        return "MEDIUM"
    return "LOW"


def _build_prefix_map(official: list[str]) -> dict[str, str]:
    """Pre-build a 4-char prefix → official topic map for O(1) lookup."""
    prefix_map: dict[str, str] = {}
    for topic in official:
        prefix_map[topic[:4].lower()] = topic
    return prefix_map


def process_subject(code: str, papers: list[dict]) -> dict[str, dict]:
    """
    Given all extracted papers for a subject, return a mapping of
    topic → { frequency, priority, paper2_count, paper4_count, years }.
    """
    official    = SYLLABUS.get(code, [])
    official_set = set(official)
    prefix_map  = _build_prefix_map(official)   # built once, O(1) lookups

    topic_counts: Counter = Counter()
    paper2_counts: Counter = Counter()
    paper4_counts: Counter = Counter()
    topic_years: dict[str, set] = defaultdict(set)

    for paper in papers:
        source = paper.get("source", "")
        pnum   = get_paper_num(source)
        year   = get_year(source)
        for q in paper.get("questions", []):
            topic = (q.get("topic") or "").strip()
            if not topic:
                continue
            # O(1) topic normalisation: exact match → prefix map → keep as-is
            if topic in official_set:
                matched = topic
            else:
                matched = prefix_map.get(topic[:4].lower()) or topic

            topic_counts[matched] += 1
            topic_years[matched].add(year)
            if pnum == 2:
                paper2_counts[matched] += 1
            elif pnum == 4:
                paper4_counts[matched] += 1

    if not topic_counts:
        return {}

    # Rank topics by count (0 = lowest, 1 = highest)
    sorted_topics = sorted(topic_counts.keys(), key=lambda t: topic_counts[t])
    n = len(sorted_topics)
    rank_map = {t: i / max(n - 1, 1) for i, t in enumerate(sorted_topics)}

    result = {}
    for topic in topic_counts.keys():
        count = topic_counts[topic]
        years = sorted(topic_years[topic])
        result[topic] = {
            "frequency":    round(count, 2),
            "priority":     assign_priority(rank_map[topic]),
            "paper2Count":  paper2_counts[topic],
            "paper4Count":  paper4_counts[topic],
            "yearsCovered": years,
            "totalYears":   len(years),
        }

    # Ensure every official topic is present (with zero if not seen)
    for t in official:
        if t not in result:
            result[t] = {
                "frequency": 0,
                "priority":  "LOW",
                "paper2Count": 0,
                "paper4Count": 0,
                "yearsCovered": [],
                "totalYears": 0,
            }

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", default=None, help="4-digit subject code (e.g. 0580). Default: all.")
    args = parser.parse_args()

    progress = load_json(PROGRESS_FILE, [])
    if not progress:
        print(f"No data in {PROGRESS_FILE}. Run theory_pipeline.py first.")
        return

    # Group papers by subject
    by_subject: dict[str, list] = defaultdict(list)
    for paper in progress:
        code = paper.get("source", "")[:4]
        by_subject[code].append(paper)

    # Load existing topic_analysis.json to preserve other subjects
    existing = load_json(ANALYSIS_FILE, {})

    subjects_to_process = [args.subject] if args.subject else list(by_subject.keys())

    for code in subjects_to_process:
        papers = by_subject.get(code, [])
        if not papers:
            print(f"No papers found for subject {code} — skipping")
            continue

        print(f"\nProcessing {code} — {len(papers)} papers")
        topic_data = process_subject(code, papers)

        # Count by paper type for summary (single pass)
        p2 = p4 = 0
        for p in papers:
            pn = get_paper_num(p.get("source", ""))
            if pn == 2:   p2 += 1
            elif pn == 4: p4 += 1
        total_q = sum(len(p.get("questions", [])) for p in papers)
        high   = sum(1 for v in topic_data.values() if v["priority"] == "HIGH")
        medium = sum(1 for v in topic_data.values() if v["priority"] == "MEDIUM")
        low    = sum(1 for v in topic_data.values() if v["priority"] == "LOW")

        print(f"  Papers: {len(papers)} total  ({p2} Paper 2, {p4} Paper 4)")
        print(f"  Questions: {total_q}")
        print(f"  Topics: {len(topic_data)} ({high} HIGH / {medium} MEDIUM / {low} LOW)")

        # Top 5 topics
        top5 = sorted(topic_data.items(), key=lambda x: x[1]["frequency"], reverse=True)[:5]
        print(f"  Top topics:")
        for t, d in top5:
            print(f"    [{d['frequency']:>5.0f}q] {t}  ({d['priority']})")

        # Merge into existing analysis (topic-level keys)
        for topic, data in topic_data.items():
            existing[topic] = {
                "frequency": data["frequency"],
                "priority":  data["priority"],
                "paper2Count": data["paper2Count"],
                "paper4Count": data["paper4Count"],
                "yearsCovered": data["yearsCovered"],
                "totalYears":  data["totalYears"],
                "subject":     code,
            }

    save_json(ANALYSIS_FILE, existing)
    print(f"\nSaved {len(existing)} topic entries to {ANALYSIS_FILE}")
    print("\nNext steps:")
    print("  • Smart Practice will now show updated priorities")
    print("  • Visit /subject/{code}/insights to see the Exam Insights page")


if __name__ == "__main__":
    main()
