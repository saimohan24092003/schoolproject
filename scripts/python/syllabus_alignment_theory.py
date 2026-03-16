"""
syllabus_alignment_theory.py

Reads theory_seeds_progress.json and compares the extracted questions against
the official syllabus topics for each subject.

Outputs:
  - A summary table to stdout
  - theory_alignment_report.json  (machine-readable)

Usage:
    python scripts/python/syllabus_alignment_theory.py [--subject 0653]
"""

import argparse
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

PROGRESS_FILE = "theory_seeds_progress.json"
REPORT_FILE   = "theory_alignment_report.json"

# Official syllabus topics per subject  ─────────────────────────────────────

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
    "0680": [
        "1.1 Rocks and minerals", "1.2 Energy resources",
        "2.1 Agriculture", "2.2 Water management",
        "3.1 Oceans and fisheries", "3.2 Natural hazards",
        "4.1 The atmosphere", "4.2 Human population",
    ],
    "0457": [
        "1.1 Identifying perspectives", "1.2 Research skills",
        "1.3 Analysing evidence", "1.4 Constructing arguments",
        "2.1 Poverty and inequality", "2.2 Migration and urbanisation",
        "2.3 Education for all", "2.4 Democracy and participation",
        "3.1 Fuel and energy", "3.2 Water, food and agriculture",
        "3.3 Biodiversity and conservation", "3.4 Climate change",
        "4.1 Globalisation", "4.2 Employment, work and business",
        "4.3 Technology and the future", "4.4 Law and criminality",
        "5.1 Choosing a topic", "5.2 Team project skills",
        "5.3 Writing the individual report", "5.4 Reflection and evaluation",
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
        "3.1 Vocabulary and word choice",
        "3.2 Sentence structure and variety",
        "3.3 Punctuation and paragraphing",
        "3.4 Spelling and grammar accuracy",
    ],
    "0510": [
        "1.1 Skimming and scanning", "1.2 Understanding vocabulary in context",
        "1.3 Note-making", "1.4 Summary writing",
        "1.5 Inferring meaning and attitude",
        "2.1 Formal letters and emails", "2.2 Informal letters and emails",
        "2.3 Articles and reports", "2.4 Directed writing",
        "2.5 Continuous writing — narrative and descriptive",
        "2.6 Continuous writing — argumentative and discursive",
        "3.1 Tenses and verb forms", "3.2 Sentence structure",
        "3.3 Punctuation and spelling", "3.4 Prepositions and collocations",
        "3.5 Vocabulary building",
        "4.1 Listening for specific information", "4.2 Understanding the main idea",
        "4.3 Inferring speaker attitude", "4.4 Extended listening",
        "5.1 Pronunciation and fluency", "5.2 Expressing opinions",
        "5.3 Describing and explaining", "5.4 Discussion and debate",
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
}


def subject_code(source: str) -> str:
    return source[:4]


def load_progress():
    if not os.path.exists(PROGRESS_FILE):
        return []
    with open(PROGRESS_FILE, encoding="utf-8") as f:
        return json.load(f)


def build_report(filter_subject: str | None):
    data = load_progress()
    if not data:
        print(f"No data in {PROGRESS_FILE}. Run theory_pipeline.py first.")
        return {}

    # Group questions by subject
    by_subject: dict[str, list[dict]] = defaultdict(list)
    for paper in data:
        code = subject_code(paper["source"])
        if filter_subject and code != filter_subject:
            continue
        by_subject[code].extend(paper["questions"])

    report = {}
    for code, questions in by_subject.items():
        official = SYLLABUS.get(code, [])
        official_set = set(official)

        topic_counts: Counter = Counter()
        unrecognised = set()
        for q in questions:
            t = (q.get("topic") or "Unknown").strip()
            topic_counts[t] += 1
            if t not in official_set:
                unrecognised.add(t)

        covered   = [t for t in official if topic_counts[t] > 0]
        missing   = [t for t in official if topic_counts[t] == 0]
        pct       = round(len(covered) / len(official) * 100, 1) if official else 0

        # Distribution across years
        years: Counter = Counter()
        for paper in data:
            if subject_code(paper["source"]) != code:
                continue
            m = re.search(r"_([msw])(\d{2})_", paper["source"])
            if m:
                years[f"20{m.group(2)}"] += len(paper["questions"])

        report[code] = {
            "subjectCode": code,
            "officialTopics": len(official),
            "coveredTopics": len(covered),
            "coveragePercent": pct,
            "totalQuestionsExtracted": len(questions),
            "yearDistribution": dict(sorted(years.items())),
            "mostFrequentTopics": topic_counts.most_common(10),
            "missingTopics": missing,
            "unrecognisedTopics": sorted(unrecognised),
        }

    return report


def print_report(report: dict):
    for code, r in report.items():
        print(f"\n{'='*60}")
        print(f"Subject {code}")
        print(f"{'='*60}")
        print(f"  Coverage : {r['coveredTopics']}/{r['officialTopics']} topics ({r['coveragePercent']}%)")
        print(f"  Questions: {r['totalQuestionsExtracted']} extracted")
        print(f"\n  Year distribution:")
        for yr, cnt in r["yearDistribution"].items():
            print(f"    {yr}: {cnt} questions")
        print(f"\n  Top 10 topics by frequency:")
        for topic, cnt in r["mostFrequentTopics"]:
            print(f"    [{cnt:>3}] {topic}")
        if r["missingTopics"]:
            print(f"\n  MISSING topics ({len(r['missingTopics'])}):")
            for t in r["missingTopics"]:
                print(f"    - {t}")
        if r["unrecognisedTopics"]:
            print(f"\n  Unrecognised (AI used non-syllabus labels):")
            for t in r["unrecognisedTopics"]:
                print(f"    ? {t}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", default=None)
    args = parser.parse_args()

    report = build_report(args.subject)
    if not report:
        return

    print_report(report)

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n📄 Report saved to {REPORT_FILE}")


if __name__ == "__main__":
    main()
