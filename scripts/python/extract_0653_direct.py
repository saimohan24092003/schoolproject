"""
extract_0653_direct.py  —  NO AI, pure pdfplumber + regex

Extracts structured theory questions from Cambridge IGCSE Combined Science (0653)
Papers 4 and 6 (Theory Extended / Alt to Practical). No Gemini quota needed.

QP format:
    1 (a) context paragraph text...
          (i) question text [2]
          (ii) question text [1]
    (b) next sub-part text [3]
    2 Next major question context...
    (a) text [1]

MS format (table):
    Question  Answer  Marks
    1(a)(i)   answer text ;   2
              continuation ;
    1(a)(ii)  next answer ;   1

Saves to: theory_seeds_progress.json
Usage:
    python scripts/python/extract_0653_direct.py
    python scripts/python/extract_0653_direct.py --paper 4
    python scripts/python/extract_0653_direct.py --year-end 23 --limit 10
"""

import argparse, os, re, sys, json, warnings
warnings.filterwarnings("ignore")
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EXTRACTED_DIR = "extracted_data"
DIAGRAMS_DIR  = "public/diagrams"
PROGRESS_FILE = "theory_seeds_progress.json"
PDF_PASSWORD  = "nokia2"
THEORY_PAPERS = {3, 4, 6}   # Papers 1 & 2 are MCQ for 0653

os.makedirs(DIAGRAMS_DIR, exist_ok=True)


# ── Topic classifier ───────────────────────────────────────────────────────────
# Topic names MUST match lesson titles exactly as stored in the DB.

TOPIC_RULES = [
    # Biology — matches DB lesson titles
    ("B4. Enzymes",
     re.compile(r"\benzyme|active site|substrate|denatur|inhibit|lock.and.key\b", re.I)),
    ("B5. Plant nutrition",
     re.compile(r"\bphotosynthes|chlorophyll|light intensity|carbon dioxide.*plant|stomata|mesophyll|leaf|chloroplast.*photo\b", re.I)),
    ("B6. Animal nutrition",
     re.compile(r"\bdigest|alimentary|stomach|intestine|liver|bile|villi|absorption|nutrient|diet|enzyme.*food|amylase|protease|lipase\b", re.I)),
    ("B7. Transport",
     re.compile(r"\bxylem|phloem|transpiration|translocation|root hair|heart|blood vessel|artery|vein|capillary|haemoglobin|red blood|plasma|circulation\b", re.I)),
    ("B8. Gas exchange and respiration",
     re.compile(r"\blung|alveol|bronch|trachea|gas exchange|intercostal|diaphragm|aerobic|anaerobic|ATP|fermentation|lactic acid|respiration\b", re.I)),
    ("B9. Coordination and response",
     re.compile(r"\bnervous|neuron|synapse|hormone|insulin|glucagon|reflex|receptor|effector|tropism|auxin\b", re.I)),
    ("B10. Reproduction",
     re.compile(r"\bfertilis|gamete|ovum|sperm|mitosis|meiosis|sexual|asexual|pollination|germination\b", re.I)),
    ("B11. Inheritance",
     re.compile(r"\bchromosom|DNA|gene|allele|dominant|recessive|inherited|genotype|phenotype|punnett|mutation\b", re.I)),
    ("B12. Ecology",
     re.compile(r"\bfood chain|food web|predator|prey|population|habitat|biomass|pyramid|ecosystem|pollut|deforestation|greenhouse|global warm|biodiversity\b", re.I)),
    ("B3. Biological molecules",
     re.compile(r"\bglucose|starch|protein|lipid|amino acid|fatty acid|glycerol|carbohydrate|reducing sugar|Benedict|biuret\b", re.I)),
    ("B2. Cells",
     re.compile(r"\bcell wall|nucleus|cytoplasm|chloroplast|mitochondri|vacuole|cell membrane|organelle|prokaryot|eukaryot\b", re.I)),
    ("B2. Cells",   # osmosis/diffusion also taught in cell biology
     re.compile(r"\bosmosis|diffusion|active transport|semi-permeable|concentration gradient\b", re.I)),
    ("B1. Characteristics of living organisms",
     re.compile(r"\bcharacteristic.*living|movement.*organism|nutrition.*organism|excretion.*organism|sensitivity\b", re.I)),
    # Chemistry — matches DB lesson titles
    ("C12. Organic chemistry",
     re.compile(r"\bhydrocarbon|alkane|alkene|methane|ethane|propane|ethene|propene|cracking|polymeris|ester|organic chemistry\b", re.I)),
    ("C8. Acids, bases and salts",
     re.compile(r"\bacid|alkali|base|salt|neutralis|pH|indicator|titration|hydrochloric|sulphuric|nitric acid\b", re.I)),
    ("C5. Electricity and chemistry",
     re.compile(r"\belectrolysis|electrode|anode|cathode|electrolyte|oxidation|reduction|redox|half.equation\b", re.I)),
    ("C6. Energy changes in reactions",
     re.compile(r"\bexothermic|endothermic|activation energy|enthalpy|bond energy|energy.*reaction\b", re.I)),
    ("C7. Chemical reactions",
     re.compile(r"\brate of reaction|catalyst|concentration.*reaction|collision theory|reversible|equilibrium\b", re.I)),
    ("C4. Stoichiometry",
     re.compile(r"\bmole|relative formula mass|\bMr\b|empirical formula|balanced.*equation|molar\b", re.I)),
    ("C9. The Periodic Table",
     re.compile(r"\bperiodic table|group \d|period \d|noble gas|halogen|alkali metal|transition metal\b", re.I)),
    ("C10. Metals",
     re.compile(r"\breactivity series|corrosion|rust|alloy|ore|blast furnace|extraction.*metal\b", re.I)),
    ("C3. Atoms, elements and compounds",
     re.compile(r"\batom|element|compound|proton|neutron|electron|atomic number|mass number|isotope|shell|bonding|ionic|covalent\b", re.I)),
    ("C1. Particulate nature of matter",
     re.compile(r"\bsolid|liquid|gas|state.*matter|evaporation|condensation|kinetic theory|particle.*model|diffuse.*gas\b", re.I)),
    ("C11. Air and water",
     re.compile(r"\bwater treatment|potable|hard water|carbon cycle|nitrogen cycle|atmosphere|air.*pollution|rusting\b", re.I)),
    ("C2. Experimental techniques",
     re.compile(r"\bchromatography|distillation|filtration|crystallis|flame test|test for gas|locating agent|Rf value\b", re.I)),
    # Physics — matches DB lesson titles
    ("P1. Motion, forces and energy",
     re.compile(r"\bforce|velocity|acceleration|momentum|gravity|weight|newton|work done|kinetic energy|potential energy|pressure\b", re.I)),
    ("P2. Thermal physics",
     re.compile(r"\btemperature|thermal|specific heat|conduction|convection|radiation|expansion.*thermal|latent heat\b", re.I)),
    ("P3. Waves",
     re.compile(r"\bwave|frequency|wavelength|amplitude|sound|refraction|diffraction|electromagnetic|transverse|longitudinal|reflection\b", re.I)),
    ("P4. Electricity and magnetism",
     re.compile(r"\bcurrent|voltage|resistance|circuit|ohm|power.*electric|charge|potential difference|parallel|series|magnet|electromagnet\b", re.I)),
    ("P5. Atomic physics",
     re.compile(r"\bradioactiv|nuclear|alpha|beta|gamma|isotope.*physics|half.life|proton number|atomic.*decay\b", re.I)),
    ("P6. Space physics",
     re.compile(r"\bstar|planet|galaxy|universe|orbit|solar system|red.shift|big bang|comet|nebula\b", re.I)),
]

DEFAULT_TOPIC = "B4. Enzymes"


def classify(text: str) -> str:
    for topic, pat in TOPIC_RULES:
        if pat.search(text):
            return topic
    return DEFAULT_TOPIC


# ── PDF helpers ────────────────────────────────────────────────────────────────

def pdf_pages(path: str) -> list[str]:
    pages = []
    def _read(pdf):
        for p in pdf.pages:
            t = p.extract_text()
            if t:
                pages.append(t)
    try:
        with pdfplumber.open(path) as pdf:
            _read(pdf)
    except Exception:
        try:
            with pdfplumber.open(path, password=PDF_PASSWORD) as pdf:
                _read(pdf)
        except Exception as e:
            print(f"  FAILED {path}: {e}")
    return pages


def pdf_images(path: str, qp_name: str) -> dict[int, list[str]]:
    """Extract images from QP, save to DIAGRAMS_DIR, return {page: [paths]}."""
    image_map: dict[int, list[str]] = {}

    def _read(pdf):
        for i, page in enumerate(pdf.pages, start=1):
            for idx, img in enumerate(page.images):
                try:
                    x0, top, x1, bot = img["x0"], img["top"], img["x1"], img["bottom"]
                    # Only save images that are large enough to be real diagrams
                    if x1 > x0 and bot > top and (x1 - x0) > 80 and (bot - top) > 60:
                        fname = f"{qp_name}_{i}_{idx}.png"
                        fpath = os.path.join(DIAGRAMS_DIR, fname)
                        if not os.path.exists(fpath):
                            page.within_bbox((x0, top, x1, bot)).to_image(resolution=150).save(fpath)
                        image_map.setdefault(i, []).append(f"/diagrams/{fname}")
                except Exception:
                    pass

    try:
        with pdfplumber.open(path) as pdf:
            _read(pdf)
    except Exception:
        try:
            with pdfplumber.open(path, password=PDF_PASSWORD) as pdf:
                _read(pdf)
        except Exception:
            pass
    return image_map


# ── QP Parser ─────────────────────────────────────────────────────────────────

SKIP_LINE = re.compile(
    r"^(www\.|Cambridge|UCLES|©|IB\d|DC\s|0653/|\[Turn|BLANK PAGE|"
    r"READ THESE|Write your|Do not use|Answer all|Electronic calc|"
    r"You may lose|The number of|At the end|No Additional|Candidates answer)",
    re.I,
)
DOT_LINE    = re.compile(r"^\.{4,}|^\s*\.\s*\.\s*\.\s*\.")
MARKS_PAT   = re.compile(r"\[(\d+)\]")
TOTAL_PAT   = re.compile(r"^\[?Total", re.I)
FIG_PAT     = re.compile(r"^(Fig\.|Table\s+\d|Diagram\s+\d)", re.I)

# "1 (a) text..."  — major Q starts with digit + space + letter-sub
MAJOR_Q_AB  = re.compile(r"^(\d+)\s+\(([a-z])\)\s*(.*)")
# "2 Catalytic cracking..." — major Q with context, no letter
MAJOR_Q_TXT = re.compile(r"^(\d+)\s+([A-Z][a-z].+)")

# "(a) text" — letter sub-part
SUB_LETTER  = re.compile(r"^\(([a-z])\)\s+(.*)")
# "(i) text" — roman sub-part
SUB_ROMAN   = re.compile(r"^\(([ivx]+)\)\s+(.*)", re.I)

# Bare mark: standalone [N] line
BARE_MARK   = re.compile(r"^\[(\d+)\]$")


def parse_qp(pages: list[str]) -> list[dict]:
    """Parse QP pages → list of question dicts."""
    questions: list[dict] = []

    major_num    = None   # "1", "2", ...
    major_letter = None   # "a", "b", ...
    context      = []     # running context paragraph lines
    cur_ref      = None   # e.g. "1(a)(i)"
    cur_text     = []     # lines for current sub-question
    cur_marks    = 0

    def flush():
        nonlocal cur_ref, cur_text, cur_marks
        if cur_ref and cur_text:
            body = " ".join(cur_text).strip()
            body = re.sub(r"\s{2,}", " ", body)
            body = re.sub(r"\s*\[\d+\]\s*$", "", body).strip()
            ctx  = " ".join(context).strip()
            ctx  = re.sub(r"\s{2,}", " ", ctx)
            full = (f"{ctx}\n\n{body}" if ctx else body).strip()
            marks = cur_marks if cur_marks > 0 else 1
            questions.append({
                "number":    cur_ref,
                "question":  full,
                "totalMarks": marks,
                "imageSrc":  None,
            })
        cur_ref   = None
        cur_text  = []
        cur_marks = 0

    for page_text in pages:
        for line in page_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if SKIP_LINE.match(line):
                continue
            if re.match(r"^\d+$", line):          # bare page number
                continue
            if "BLANK PAGE" in line.upper():
                continue
            if TOTAL_PAT.match(line):
                continue
            if DOT_LINE.match(line):               # answer blank lines
                continue
            if re.match(r"^[0-9\s\.\,]+$", line): # pure numbers/dots row
                continue

            # ── Major question with letter: "1 (a) text..."
            m = MAJOR_Q_AB.match(line)
            if m:
                flush()
                major_num    = m.group(1)
                major_letter = m.group(2)
                context      = []
                rest = m.group(3).strip()
                mm = MARKS_PAT.search(rest)
                cur_marks = int(mm.group(1)) if mm else 0
                cur_ref   = f"{major_num}({major_letter})"
                cur_text  = [re.sub(r"\s*\[\d+\]", "", rest).strip()] if rest else []
                continue

            # ── Major question with body text: "2 Catalytic cracking..."
            m = MAJOR_Q_TXT.match(line)
            if m:
                flush()
                major_num    = m.group(1)
                major_letter = None
                context      = [m.group(2).strip()]
                cur_ref      = None
                cur_text     = []
                cur_marks    = 0
                continue

            # ── Sub-parts: roman before letter when major_letter is set
            # (prevents "(i)" being misread as letter sub-part 'i')
            if major_num and major_letter:
                # Roman numeral sub-part: "(i) text", "(ii) text", ...
                m = SUB_ROMAN.match(line)
                if m:
                    flush()
                    roman = m.group(1).lower()
                    rest  = m.group(2).strip()
                    mm = MARKS_PAT.search(rest)
                    cur_marks = int(mm.group(1)) if mm else 0
                    cur_ref   = f"{major_num}({major_letter})({roman})"
                    cur_text  = [re.sub(r"\s*\[\d+\]", "", rest).strip()] if rest else []
                    continue
                # Letter sub-part: "(b) text" — new letter, resets major_letter
                m = SUB_LETTER.match(line)
                if m:
                    flush()
                    major_letter = m.group(1)
                    rest = m.group(2).strip()
                    mm = MARKS_PAT.search(rest)
                    cur_marks = int(mm.group(1)) if mm else 0
                    cur_ref   = f"{major_num}({major_letter})"
                    cur_text  = [re.sub(r"\s*\[\d+\]", "", rest).strip()] if rest else []
                    continue
            elif major_num:
                # No major_letter yet — only letter sub-parts expected
                m = SUB_LETTER.match(line)
                if m:
                    flush()
                    major_letter = m.group(1)
                    rest = m.group(2).strip()
                    mm = MARKS_PAT.search(rest)
                    cur_marks = int(mm.group(1)) if mm else 0
                    cur_ref   = f"{major_num}({major_letter})"
                    cur_text  = [re.sub(r"\s*\[\d+\]", "", rest).strip()] if rest else []
                    continue

            # ── Standalone mark: [2]
            m = BARE_MARK.match(line)
            if m:
                if cur_ref and cur_marks == 0:
                    cur_marks = int(m.group(1))
                continue

            # ── Figure/table caption — skip
            if FIG_PAT.match(line):
                continue

            # ── Regular text
            if cur_ref:
                cur_text.append(line)
            elif major_num:
                # Still in context paragraph
                context.append(line)

    flush()
    return questions


# ── MS Parser ─────────────────────────────────────────────────────────────────

# Matches: "1(a)(i)  answer text ... ;  2"
MS_REF_PAT = re.compile(
    r"^(\d+\([a-z]\)(?:\([a-z]\))?(?:\([ivx]+\))?)\s+(.+)",
    re.I,
)
MARK_TRAIL = re.compile(r"\s+\d+\s*$")


def parse_ms(pages: list[str]) -> dict[str, str]:
    """Parse MS pages → {normalised_ref: answer_text}."""
    answers: dict[str, str] = {}
    cur_ref      = None
    answer_lines: list[str] = []

    def flush():
        if cur_ref and answer_lines:
            answers[cur_ref] = "\n".join(answer_lines).strip()

    skip_headers = re.compile(
        r"^(Question\s+Answer|GENERIC|PUBLISHED|These general|Cambridge|UCLES|www\.|Page \d|©|0653/)",
        re.I,
    )

    for page_text in pages:
        for line in page_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if skip_headers.match(line):
                continue

            m = MS_REF_PAT.match(line)
            if m:
                flush()
                cur_ref = re.sub(r"\s+", "", m.group(1).lower())
                body    = m.group(2).strip()
                # Strip trailing mark count (integer at end of line)
                body = MARK_TRAIL.sub("", body).strip()
                # Strip trailing semicolons
                body = body.rstrip(";").strip()
                answer_lines = [body] if body else []
            elif cur_ref:
                clean = MARK_TRAIL.sub("", line).strip().rstrip(";").strip()
                if clean:
                    answer_lines.append(clean)

    flush()
    return answers


def norm_ref(s: str) -> str:
    return re.sub(r"\s+", "", s).lower()


def attach_ms(questions: list[dict], ms: dict[str, str]) -> list[dict]:
    for q in questions:
        key = norm_ref(q["number"])
        q["markingSchemeAnswer"] = ms.get(key, "See mark scheme.")
    return questions


# ── Image linking ──────────────────────────────────────────────────────────────

FIG_REF_IN_Q = re.compile(r"\b(Fig\.|Figure|Table|Diagram)\s*[\d\.]+", re.I)


def assign_images(questions: list[dict], img_map: dict[int, list[str]]):
    """Best-effort: assign first image on QP page to first question that refs a Fig."""
    # Flatten available images with page info
    all_images = [(pg, path) for pg, paths in sorted(img_map.items()) for path in paths]
    img_idx = 0
    for q in questions:
        if img_idx >= len(all_images):
            break
        if FIG_REF_IN_Q.search(q["question"]) and q["imageSrc"] is None:
            q["imageSrc"] = all_images[img_idx][1]
            img_idx += 1


# ── Progress I/O ──────────────────────────────────────────────────────────────

def load() -> list:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            try:
                return json.load(f)
            except Exception:
                return []
    return []


def save(data: list):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Extract 0653 theory questions without AI."
    )
    parser.add_argument("--paper", type=int, default=None, help="4 or 6 (default: both)")
    parser.add_argument("--limit", type=int, default=0, help="Max papers to process")
    parser.add_argument("--year-end", type=int, default=None, help="Max 2-digit year")
    args = parser.parse_args()

    all_data  = load()
    processed = {d["source"] for d in all_data}

    files = sorted(os.listdir(EXTRACTED_DIR))

    pairs: list[tuple[str, str]] = []
    for f in files:
        if not (f.startswith("0653") and "_qp_" in f and f.endswith(".pdf")):
            continue
        m = re.search(r"_qp_(\d)\d\.pdf", f, re.I)
        if not m:
            continue
        paper_num = int(m.group(1))
        if paper_num not in THEORY_PAPERS:
            continue
        if args.paper and paper_num != args.paper:
            continue
        if args.year_end:
            ym = re.search(r"_[msw](\d{2})_", f)
            if ym and int(ym.group(1)) > args.year_end:
                continue
        ms_name = f.replace("_qp_", "_ms_")
        if ms_name not in files:
            continue
        pairs.append((f, ms_name))

    todo = [(qp, ms) for qp, ms in pairs if qp not in processed]
    print(f"Found {len(pairs)} pairs | {len(todo)} to process\n")

    if not todo:
        print("Nothing to do.")
        return

    count = 0
    for qp_name, ms_name in todo:
        if args.limit and count >= args.limit:
            print(f"Reached limit of {args.limit} papers.")
            break

        print(f"  {qp_name} ...", end=" ", flush=True)

        qp_path = os.path.join(EXTRACTED_DIR, qp_name)
        ms_path = os.path.join(EXTRACTED_DIR, ms_name)

        qp_pages = pdf_pages(qp_path)
        ms_pages = pdf_pages(ms_path)

        if not qp_pages:
            print("SKIP (no QP text)")
            continue

        img_map   = pdf_images(qp_path, qp_name)
        questions = parse_qp(qp_pages)
        ms_map    = parse_ms(ms_pages) if ms_pages else {}
        questions = attach_ms(questions, ms_map)

        # Assign topics and images
        for q in questions:
            q["topic"] = classify(q["question"])
        assign_images(questions, img_map)

        # Filter out very short / noise entries
        questions = [q for q in questions if len(q["question"]) > 20]

        matched  = sum(1 for q in questions if q["markingSchemeAnswer"] != "See mark scheme.")
        with_img = sum(1 for q in questions if q["imageSrc"])
        print(f"{len(questions)} questions  (MS linked: {matched}, images: {with_img})")

        all_data.append({
            "source":    qp_name,
            "ms_source": ms_name,
            "questions": questions,
        })
        save(all_data)
        count += 1

    total_q  = sum(len(p["questions"]) for p in all_data if p["source"].startswith("0653"))
    total_p  = sum(1 for p in all_data if p["source"].startswith("0653"))
    print(f"\nDone! {total_p} papers | {total_q} total 0653 theory questions")
    print("Next: npx tsx src/server/scripts/seed-theory-questions.ts")


if __name__ == "__main__":
    main()
