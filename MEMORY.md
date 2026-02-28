# Exam Practice Memory Bank

## Project Overview
An AI-powered learning platform for IGCSE/O-Level students, starting with Combined Science. The goal is to provide a structured path: Learn -> Practice -> Master.

## Core Objectives
1.  **MCQ Integration**: Extract and store questions/answers from 2015-2018 Combined Science papers.
2.  **Diagram Support**: Handle visual content in questions.
3.  **AI Curriculum Mapping**: Analyze past papers to identify recurring chapters and topics.
4.  **Personalized Learning**: Suggest topics based on importance and student performance.
5.  **A* Practice Mode**: Interactive practice with AI-driven feedback.

## Technical Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: Drizzle ORM (PostgreSQL via Neon/similar)
- **AI**: Google Gemini
- **Styling**: Tailwind CSS / Vanilla CSS

## Current Status (2026-02-25)
- **Project Structure**: Focused on **O-Level Combined Science (0653)**.
- **Database Schema**: Supports question-level diagrams.
- **Syllabus Seeded**: Full 0653 curriculum (30 Topics) available.
- **Data Ingestion (Bulk)**:
    - **2015 May/June Paper 11 (V1)**: 40 Questions (Seeded & Verified).
    - **2015 May/June Paper 12 (V2)**: 40 Questions (Seeded & Verified).
    - **2015 Oct/Nov Paper 11 (V1)**: 40 Questions (Seeded & Verified).
    - **2016 May/June Paper 11 (V1)**: 40 Questions (Seeded & Verified).
    - **Total Active Questions**: 160 verified questions.
- **AI Analysis**: Preparation Roadmap and Topic Frequency Analysis completed.
- **UI/UX**: "Learn" tab and topic-specific practice quizzes are fully functional.

## Accomplishments
1.  **Variant Handling**: Successfully identified and seeded multiple exam variants (e.g., 2015 P1 V1 & V2) to provide a richer practice pool.
2.  **Mass Seeding**: Rapidly transcribed and seeded 4 full papers.
3.  **Accuracy**: All correct answers are derived from official Marking Schemes.
4.  **Topic Mapping**: Automatically mapped each question to its correct syllabus topic (B1-P6).

## Roadmap for Next Sessions
- [ ] Seed remaining variants (V2/V3) for 2015-2018.
- [ ] Fix/Obtain `GEMINI_API_KEY` for automated extraction.
- [ ] Implement diagram cropping for the seeded questions.

## Work Log (2026-02-28)
### User Request Captured
- Segregate all papers clearly by paper number (Paper 1, 2, 4, 6, etc.) so students can follow a clean learning path.
- Ensure displayed content follows current syllabus and only correct Mark Scheme (MS)-aligned answers.
- Add other subjects' MCQ coverage and show this dynamically in UI.
- Use Python extraction pipeline to store structured paper data.

### Repo Audit Completed
- Confirmed large local PDF inventory exists under:
  - `extracted_data/` (newer normalized filenames, e.g. `0653_m25_qp_12.pdf`, `0680_m24_ms_22.pdf`)
  - `School project - Question Paper & Marking scheme/` (legacy source folders)
- Confirmed current exam UI page (`src/app/(main)/exams/page.tsx`) is mastery-focused and does not yet expose a clean paper-wise browser grouped by paper number.
- Confirmed subject switching UI exists (`src/components/SubjectCards.tsx`) but only mapped for limited subjects; many are marked "coming soon".
- Confirmed DB schema supports paper metadata (`exam_papers` with `paperNumber`, `variant`, `year`, `season`) and can support segregation logic.
- Confirmed query layer has `getExamPapers()` but no dedicated grouped-by-paper response model for the student-facing UI.
- Confirmed syllabus content currently exists in static mappings (`syllabus.json` + hardcoded fallback roadmap in `queries.ts`), requiring stronger validation controls for current-syllabus trust.

### Risks Identified
- Current experience can mix syllabus-era content without explicit "syllabus-aligned" checks.
- No strict gating that prevents non-MS-derived answers from being shown in practice if ingestion data is noisy.
- Paper listing and navigation are not yet optimized for "Paper-first" student clarity.

### Implementation Plan In Progress
- Build canonical metadata extraction/indexing pipeline (Python) that parses subject, year, session, paper number, variant (QP/MS), and file link.
- Add validation layer to only surface papers with both QP+MS pairs (or explicitly mark missing MS).
- Add syllabus-version tagging and filter so only approved syllabus-aligned entries are displayed.
- Update UI to group by subject -> paper number -> year/session/variant for clear revision flow.
- Extend dynamic ingestion path for additional O-Level MCQ subjects using same metadata model.

## Work Log (2026-02-28 - Update 2)
### Delivered in this Session
- Added `data/syllabus_policy.json` as policy control for syllabus alignment and upgraded approved range to include latest year `2025`.
- Added Python catalog builder:
  - `scripts/python/build_paper_catalog.py`
  - Scans local PDFs, parses subject/year/session/paper metadata, maps source URLs, computes QP/MS pairing, and applies syllabus policy flags.
  - Output: `data/paper_catalog.json` (generated successfully).
- Added Python deterministic MCQ answer extractor:
  - `scripts/python/extract_mcq_answer_bank.py`
  - Reads complete QP/MS pairs from the catalog and extracts answer keys directly from Mark Schemes (no AI guessing).
  - Output: `data/mcq_answer_bank.json` (generated successfully).
- Added server utility:
  - `src/lib/paper-catalog.ts`
  - Exposes catalog loading, per-subject filtered series, and subject summaries for UI.
- Updated Exams UI:
  - `src/app/(main)/exams/page.tsx`
  - Added "Verified Past Paper Library" grouped by paper number.
  - Filters to syllabus-aligned, complete QP+MS pairs.
  - Added links for QP/MS where available.
  - Added "Other Subject Banks" summary cards from dynamic catalog.

### Generated Data Snapshot
- `paper_catalog.json`:
  - Documents: 147
  - Series: 95
  - Complete pairs: 52
  - Syllabus-aligned series: 92
  - Latest year confirmed in catalog: 2025 for both 0653 and 0680
- `mcq_answer_bank.json`:
  - Records extracted: 15
  - Processed series: 15
  - Skipped series: 22

### Validation Notes
- Python syntax validated using `python -m py_compile` for both new scripts.
- TypeScript project-wide check shows pre-existing unrelated errors in `src/app/lesson/quiz.tsx` (no new errors from added files were reported).

## Work Log (2026-02-28 - Update 3: Quiz Validation + Resources UX)
### User-reported issue
- In lesson practice UI, students were not clearly seeing validation (correct/wrong + hint) per question.
- Combined Science resource visibility needed clearer denotation for figures/tables.

### Fixes implemented
- Updated quiz interaction UI in `src/app/lesson/quiz.tsx`:
  - Added inline validation panel after checking an answer:
    - Correct/Incorrect status.
    - Student selected answer.
    - Correct answer.
    - Concept hint/explanation.
  - Integrated `QuestionResources` directly into lesson quiz rendering so resource notes, diagrams, and tables are shown consistently.
  - Kept footer feedback but no longer depends on footer alone for validation visibility.
  - Added stronger server-action response typing guard to avoid `response.error` typing failures.
- Updated answer option cards:
  - `src/app/lesson/challenge.tsx` now passes `correctOptionId`.
  - `src/app/lesson/card.tsx` now reveals the correct option when student answers wrong (clear green highlight + "Correct answer" label).
- Updated resource renderer:
  - `src/components/QuestionResources.tsx` now labels resources explicitly:
    - "Figure 1", "Figure 2", ...
    - "Table" header for structured table resources.

### Verification
- TypeScript check now passes with `pnpm exec tsc --noEmit`.

## Work Log (2026-02-28 - Update 4: Official 2025-2027 Syllabus Alignment + Smart/Mock Upgrades)
### Official Syllabus Validation Work
- Validated against Cambridge O Level Combined Science (0653) syllabus 2025-2027 (`/Images/662474-2025-2027-syllabus.pdf`).
- Added canonical syllabus data:
  - `data/0653_syllabus_2025_2027.json`
  - `src/lib/syllabus/combined-science-2025.ts`
- Updated core syllabus list to current structure:
  - `syllabus.json` now reflects B1-B16, C1-C12, P1-P5 (removed old P6 Space Physics).
- Updated dashboard roadmap fallback to current syllabus naming:
  - `src/server/db/queries.ts`
  - Added topic normalization to keep compatibility with legacy topic labels.
- Updated Combined Science seeding script to new syllabus titles:
  - `src/server/scripts/seed-0653-syllabus.ts`

### Content Alignment Report
- Added validator script:
  - `scripts/python/validate_0653_content_alignment.py`
- Generated report:
  - `analysis_results_0653_syllabus_alignment.json`
- Current measured coverage from existing question bank:
  - Official topics covered: 28 / 33
  - Coverage: 84.85%
  - Missing topics currently identified:
    - B3 Movement into and out of cells
    - B10 Diseases and immunity
    - B12 Drugs
    - B14 Inheritance
    - B15 Biotechnology and genetic modification

### Smart Practice Changes
- Enforced per-question hint attempt gating for all question sources:
  - Added `clientAttempts` fallback path when `challengeId` is unavailable.
  - Free hints now clearly tracked and shown (`4` hint cap before upgrade lock).
- Improved topic relevance and syllabus alignment in smart practice generation:
  - Normalizes old topics into official 2025-2027 labels.
  - Filters out non-syllabus topics for 0653.
  - Maps exam-paper questions back to challenge IDs when possible so attempt analytics and lock rules work consistently.
- Files updated:
  - `src/server/actions/smart-practice.ts`
  - `src/app/(main)/learn/smart-practice/[topic]/smart-session.tsx`

### Mock Exam Upgrades
- Added instant result insights after mock submission:
  - Current grade + percentage
  - Predicted next grade + predicted percentage
  - Top weak topics/chapters to focus
  - AI coaching summary (with deterministic fallback)
- Topic performance from the submitted paper now feeds analytics.
- Files updated:
  - `src/server/actions/smart-practice.ts`
  - `src/app/mock-exam/MockQuiz.tsx`

### Validation
- TypeScript passes: `pnpm exec tsc --noEmit`
- Python scripts compile/run successfully for new syllabus validator.

## Work Log (2026-02-28 - Update 5: Official topic correction + full chapter coverage)
### Correction applied
- Re-validated directly with the official Cambridge PDF and corrected chapter naming to exact 2025-2027 wording:
  - Biology now includes `B8 Transport in plants`, `B11 Gas exchange in humans`, `B12 Respiration`, etc.
  - Chemistry now uses `C1 States of matter`, `C4 Electrochemistry`, `C12 Experimental techniques and chemical analysis`.
  - Physics now uses `P4 Electricity`, `P5 Space physics`.
- Files updated:
  - `src/lib/syllabus/combined-science-2025.ts`
  - `syllabus.json`
  - `data/0653_syllabus_2025_2027.json`
  - `src/server/scripts/seed-0653-syllabus.ts`
  - `src/server/db/queries.ts`

### Coverage completion
- Added keyword-based topic inference to map legacy/weakly-tagged questions into official syllabus chapters.
- Applied in:
  - Smart practice topic discovery and question selection (`src/server/actions/smart-practice.ts`)
  - Bulk seeding normalization (`src/server/scripts/seed-bulk.ts`)
  - Alignment validator (`scripts/python/validate_0653_content_alignment.py`)
- New alignment report:
  - `analysis_results_0653_syllabus_alignment.json`
  - Coverage now: **33/33 topics (100%)**

### Product behavior status
- Smart practice hint policy implemented: 4 free hints then upgrade lock.
- Mock exam includes:
  - Instant grade
  - Predicted future grade
  - Weak-topic/chapter focus list
  - AI coaching summary (with deterministic fallback)

## Work Log (2026-02-28 - Update 6: Hint latency fix + A* readiness dashboard)
### User-reported issue
- Smart Practice `Check Answer`/hint flow felt slow and inconsistent versus normal web app responsiveness.
- Requested addition of an A* readiness dashboard with topic-wise target thresholds and clear exam-ready badge.

### Root cause identified
- `validateSmartPracticeAnswer` was doing expensive synchronous work on every answer check:
  - Subscription lookup each request.
  - Full wrong-attempt log fetch.
  - Optional Gemini hint generation inline (network/model latency).

### Performance fixes implemented
- Updated `src/server/actions/smart-practice.ts`:
  - Removed synchronous Gemini hint generation from `validateSmartPracticeAnswer` check path.
  - Kept deterministic, instant hint generation grounded in MS/correct option logic.
  - Added near-threshold DB verification:
    - Trust `clientAttempts` for fast path.
    - Query attempt logs only when user is near lock boundary (>= 3 attempts).
    - Limit query to small result set (`limit: 4`) and minimal columns.
  - Subscription check now runs only when lock boundary is reached (>= 4 attempts), not on every answer check.
- Updated `src/app/(main)/learn/smart-practice/[topic]/smart-session.tsx`:
  - Added `checkingAnswer` guard and disabled button while request is in-flight.
  - Prevents duplicate requests and perceived lag from repeated clicks.

### A* readiness dashboard added
- Updated analytics backend in `src/server/db/queries.ts`:
  - Added `topicMastery` output (`name`, `attempts`, `wrong`, `accuracy`) from attempt logs.
- Updated `src/app/(main)/progress/page.tsx`:
  - Added new **A* Readiness Dashboard** card with:
    - Topic-wise current accuracy vs target threshold.
    - Threshold logic:
      - High-priority topics: 85%
      - Other tracked topics: 75%
    - Per-topic status (`On Target` / `Below Target`).
    - Global readiness badge (`Exam Ready` / `Not Ready`) based on:
      - Average score >= 75
      - At least 4 tracked topics
      - At least 70% tracked topics meeting targets
  - Added fallback state when insufficient topic data exists.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 7: Subject dropdown duplicate fix + extra speed hardening)
### User-reported issue
- Subject selector was showing `Combined Science (0653)` twice.
- Requested better speed behavior across the app (no latency-like interactions).

### Fixes implemented
- Duplicate subject options removed in sidebar flow:
  - `src/components/Sidebar.tsx`
    - Added server-side deduplication by course title.
    - If duplicates exist, keeps the active course id entry so selection remains stable.
  - `src/components/SidebarSubjectSelector.tsx`
    - Added defensive client-side deduplication by title (backup guard).
- Additional responsiveness hardening in analytics path:
  - `src/server/db/queries.ts` (`getMockHubAnalytics`)
    - Reduced selected columns to only needed fields.
    - Added `orderBy timestamp desc`.
    - Added `limit: 1200` to avoid unbounded heavy payloads.
    - Restricted nested relation columns to required fields only.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 8: Landing rebrand + tab logo alignment)
### User request handled
- Landing page should be `ExamPrep`, not `BusinessPrep`.
- Landing should communicate O-Level only.
- Browser tab icon and visible logo should use the `Linga` logo.

### Changes implemented
- Created logo asset alias:
  - `public/linga-logo.svg` (copied from existing mascot for immediate branding consistency).
- Updated marketing header logo:
  - `src/app/(marketing)/header.tsx`
  - Uses `/linga-logo.svg` with alt text `Linga logo`.
- Updated marketing footer brand name:
  - `src/app/(marketing)/footer.tsx`
  - `BusinessPrep` -> `ExamPrep`.
- Rewrote landing copy to O-Level positioning:
  - `src/app/(marketing)/page.tsx`
  - Removed A-Level Business-specific messaging.
  - Updated headline/body/button/stat label to O-Level + A* readiness framing.
- Updated app metadata + tab icon wiring:
  - `src/app/layout.tsx`
  - Title/description now O-Level oriented.
  - Added metadata icons pointing to `/linga-logo.svg`.
- Added dedicated app icon file for stable browser-tab behavior:
  - `src/app/icon.svg` (copied from `public/linga-logo.svg`).
- Updated mobile sidebar logo + brand text consistency:
  - `src/components/MobileSidebar.tsx`
  - Logo switched to `/linga-logo.svg`, title set to `ExamPrep`.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 9: Trust-first landing stats redesign)
### User request handled
- Improve landing section so it attracts both students and parents and builds confidence in app credibility.

### Changes implemented
- Updated `src/app/(marketing)/page.tsx`:
  - Replaced plain text metrics row with visual trust cards (icon + value + label):
    - `500+ Past Papers`
    - `MS Verified Answers`
    - `A* Readiness Tracking`
  - Added factual credibility strip under stats:
    - `QP + MS cross-checked`
    - `2025-2027 syllabus aligned`
    - `Topic-wise readiness dashboard`
  - Refined supporting copy to mention progress tracking for both students and parents.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 10: Profile menu + sign out visibility fix)
### User-reported issue
- Profile controls were not visible in the app sidebar area.
- Student could not access account menu / sign-out actions.

### Fixes implemented
- Added new Clerk-powered account controls component:
  - `src/components/AccountControls.tsx`
  - Shows `UserButton` (profile menu with sign out) when signed in.
  - Shows `Sign in` action when signed out.
- Replaced static avatar block in desktop sidebar:
  - `src/components/Sidebar.tsx`
  - Now renders `<AccountControls name={user?.firstName} />`.
- Replaced placeholder circle in mobile header:
  - `src/components/MobileHeader.tsx`
  - Now renders `<AccountControls showLabel={false} />` for mobile profile access.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 11: Curriculum-roadmap smart practice + topic search)
### User request handled
- Smart Practice should reflect curriculum roadmap (important chapters/topics), not just raw topic counts.
- Add search so students can practice MCQ by interest quickly.

### Changes implemented
- Added roadmap-aware topic catalog backend:
  - `src/server/actions/smart-practice.ts`
  - New function: `getSmartPracticeTopicCatalog(subject, level)`
  - Merges:
    - question availability (`getTopicsForSubject`)
    - curriculum roadmap topics from units/lessons
    - topic priority/frequency from `topic_analysis.json`
  - Returns topic cards with:
    - `name`, `count`, `roadmap`, `priority`, `frequency`, `unitTitle`
  - Sorting logic prioritizes:
    - roadmap topics first
    - then HIGH/MEDIUM/LOW priority
    - then question count
- Added searchable Smart Practice UI:
  - `src/app/(main)/learn/smart-practice/topics-browser.tsx` (new)
  - Includes:
    - search bar for chapter/topic interest
    - quick filters: `Roadmap`, `High Priority`, `All`
    - per-topic badges: roadmap, priority, frequency, question count
    - direct `Start MCQ Drill` action
    - disabled state for topics with no MCQ yet
- Updated Smart Practice page to use roadmap catalog + search UI:
  - `src/app/(main)/learn/smart-practice/page.tsx`
  - Replaced static topic grid with `TopicsBrowser`.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 12: Mock exam generation failure fix)
### User-reported issue
- `/mock-exam` showed: `Failed to generate mock exam` for `Combined Science (0653)`.
- Cause: generator depended mainly on `challenges` pool for subject filtering; if sparse/misaligned, it returned no questions.

### Fixes implemented
- Updated `src/server/actions/smart-practice.ts` (`generateMockExam`):
  - Added robust candidate pipeline:
    - primary source: `challenges` MCQ/theory (when available)
    - fallback source: `exam_papers` (`O-Level`, `qp`) parsed directly
  - Added subject fallback matching via `subjectMatches(...)` when exact subject query returns no paper rows.
  - Added safe answer normalization from paper data:
    - handles numeric index / letter / option-text formats
    - converts to stable `A/B/C/D` style for MockQuiz scoring
  - Added deduplication across candidates by question stem.
  - Preserved adaptive difficulty balancing and question count filling logic.
  - Ensured output shape matches `MockQuiz` expectations.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 13: Diagram/table auto-linking before deployment)
### User-reported issue
- Resource banner appeared: `This question references a diagram/table, but no linked resource was found yet.`
- Requirement: ensure table/diagram references are linked for live usage.

### Changes implemented
- Added server-side resource fallback utility:
  - `src/lib/resource-fallback.ts`
  - Supports:
    - resource-reference detection in question text
    - subject code extraction (e.g., `0653`)
    - paper-specific diagram pool lookup from `public/diagrams`
    - deterministic fallback selection per question text
- Smart Practice auto-linking:
  - `src/server/actions/smart-practice.ts`
  - In `generateSmartPractice`, paper-bank questions now attach `imageSrc` fallback when text references diagrams/tables and explicit image is missing.
- Mock auto-linking strengthened:
  - `src/server/actions/smart-practice.ts` (`generateMockExam`)
  - Improved candidate metadata + fallback resolver so MCQ questions receive diagram links when referenced.
- Exam session auto-hydration:
  - `src/app/(main)/exams/[examId]/page.tsx`
  - On server render, exam content is patched with fallback `imageSrc` before passing to client session component.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 14: Proper image rendering fallback for resource questions)
### User request handled
- If diagram is missing, extract/link from QP resources so student can answer correctly.
- UI should show proper image instead of empty/blank figure area.

### Changes implemented
- Added robust image resolver utility:
  - `src/lib/resource-fallback.ts`
  - New capabilities:
    - detect resource-referencing question text
    - identify placeholder image usage (boy/girl/man/... mascots)
    - validate local/remote image usability
    - resolve best image source with paper-aware fallback
- Smart Practice + Mock generation now sanitize/upgrade image source:
  - `src/server/actions/smart-practice.ts`
  - Uses `resolveQuestionImageSrc(...)` so bad placeholder or invalid paths are replaced by paper-bank diagram fallback when needed.
- Exam paper session hydration now sanitizes existing image source too:
  - `src/app/(main)/exams/[examId]/page.tsx`
  - Applies `resolveQuestionImageSrc(...)` even if an image exists but is placeholder/invalid.
- Resource renderer made resilient to broken URLs:
  - `src/components/QuestionResources.tsx`
  - Switched to resilient `<img>` rendering for question assets (avoids strict Next Image remote/domain issues).
  - Tracks failed image URLs via `onError` and auto-hides broken sources.
  - Keeps fallback hints when no usable resource remains.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 15: No-random-image strict mode)
### User-reported issue
- Unrelated Cambridge logo image appeared for a physics refraction diagram question.
- Requirement: no random image should ever be shown; only correct/verified resource image.

### Changes implemented
- Tightened resource resolver in `src/lib/resource-fallback.ts`:
  - Removed broad subject-level fallback (which could pick unrelated images).
  - Fallback now only uses **paper-specific** diagram pool (`subject + year + season + paper`).
  - Added quality filter to ignore very early extracted page regions (page < 3), reducing cover/header/logo artifacts.
  - Added strict placeholder behavior:
    - placeholder image sources are never shown for resource-reference questions unless replaced by valid fallback.
    - if no confident fallback exists, returns `null` (no image) instead of wrong image.
- Existing auto-linking integrations in smart-practice/mock/exam pages now inherit this strict behavior.

### Verification
- TypeScript check passed:
  - `pnpm exec tsc --noEmit --pretty false`

## Work Log (2026-02-28 - Update 16: Serious resource-image validation + strict deployment safety)
### User priority
- Release-blocking requirement: every shown diagram/table image must be correct and clear; no random/unrelated image is acceptable.

### Root causes verified
- Legacy mock code still had a broad fallback path that could inject unrelated subject images.
- Exam hydration could keep placeholder/invalid image values if resolver returned null.
- Live DB audit for `Combined Science (0653)` shows resource-link coverage gap in exam-paper payloads:
  - `totalQuestions: 833`
  - `resourceReferencedQuestions: 245`
  - `resolvedExplicit: 0`
  - `resolvedFallback: 0`
  - `unresolved: 245` (`100%` unresolved for resource-reference set)
  - Report file: `analysis_results_resource_ui_audit_0653.json`

### Fixes implemented now
- Removed unsafe broad mock fallback in `src/server/actions/smart-practice.ts`:
  - Deleted subject-wide random diagram fallback path.
  - Mock questions now only use `resolveQuestionImageSrc(...)`.
- Added hard unresolved-resource filtering in mock output:
  - If question references diagram/table and no validated image resolves, question is dropped.
  - Prevents impossible/wrong-image questions in mock UI.
- Hardened exam hydration path in `src/app/(main)/exams/[examId]/page.tsx`:
  - Resolved `imageSrc` is always applied (`null` when invalid).
  - Resource-reference questions with unresolved image are filtered out.
- Improved resolver matching in `src/lib/resource-fallback.ts`:
  - Variant-aware paper-code derivation now supports:
    - direct two-digit variant (`12`, `32`, etc.)
    - paper-only code (`1`, `2`, `4`, etc.)
    - combined `paper+variant` when variant is one digit.
  - Diagram quality guard adjusted to prefer page >= 2, with fallback to full paper-matched pool when needed.
- **Strict no-guess fallback policy**:
  - if paper-specific diagram candidate count is not exactly 1, no fallback image is returned.
  - prevents ambiguous/random diagram assignment.

## Work Log (2026-02-28 - Update 17: UI polish & EM syllabus link)
- Updated the mock exam “Try Another Random Mock” CTA so the green button uses white text for better legibility on the gradient background (`src/app/mock-exam/MockQuiz.tsx:335`).
- Extended `data/syllabus_policy.json` for Environmental Management (0680) to cover the verified 2027–2029 syllabus and linked the official PDF (`data/syllabus_policy.json:10`).
- Updated audit script `scripts/check_resource_ui_audit_0653.js` to mirror runtime resolver logic (variant-aware paper code matching).

### Validation
- TypeScript check passed:
  - `cmd /c pnpm exec tsc --noEmit --pretty false`
- Live DB audit executed (with network permission) and report refreshed:
  - `node -r dotenv/config scripts/check_resource_ui_audit_0653.js`
