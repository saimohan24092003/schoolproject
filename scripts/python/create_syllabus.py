import json

syllabus = {
    "Biology": [
        "B1. Characteristics of living organisms",
        "B2. Cells",
        "B3. Biological molecules",
        "B4. Enzymes",
        "B5. Plant nutrition",
        "B6. Animal nutrition",
        "B7. Transport",
        "B8. Gas exchange and respiration",
        "B9. Coordination and response",
        "B10. Reproduction",
        "B11. Inheritance",
        "B12. Ecology"
    ],
    "Chemistry": [
        "C1. Particulate nature of matter",
        "C2. Experimental techniques",
        "C3. Atoms, elements and compounds",
        "C4. Stoichiometry",
        "C5. Electricity and chemistry",
        "C6. Energy changes in reactions",
        "C7. Chemical reactions",
        "C8. Acids, bases and salts",
        "C9. The Periodic Table",
        "C10. Metals",
        "C11. Air and water",
        "C12. Organic chemistry"
    ],
    "Physics": [
        "P1. Motion, forces and energy",
        "P2. Thermal physics",
        "P3. Waves",
        "P4. Electricity and magnetism",
        "P5. Atomic physics",
        "P6. Space physics"
    ]
}

with open("syllabus.json", "w") as f:
    json.dump(syllabus, f, indent=2)
