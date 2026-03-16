# ExamPrep — IGCSE O-Level Practice

ExamPrep is a dedicated O-Level past-paper practice platform built for Cambridge Combined Science (0653) and Environmental Management (0680). It pairs verified question banks, AI grading, and readiness analytics to help students move from B to A* with confidence.

## Highlights

- **Real papers, verified mark schemes**: We only surface questions backed by official past papers and diagrams seeded from licensed PDFs.
- **AI-informed readiness**: Predictive grading + topic-wise A* readiness reporting keeps students focused on what matters.
- **Smart practice & mock hub**: Curriculum-driven MCQ drills, mocks with instant grading, and a strict diagram resolver to avoid hallucinated visuals.
- **Syllabus mapped**: English-labeled roadmap for 2025–2029 Cambridge syllabuses + Environmental Management alignment via `syllabus_policy.json`.

## Getting Started

1. `git clone <repo>` then `cd exam-practice`
2. `pnpm install` (requires pnpm v10+ and Node 20+)
3. `cp .env.example .env` and fill `DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_*`, etc.
4. `pnpm db:push` to sync the Drizzle schema.
5. `pnpm db:seed` to load unit/topic/challenge data.
6. `pnpm dev` to start the Next.js dev server and explore `/learn`, `/mock-exam`, `/progress`, `/exams`.

## Data Pipeline Notes

- Use `scripts/python/crop_question_diagrams.py` to crop diagrams into `public/diagrams` with the resolver-friendly naming scheme.
- Rerun `npx tsx src/server/scripts/seed-all-questions.ts` after diagram extraction so every question picks up its `imageSrc`.
- Audit coverage via `node -r dotenv/config scripts/check_resource_ui_audit_0653.js` before deploying; aim for >95% resolved diagrams.

## Health Checks

- `cmd /c pnpm exec tsc --noEmit --pretty false` for type checking
- `pnpm dev` for manual QA (lessons, smart practice, mock exam flows)
- Ensure `public/diagrams/` matches `diagram_manifest.json` and that old placeholder SVGs have been cleaned before release.

## Tech Stack

- Next.js 14 (App Router) + Tailwind CSS  
- Drizzle ORM + Neon Postgres  
- Clerk Authentication + Gemini AI explanations  
- pnpm + TypeScript toolchain

## Attribution

- Figures and icons are from licensed Cambridge PDFs  
- Data extraction helpers are in `scripts/python/*` (pdfplumber + Gemini Vision assist)

## Ready to ship?

Once the diagram audit clears, mocks pass, and resource resolver shows images only when verified, the app is ready for live deployment.
