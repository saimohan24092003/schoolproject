import json
import re

def main():
    try:
        with open('bulk_seeds_progress.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("bulk_seeds_progress.json not found")
        return

    years = {}
    for paper in data:
        source = paper['source']
        # Match year from filename like 0653_m23_qp_12.pdf
        match = re.search(r'([ms])(\d{2})', source)
        if match:
            year_short = match.group(2)
            year = "20" + year_short
            years[year] = years.get(year, 0) + len(paper['questions'])
        else:
            # Try matching 2015-2018 style
            match_full = re.search(r'20(\d{2})', source)
            if match_full:
                year = match_full.group(0)
                years[year] = years.get(year, 0) + len(paper['questions'])
            else:
                years["Unknown"] = years.get("Unknown", 0) + len(paper['questions'])

    print("Question counts per year in bulk_seeds_progress.json:")
    for year in sorted(years.keys()):
        print(f"{year}: {years[year]} questions")

if __name__ == "__main__":
    main()
