"""
Split Hindi listening audio into per-exercise segments.
Maps question groups to specific audio clips so students only hear
the relevant 1-10 minute section, not the full 57-minute paper.
"""
import sys, os, json, subprocess
sys.stdout.reconfigure(encoding="utf-8")

FFMPEG = r"C:\Users\Asus\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
AUDIO_DIR = os.path.join(BASE_DIR, "public", "audio", "hindi")
OUTPUT_DIR = os.path.join(AUDIO_DIR, "segments")
SEEDS_FILE = os.path.join(BASE_DIR, "hindi_seeds_0549.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Segment definitions ──────────────────────────────────────────
# Format: (start_sec, end_sec, segment_id, question_range)
# Based on silence detection (>10s gaps = section boundaries)
SPECIMEN27_SEGMENTS = [
    # (start, end, seg_name, q_numbers_in_paper)
    (0,    663,  "s01", list(range(1, 11))),    # Q1-10: short image MCQs
    (663,  775,  "s02", [11, 12]),               # Q11-12: music website
    (775,  925,  "s03", [13, 14]),               # Q13-14: books
    (925,  1041, "s04", [15, 16]),               # Q15-16: singing competition
    (1041, 1158, "s05", [17, 18]),               # Q17-18: Jasmine interview
    (1158, 1355, "s06", list(range(19, 27))),    # Q19-26: crocodile expert
    (1355, 1917, "s07", list(range(27, 33))),    # Q27-32: (missing from extraction)
    (1917, 2497, "s08", list(range(33, 41))),    # Q33-40: Ila's story
]

W24_SEGMENTS = [
    # w24 paper - split into halves as we don't know exact structure
    # Use same proportional cuts (will refine if needed)
    (0,    600,  "s01", list(range(1, 11))),
    (600,  1200, "s02", list(range(11, 21))),
    (1200, 1800, "s03", list(range(21, 31))),
    (1800, 9999, "s04", list(range(31, 41))),
]

PAPER_CONFIG = {
    "0549_specimen27_listening.mp3": {
        "segments": SPECIMEN27_SEGMENTS,
        "prefix": "0549_specimen27",
    },
    "0549_w24_listening.mp3": {
        "segments": W24_SEGMENTS,
        "prefix": "0549_w24",
    },
}


def cut_segment(input_path: str, start: float, end: float, output_path: str):
    """Use ffmpeg to cut a segment from start to end (seconds)."""
    if os.path.exists(output_path):
        print(f"  [skip] {os.path.basename(output_path)} already exists")
        return True

    duration = end - start
    cmd = [
        FFMPEG, "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-acodec", "libmp3lame",
        "-q:a", "4",  # ~165 kbps VBR
        "-v", "quiet",
        output_path,
    ]
    # For last segment (end=9999), don't set -t
    if end >= 9999:
        cmd = [
            FFMPEG, "-y",
            "-ss", str(start),
            "-i", input_path,
            "-acodec", "libmp3lame",
            "-q:a", "4",
            "-v", "quiet",
            output_path,
        ]

    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print(f"  [ERROR] {result.stderr.decode('utf-8', errors='replace')}")
        return False
    return True


def main():
    with open(SEEDS_FILE, encoding="utf-8") as f:
        seeds = json.load(f)

    # Build a mapping: paper_source → list of questions (in order)
    source_map = {}
    for paper in seeds:
        src = paper.get("source", "")
        source_map[src] = paper.get("questions", [])

    updated = False

    for audio_file, config in PAPER_CONFIG.items():
        input_path = os.path.join(AUDIO_DIR, audio_file)
        if not os.path.exists(input_path):
            print(f"[skip] Audio file not found: {audio_file}")
            continue

        prefix = config["prefix"]
        segments = config["segments"]
        print(f"\nProcessing: {audio_file}")

        # Find corresponding paper source in seeds
        # Match by prefix (e.g. "0549_specimen27" matches "0549_specimen27_qp_21.pdf")
        paper_key = prefix.replace("_listening", "")
        matching_sources = [k for k in source_map if paper_key.split("_listening")[0] in k and "qp_21" in k]
        if not matching_sources:
            print(f"  [warn] No matching paper source for {prefix}")
            continue
        paper_src = matching_sources[0]
        questions = source_map[paper_src]

        # Build q_number → question index mapping
        # Questions in JSON have text like "प्रश्न 7: ..."
        import re
        q_num_to_idx = {}
        for idx, q in enumerate(questions):
            text = q.get("question", "") or ""
            m = re.search(r"प्रश्न\s+(\d+)", text)
            if m:
                q_num_to_idx[int(m.group(1))] = idx

        print(f"  Found {len(questions)} questions, {len(q_num_to_idx)} with प्रश्न numbers")

        # Cut segments and update audioSrc
        for start, end, seg_id, q_numbers in segments:
            seg_filename = f"{prefix}_{seg_id}.mp3"
            seg_path = os.path.join(OUTPUT_DIR, seg_filename)
            web_path = f"/audio/hindi/segments/{seg_filename}"

            print(f"  Cutting {seg_id} ({start}s-{end}s) → {seg_filename}")
            ok = cut_segment(input_path, start, min(end, 3600), seg_path)
            if not ok:
                continue

            # Update questions that belong to this segment
            for q_num in q_numbers:
                if q_num in q_num_to_idx:
                    idx = q_num_to_idx[q_num]
                    questions[idx]["audioSrc"] = web_path
                    updated = True

        source_map[paper_src] = questions

    if updated:
        # Write back to seeds
        for paper in seeds:
            src = paper.get("source", "")
            if src in source_map:
                paper["questions"] = source_map[src]

        with open(SEEDS_FILE, "w", encoding="utf-8") as f:
            json.dump(seeds, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Updated {SEEDS_FILE} with segment audio paths")
        print("Now run: npx tsx src/server/scripts/reseed-hindi.ts")
    else:
        print("\n[no updates made]")


if __name__ == "__main__":
    main()
