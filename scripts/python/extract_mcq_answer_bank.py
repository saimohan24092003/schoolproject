import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import pdfplumber

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_PASSWORD = "nokia2"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract deterministic MCQ answer keys from mark schemes using the paper catalog."
    )
    parser.add_argument(
        "--catalog",
        default="data/paper_catalog.json",
        help="Catalog JSON path relative to repo root.",
    )
    parser.add_argument(
        "--output",
        default="data/mcq_answer_bank.json",
        help="Output JSON path relative to repo root.",
    )
    parser.add_argument(
        "--subject",
        default=None,
        help="Optional subject code filter (for example: 0653).",
    )
    parser.add_argument(
        "--password",
        default=DEFAULT_PASSWORD,
        help="PDF password for protected papers.",
    )
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_pdf_text(pdf_path: Path, password: str) -> str:
    text_chunks = []

    def _collect_text(pdf: pdfplumber.PDF) -> None:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_chunks.append(text)

    try:
        with pdfplumber.open(str(pdf_path), password=password) as pdf:
            _collect_text(pdf)
    except Exception:
        with pdfplumber.open(str(pdf_path)) as pdf:
            _collect_text(pdf)

    return "\n".join(text_chunks)


def extract_answer_key(ms_text: str) -> Dict[str, str]:
    # Handles common table/grid forms like:
    # "1 A 2 C 3 B ..."
    # and line forms like "12 D".
    pattern = re.compile(r"(?<!\d)(\d{1,2})\s*([A-D])(?![A-Z])")
    matches = pattern.findall(ms_text.upper())

    answer_key: Dict[str, str] = {}
    for number, option in matches:
        value = int(number)
        if 1 <= value <= 60 and number not in answer_key:
            answer_key[number] = option
    return answer_key


def is_mcq_component(series: Dict[str, Any]) -> bool:
    paper_number = series.get("paperNumber")
    if paper_number is None:
        return False
    return paper_number in {1, 2}


def main() -> None:
    args = parse_args()
    catalog_path = ROOT_DIR / args.catalog
    output_path = ROOT_DIR / args.output

    if not catalog_path.exists():
        raise FileNotFoundError(f"Catalog not found: {catalog_path}")

    catalog = read_json(catalog_path)
    series_items = catalog.get("series", [])

    records = []
    processed = 0
    skipped = 0

    for series in series_items:
        if args.subject and series.get("subjectCode") != args.subject:
            continue
        if not series.get("isCompletePair"):
            continue
        if not series.get("syllabusAligned"):
            continue
        if not is_mcq_component(series):
            continue

        ms = series.get("markScheme")
        qp = series.get("questionPaper")
        if not ms or not qp:
            skipped += 1
            continue

        ms_path = ROOT_DIR / ms["localPath"]
        qp_path = ROOT_DIR / qp["localPath"]
        if not ms_path.exists() or not qp_path.exists():
            skipped += 1
            continue

        try:
            ms_text = extract_pdf_text(ms_path, args.password)
            answers = extract_answer_key(ms_text)
        except Exception:
            skipped += 1
            continue

        if len(answers) < 10:
            skipped += 1
            continue

        record = {
            "subjectCode": series["subjectCode"],
            "subjectName": series["subjectName"],
            "year": series["year"],
            "sessionCode": series["sessionCode"],
            "seasonLabel": series["seasonLabel"],
            "paperNumber": series["paperNumber"],
            "paperCode": series["paperCode"],
            "variantNumber": series["variantNumber"],
            "questionPaper": qp,
            "markScheme": ms,
            "answerCount": len(answers),
            "answerKey": dict(sorted(answers.items(), key=lambda item: int(item[0]))),
        }
        records.append(record)
        processed += 1

    records.sort(
        key=lambda item: (
            item["subjectCode"],
            item["paperNumber"],
            -item["year"],
            item["sessionCode"],
            item["paperCode"],
        )
    )

    payload = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "catalogSource": str(catalog_path.relative_to(ROOT_DIR)),
        "totalRecords": len(records),
        "processedSeries": processed,
        "skippedSeries": skipped,
        "records": records,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"MCQ answer bank written to {output_path}")
    print(f"Records: {len(records)} | Processed: {processed} | Skipped: {skipped}")


if __name__ == "__main__":
    main()
