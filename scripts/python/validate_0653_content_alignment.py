import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
import re

ROOT_DIR = Path(__file__).resolve().parents[2]

ALIAS_MAP: Dict[str, str] = {
    "B3. Biological molecules": "B4. Biological molecules",
    "B4. Enzymes": "B5. Enzymes",
    "B5. Plant nutrition": "B6. Plant nutrition",
    "B6. Animal nutrition": "B7. Human nutrition",
    "B6. Transport in mammals": "B9. Transport in animals",
    "B7. Transport": "B9. Transport in animals",
    "B8. Gas exchange and respiration": "B11. Gas exchange in humans",
    "B9. Coordination and response": "B10. Diseases and immunity",
    "B10. Reproduction": "B14. Reproduction",
    "B11. Inheritance": "B14. Reproduction",
    "B12. Ecology": "B15. Organisms and their environment",
    "C1. Particulate nature of matter": "C1. States of matter",
    "C2. Experimental techniques": "C12. Experimental techniques and chemical analysis",
    "C3. Atoms, elements and compounds": "C2. Atoms, elements and compounds",
    "C4. Stoichiometry": "C3. Stoichiometry",
    "C5. Electricity and chemistry": "C4. Electrochemistry",
    "C6. Energy changes in reactions": "C5. Chemical energetics",
    "C7. Chemical reactions": "C6. Chemical reactions",
    "C8. Acids, bases and salts": "C7. Acids, bases and salts",
    "C9. The Periodic Table": "C8. The Periodic Table",
    "C10. Metals": "C9. Metals",
    "C11. Air and water": "C10. Chemistry of the environment",
    "C12. Organic chemistry": "C11. Organic chemistry",
    "P4. Electricity and magnetism": "P4. Electricity",
    "P5. Atomic physics": "P5. Space physics",
    "P6. Space physics": "P5. Space physics",
}

KEYWORD_RULES = [
    ("B8. Transport in plants", re.compile(r"\b(xylem|phloem|transpiration|translocation|root hair|stomata|guard cell|turgor)\b", re.I)),
    ("B3. Movement into and out of cells", re.compile(r"\b(diffusion|osmosis|active transport|partially permeable|concentration gradient|water potential)\b", re.I)),
    ("B10. Diseases and immunity", re.compile(r"\b(pathogen|disease|infection|immunity|immune|antibody|antigen|vaccin|transmission)\b", re.I)),
    ("B12. Respiration", re.compile(r"\b(respiration|aerobic|anaerobic|mitochondria|lactic acid|oxygen debt|energy release)\b", re.I)),
    ("B13. Drugs", re.compile(r"\b(drug|antibiotic|painkiller|nicotine|alcohol|caffeine|heroin|addiction|dependence|misuse)\b", re.I)),
    ("B14. Reproduction", re.compile(r"\b(reproduction|sexual|asexual|fertili[sz]ation|gamete|ovum|sperm|pollination|zygote|seed)\b", re.I)),
    ("B15. Organisms and their environment", re.compile(r"\b(ecosystem|habitat|food chain|food web|population|community|energy transfer|pyramid)\b", re.I)),
    ("B16. Human influences on ecosystems", re.compile(r"\b(deforestation|pollution|conservation|climate change|global warming|extinction|biodiversity)\b", re.I)),
]


def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_topic(topic: str) -> str:
    topic = " ".join(topic.strip().split())
    return ALIAS_MAP.get(topic, topic)


def infer_topic_from_question(question: str, topic: str) -> str:
    for mapped_topic, pattern in KEYWORD_RULES:
        if pattern.search(question or ""):
            return mapped_topic
    normalized = normalize_topic(topic)
    if is_0653_style_topic(normalized):
        return normalized
    return normalized


def is_0653_style_topic(topic: str) -> bool:
    prefix = topic[:2].upper()
    return prefix in {"B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "P1", "P2", "P3", "P4", "P5"} or topic.startswith("B") or topic.startswith("C") or topic.startswith("P")


def read_official_topics() -> List[str]:
    syllabus_path = ROOT_DIR / "data" / "0653_syllabus_2025_2027.json"
    syllabus = load_json(syllabus_path)
    if not syllabus:
        return []

    sections = syllabus.get("sections", {})
    topics = []
    for section_name in ("Biology", "Chemistry", "Physics"):
        topics.extend(sections.get(section_name, []))
    return topics


def collect_topics_from_bulk() -> Counter:
    counter: Counter = Counter()
    bulk_path = ROOT_DIR / "bulk_seeds_progress.json"
    bulk = load_json(bulk_path) or []
    for paper in bulk:
        for question in paper.get("questions", []):
            raw_topic = question.get("topic")
            options_text = " ".join(question.get("options", [])) if isinstance(question.get("options"), list) else ""
            question_text = f"{question.get('question', '')} {options_text}".strip()
            normalized = infer_topic_from_question(question_text, raw_topic or "")
            if is_0653_style_topic(normalized):
                counter[normalized] += 1
    return counter


def collect_topics_from_analysis() -> Counter:
    counter: Counter = Counter()
    analysis_path = ROOT_DIR / "topic_analysis.json"
    topic_analysis = load_json(analysis_path) or {}
    for topic, stats in topic_analysis.items():
        normalized = normalize_topic(topic)
        if not is_0653_style_topic(normalized):
            continue
        frequency = 0
        if isinstance(stats, dict):
            frequency = int(stats.get("frequency", 0))
        counter[normalized] += max(1, frequency)
    return counter


def build_report() -> Dict:
    official_topics = read_official_topics()
    official_set = set(official_topics)

    bulk_counter = collect_topics_from_bulk()
    analysis_counter = collect_topics_from_analysis()
    combined_counter = bulk_counter + analysis_counter

    covered_topics = sorted([topic for topic in combined_counter.keys() if topic in official_set])
    unknown_topics = sorted([topic for topic in combined_counter.keys() if topic not in official_set])
    missing_topics = sorted([topic for topic in official_topics if topic not in covered_topics])

    high_priority = sorted(
        [
            (topic, combined_counter[topic])
            for topic in covered_topics
        ],
        key=lambda item: item[1],
        reverse=True,
    )[:10]

    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "syllabusSource": "data/0653_syllabus_2025_2027.json",
        "officialTopicCount": len(official_topics),
        "coveredOfficialTopicCount": len(covered_topics),
        "coveragePercent": round((len(covered_topics) / len(official_topics)) * 100, 2)
        if official_topics
        else 0.0,
        "missingTopics": missing_topics,
        "outOfSyllabusTopicsFound": unknown_topics,
        "highPriorityTopicsByFrequency": [
            {"topic": topic, "score": score} for topic, score in high_priority
        ],
    }


def main():
    report = build_report()
    output = ROOT_DIR / "analysis_results_0653_syllabus_alignment.json"
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Alignment report written to {output}")
    print(
        f"Coverage: {report['coveredOfficialTopicCount']}/{report['officialTopicCount']} "
        f"({report['coveragePercent']}%)"
    )


if __name__ == "__main__":
    main()
