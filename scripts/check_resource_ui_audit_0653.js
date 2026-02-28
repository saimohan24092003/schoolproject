const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const RESOURCE_REFERENCE_REGEX = /\b(table|figure|diagram|image|map|graph|chart)\b/i;
const PLACEHOLDER_IMAGES = new Set([
  '/boy.svg', '/girl.svg', '/man.svg', '/woman.svg', '/robot.svg', '/zombie.svg', '/hero.svg', '/mascot.svg', '/linga-logo.svg'
]);

const toSeasonCode = (season) => {
  if (!season) return null;
  const s = String(season).toLowerCase().trim();
  if (s.startsWith('m')) return 'm';
  if (s.startsWith('j')) return 'm';
  if (s.startsWith('s')) return 's';
  if (s.startsWith('w')) return 'w';
  if (s.includes('oct') || s.includes('nov')) return 'w';
  if (s.includes('may') || s.includes('jun')) return 'm';
  return s.charAt(0) || null;
};

const getSubjectCodeFromText = (subject) => {
  if (!subject) return null;
  const m = String(subject).match(/\((\d{4})\)/);
  return m ? m[1] : null;
};

const parseDiagramName = (name) => {
  const m = String(name).match(/\.pdf_(\d+)_(\d+)\.png$/i);
  if (!m) return { pageNo: null, regionNo: null };
  return { pageNo: Number.parseInt(m[1], 10), regionNo: Number.parseInt(m[2], 10) };
};

const derivePaperCodes = (paperNumber, variant) => {
  const variantText = String(variant || '').trim().toLowerCase();
  const paperText = paperNumber != null ? String(paperNumber).trim() : '';
  const directTwoDigit = variantText.match(/\b(\d{2})\b/);
  const directOneDigit = variantText.match(/\b(\d)\b/);
  const codes = new Set();
  if (directTwoDigit && directTwoDigit[1]) codes.add(directTwoDigit[1]);
  if (paperText) codes.add(paperText);
  if (paperText && directOneDigit && directOneDigit[1]) codes.add(`${paperText}${directOneDigit[1]}`);
  return Array.from(codes);
};

const diagramsDir = path.join(process.cwd(), 'public', 'diagrams');
const diagramFiles = fs.existsSync(diagramsDir)
  ? fs.readdirSync(diagramsDir).filter((f) => f.toLowerCase().endsWith('.png'))
  : [];

const getPublicFileExists = (relativePath) => {
  try {
    const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const fullPath = path.join(process.cwd(), 'public', clean);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
};

const isUsableImageSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  const value = src.trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith('/')) return getPublicFileExists(value);
  return false;
};

const isPlaceholder = (src) => {
  if (!src || typeof src !== 'string') return false;
  return PLACEHOLDER_IMAGES.has(src.trim().toLowerCase());
};

const getPaperSpecificDiagrams = ({ subjectCode, year, season, paperNumber, variant }) => {
  if (!subjectCode) return [];
  const yy = year ? String(year).slice(-2) : null;
  const seasonCode = toSeasonCode(season);
  const paperCodes = derivePaperCodes(paperNumber, variant);
  const filtered = paperCodes.flatMap((paperCode) => {
    const paperPrefix = yy && seasonCode ? `${subjectCode}_${seasonCode}${yy}_qp_${paperCode}` : null;
    if (!paperPrefix) return [];
    return diagramFiles.filter((name) => name.startsWith(paperPrefix));
  });
  if (!filtered.length) return [];
  const qualityFiltered = filtered.filter((name) => {
    const parsed = parseDiagramName(name);
    if (parsed.pageNo == null) return true;
    return parsed.pageNo >= 2;
  });
  const chosen = qualityFiltered.length ? qualityFiltered : filtered;
  return chosen.map((name) => `/diagrams/${name}`);
};

const extractImages = (q) => {
  const sources = [];
  const singleKeys = ['imageSrc', 'fallbackImageSrc', 'image', 'imageUrl', 'diagram', 'diagramUrl', 'figure', 'figureUrl'];
  const listKeys = ['images', 'imageUrls', 'diagrams', 'diagramUrls', 'figures'];

  for (const k of singleKeys) {
    const v = q?.[k];
    if (typeof v === 'string' && v.trim()) sources.push(v.trim());
  }
  for (const k of listKeys) {
    const arr = q?.[k];
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v === 'string' && v.trim()) sources.push(v.trim());
      }
    }
  }
  return Array.from(new Set(sources));
};

const resolveForQuestion = (q, paper) => {
  const text = String(q?.text || q?.question || '').trim();
  const refs = RESOURCE_REFERENCE_REGEX.test(text);
  const candidates = extractImages(q);
  const explicit = candidates.find((src) => isUsableImageSrc(src) && !isPlaceholder(src)) || null;

  if (explicit) return { status: 'explicit', src: explicit, refs };
  if (!refs) return { status: 'no_ref', src: null, refs };

  const subjectCode = getSubjectCodeFromText(paper.subject);
  const pool = getPaperSpecificDiagrams({
    subjectCode,
    year: paper.year,
    season: paper.season,
    paperNumber: paper.paper_number,
    variant: paper.variant,
  });
  const fallback = pool.length === 1 ? pool[0] : null;
  if (fallback) return { status: 'fallback', src: fallback, refs };
  return { status: 'unresolved', src: null, refs };
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const papers = await c.query(
    "select id,subject,level,year,season,paper_number,variant,content from exam_papers where level='O-Level' and subject like '%(0653)%'"
  );

  let totalQuestions = 0;
  let refQuestions = 0;
  let explicit = 0;
  let fallback = 0;
  let unresolved = 0;
  const unresolvedRows = [];

  for (const paper of papers.rows) {
    let parsed;
    try { parsed = JSON.parse(paper.content || '{}'); } catch { continue; }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
      : Array.isArray(parsed.data)
        ? parsed.data
        : [];

    for (const q of questions) {
      totalQuestions += 1;
      const result = resolveForQuestion(q, paper);
      if (!result.refs) continue;
      refQuestions += 1;

      if (result.status === 'explicit') explicit += 1;
      else if (result.status === 'fallback') fallback += 1;
      else if (result.status === 'unresolved') {
        unresolved += 1;
        if (unresolvedRows.length < 200) {
          unresolvedRows.push({
            paperId: paper.id,
            subject: paper.subject,
            year: paper.year,
            season: paper.season,
            paperNumber: paper.paper_number,
            variant: paper.variant,
            questionNumber: q.number ?? null,
            question: String(q?.text || q?.question || '').slice(0, 180),
          });
        }
      }
    }
  }

  const report = {
    scope: 'O-Level Combined Science (0653) exam_papers',
    generatedAt: new Date().toISOString(),
    totalPapers: papers.rows.length,
    totalQuestions,
    resourceReferencedQuestions: refQuestions,
    resolvedExplicit: explicit,
    resolvedFallback: fallback,
    unresolved,
    unresolvedRate: refQuestions > 0 ? Number(((unresolved / refQuestions) * 100).toFixed(2)) : 0,
    unresolvedSamples: unresolvedRows,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'analysis_results_resource_ui_audit_0653.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('Audit complete');
  console.log(report);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
