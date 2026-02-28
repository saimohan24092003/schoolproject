import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parents[2]

FILENAME_PATTERN = re.compile(
    r"^(?P<subject>\d{4})_(?P<session>[msw])(?P<yy>\d{2})_(?P<doc>qp|ms)_(?P<paper>[0-9A-Za-z\-]+)\.pdf$",
    re.IGNORECASE,
)

SUBJECT_CODE_TO_NAME: Dict[str, str] = {
    "0653": "Combined Science",
    "0680": "Environmental Management",
    "0580": "Mathematics",
    "0500": "First Language English",
    "0510": "English as a Second Language",
    "0607": "International Mathematics",
    "0457": "Global Perspectives",
}

SUBJECT_NAME_TO_CODE: Dict[str, str] = {
    "combined science": "0653",
    "environmental management": "0680",
    "mathematics": "0580",
    "core mathematics": "0580",
    "first language english": "0500",
    "english": "0500",
    "english as a second language": "0510",
    "global perspectives": "0457",
}

SESSION_TO_LABEL = {
    "m": "Feb/March",
    "s": "May/June",
    "w": "Oct/Nov",
}

SESSION_SORT_ORDER = {"m": 0, "s": 1, "w": 2}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a paper catalog with paper-wise segregation, QP/MS pairing, and syllabus flags."
    )
    parser.add_argument(
        "--output",
        default="data/paper_catalog.json",
        help="Output JSON path relative to repo root.",
    )
    parser.add_argument(
        "--policy",
        default="data/syllabus_policy.json",
        help="Syllabus policy JSON path relative to repo root.",
    )
    parser.add_argument(
        "--max-year",
        type=int,
        default=None,
        help="Optional max year filter for displayed papers (for example, 2023).",
    )
    return parser.parse_args()


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def build_url_lookup() -> Dict[str, str]:
    lookup: Dict[str, str] = {}
    for links_file in ("dynamic_links.json", "em_dynamic_links.json"):
        data = load_json(ROOT_DIR / links_file, [])
        if not isinstance(data, list):
            continue
        for raw_url in data:
            if not isinstance(raw_url, str):
                continue
            filename = raw_url.split("/")[-1]
            if filename and filename not in lookup:
                lookup[filename] = raw_url if raw_url.startswith("http") else f"https:{raw_url}"
    return lookup


def two_digit_year_to_full(yy: str) -> int:
    value = int(yy)
    return 2000 + value if value <= 79 else 1900 + value


def parse_paper_token(token: str) -> Tuple[Optional[int], Optional[int]]:
    digits = "".join(ch for ch in token if ch.isdigit())
    if not digits:
        return None, None
    paper_number = int(digits[0])
    variant_number = int(digits[1]) if len(digits) >= 2 else None
    return paper_number, variant_number


def normalize_doc_type(raw: str) -> Optional[str]:
    lowered = raw.lower()
    if lowered in ("question paper", "qp"):
        return "qp"
    if lowered in ("marking scheme", "mark scheme", "ms"):
        return "ms"
    return None


def parse_filename_entry(file_path: Path, url_lookup: Dict[str, str]) -> Optional[Dict[str, Any]]:
    match = FILENAME_PATTERN.match(file_path.name)
    if not match:
        return None

    subject_code = match.group("subject")
    session_code = match.group("session").lower()
    year = two_digit_year_to_full(match.group("yy"))
    doc_type = match.group("doc").lower()
    paper_code = match.group("paper")
    paper_number, variant_number = parse_paper_token(paper_code)

    return {
        "subjectCode": subject_code,
        "subjectName": SUBJECT_CODE_TO_NAME.get(subject_code, "Unknown Subject"),
        "level": "O-Level",
        "year": year,
        "sessionCode": session_code,
        "seasonLabel": SESSION_TO_LABEL.get(session_code, "Unknown Session"),
        "documentType": doc_type,
        "paperCode": paper_code,
        "paperNumber": paper_number,
        "variantNumber": variant_number,
        "filename": file_path.name,
        "localPath": file_path.relative_to(ROOT_DIR).as_posix(),
        "sourceUrl": url_lookup.get(file_path.name),
    }


def parse_legacy_entry(file_path: Path, url_lookup: Dict[str, str]) -> Optional[Dict[str, Any]]:
    parts = [segment.strip() for segment in file_path.parts]
    try:
        root_index = parts.index("School project - Question Paper & Marking scheme")
    except ValueError:
        return None

    if len(parts) <= root_index + 6:
        return None

    doc_folder = parts[root_index + 1]
    level_folder = parts[root_index + 2]
    subject_folder = parts[root_index + 3]
    trailing_parts = parts[root_index + 4 :]

    doc_type = normalize_doc_type(doc_folder)
    if doc_type is None:
        return None

    year: Optional[int] = None
    season_name = "Unknown Session"
    for index, value in enumerate(trailing_parts):
        if re.fullmatch(r"\d{4}", value):
            year = int(value)
            if index + 1 < len(trailing_parts):
                season_name = trailing_parts[index + 1]
            break

    if year is None:
        return None

    stem = file_path.stem
    paper_number, variant_number = parse_paper_token(stem)
    if paper_number is None:
        return None

    season_normalized = season_name.lower().replace(" ", "")
    if "may" in season_normalized or "jun" in season_normalized:
        session_code = "s"
    elif "oct" in season_normalized or "nov" in season_normalized:
        session_code = "w"
    elif "feb" in season_normalized or "mar" in season_normalized:
        session_code = "m"
    else:
        session_code = "s"

    subject_key = subject_folder.lower().strip()
    subject_code = SUBJECT_NAME_TO_CODE.get(subject_key)
    if subject_code is None:
        subject_code = "unknown"

    level = "O-Level" if "o level" in level_folder.lower() else "A-Level"

    return {
        "subjectCode": subject_code,
        "subjectName": SUBJECT_CODE_TO_NAME.get(subject_code, subject_folder),
        "level": level,
        "year": year,
        "sessionCode": session_code,
        "seasonLabel": SESSION_TO_LABEL.get(session_code, season_name),
        "documentType": doc_type,
        "paperCode": stem,
        "paperNumber": paper_number,
        "variantNumber": variant_number,
        "filename": file_path.name,
        "localPath": file_path.relative_to(ROOT_DIR).as_posix(),
        "sourceUrl": url_lookup.get(file_path.name),
    }


def apply_syllabus_status(entry: Dict[str, Any], policy: Dict[str, Any]) -> None:
    subjects = policy.get("subjects", {})
    subject_policy = subjects.get(entry["subjectCode"])

    if not subject_policy:
        entry["syllabusStatus"] = "subject_unconfigured"
        entry["syllabusReason"] = "No policy exists for this subject code."
        entry["syllabusAligned"] = False
        return

    min_year = subject_policy.get("approvedYearMin")
    max_year = subject_policy.get("approvedYearMax")
    approved_sessions = set(subject_policy.get("approvedSessions", []))

    if isinstance(min_year, int) and entry["year"] < min_year:
        entry["syllabusStatus"] = "out_of_range"
        entry["syllabusReason"] = f"Year is before approved range ({min_year}-{max_year})."
        entry["syllabusAligned"] = False
        return

    if isinstance(max_year, int) and entry["year"] > max_year:
        entry["syllabusStatus"] = "out_of_range"
        entry["syllabusReason"] = f"Year is after approved range ({min_year}-{max_year})."
        entry["syllabusAligned"] = False
        return

    if approved_sessions and entry["sessionCode"] not in approved_sessions:
        entry["syllabusStatus"] = "session_not_approved"
        entry["syllabusReason"] = f"Session '{entry['sessionCode']}' is not approved in policy."
        entry["syllabusAligned"] = False
        return

    entry["syllabusStatus"] = "approved"
    entry["syllabusReason"] = "Within approved policy range."
    entry["syllabusAligned"] = True


def main() -> None:
    args = parse_args()

    output_path = ROOT_DIR / args.output
    policy_path = ROOT_DIR / args.policy
    policy_data = load_json(policy_path, {"subjects": {}})
    url_lookup = build_url_lookup()

    entries: List[Dict[str, Any]] = []
    seen_keys = set()

    extracted_dir = ROOT_DIR / "extracted_data"
    if extracted_dir.exists():
        for file_path in sorted(extracted_dir.glob("*.pdf")):
            parsed = parse_filename_entry(file_path, url_lookup)
            if not parsed:
                continue
            key = (
                parsed["subjectCode"],
                parsed["year"],
                parsed["sessionCode"],
                parsed["documentType"],
                parsed["paperCode"],
                parsed["filename"],
            )
            if key in seen_keys:
                continue
            seen_keys.add(key)
            entries.append(parsed)

    legacy_root = ROOT_DIR / "School project - Question Paper & Marking scheme"
    if legacy_root.exists():
        for file_path in sorted(legacy_root.rglob("*.pdf")):
            parsed = parse_legacy_entry(file_path, url_lookup)
            if not parsed:
                continue
            key = (
                parsed["subjectCode"],
                parsed["year"],
                parsed["sessionCode"],
                parsed["documentType"],
                parsed["paperCode"],
                parsed["filename"],
            )
            if key in seen_keys:
                continue
            seen_keys.add(key)
            entries.append(parsed)

    if args.max_year is not None:
        entries = [entry for entry in entries if entry["year"] <= args.max_year]

    for entry in entries:
        apply_syllabus_status(entry, policy_data)

    series_map: Dict[Tuple[Any, ...], Dict[str, Any]] = defaultdict(
        lambda: {"qp": [], "ms": [], "entry_ids": []}
    )

    for index, entry in enumerate(entries):
        entry["id"] = index + 1
        series_key = (
            entry["subjectCode"],
            entry["year"],
            entry["sessionCode"],
            entry["paperNumber"],
            entry["paperCode"],
        )
        series_map[series_key][entry["documentType"]].append(entry)
        series_map[series_key]["entry_ids"].append(entry["id"])

    series_items: List[Dict[str, Any]] = []

    for key, bucket in series_map.items():
        subject_code, year, session_code, paper_number, paper_code = key
        qps = sorted(bucket["qp"], key=lambda item: item["filename"])
        mss = sorted(bucket["ms"], key=lambda item: item["filename"])

        qp_entry = qps[0] if qps else None
        ms_entry = mss[0] if mss else None
        is_complete = bool(qp_entry and ms_entry)

        if qp_entry is not None:
            qp_entry["hasMatchingMarkScheme"] = is_complete
            qp_entry["markSchemeFilename"] = ms_entry["filename"] if ms_entry else None
            qp_entry["markSchemeUrl"] = ms_entry.get("sourceUrl") if ms_entry else None
            qp_entry["pairStatus"] = "paired" if is_complete else "missing_ms"

        for ms in mss:
            ms["hasMatchingQuestionPaper"] = bool(qp_entry)
            ms["questionPaperFilename"] = qp_entry["filename"] if qp_entry else None
            ms["questionPaperUrl"] = qp_entry.get("sourceUrl") if qp_entry else None
            ms["pairStatus"] = "paired" if is_complete else "missing_qp"

        representative = qp_entry or ms_entry
        if representative is None:
            continue

        series_items.append(
            {
                "subjectCode": subject_code,
                "subjectName": representative["subjectName"],
                "level": representative["level"],
                "year": year,
                "sessionCode": session_code,
                "seasonLabel": representative["seasonLabel"],
                "paperNumber": paper_number,
                "paperCode": paper_code,
                "variantNumber": representative["variantNumber"],
                "isCompletePair": is_complete,
                "syllabusAligned": representative["syllabusAligned"],
                "syllabusStatus": representative["syllabusStatus"],
                "questionPaper": {
                    "filename": qp_entry["filename"],
                    "localPath": qp_entry["localPath"],
                    "sourceUrl": qp_entry.get("sourceUrl"),
                }
                if qp_entry
                else None,
                "markScheme": {
                    "filename": ms_entry["filename"],
                    "localPath": ms_entry["localPath"],
                    "sourceUrl": ms_entry.get("sourceUrl"),
                }
                if ms_entry
                else None,
            }
        )

    entries.sort(
        key=lambda item: (
            item["subjectCode"],
            -item["year"],
            SESSION_SORT_ORDER.get(item["sessionCode"], 99),
            item["paperNumber"] if item["paperNumber"] is not None else 99,
            item["paperCode"],
            item["documentType"],
        )
    )

    series_items.sort(
        key=lambda item: (
            item["subjectCode"],
            item["paperNumber"] if item["paperNumber"] is not None else 99,
            -item["year"],
            SESSION_SORT_ORDER.get(item["sessionCode"], 99),
            item["paperCode"],
        )
    )

    totals = {
        "documents": len(entries),
        "questionPapers": sum(1 for item in entries if item["documentType"] == "qp"),
        "markSchemes": sum(1 for item in entries if item["documentType"] == "ms"),
        "subjects": len({item["subjectCode"] for item in entries}),
        "series": len(series_items),
        "completePairs": sum(1 for item in series_items if item["isCompletePair"]),
        "syllabusAlignedSeries": sum(1 for item in series_items if item["syllabusAligned"]),
    }

    payload = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "policyVersion": policy_data.get("policyVersion", "unknown"),
        "maxYearFilter": args.max_year,
        "totals": totals,
        "series": series_items,
        "entries": entries,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Catalog written to {output_path}")
    print(
        f"Documents: {totals['documents']} | Series: {totals['series']} | "
        f"Complete pairs: {totals['completePairs']} | Syllabus aligned: {totals['syllabusAlignedSeries']}"
    )


if __name__ == "__main__":
    main()
