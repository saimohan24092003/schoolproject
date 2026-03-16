import * as fs from "fs";
import * as path from "path";

type PaperMeta = {
  subject?: string | null;
  subjectCode?: string | null;
  year?: number | null;
  season?: string | null;
  paperNumber?: number | null;
  variant?: string | null;
};

const RESOURCE_REFERENCE_REGEX = /\b(table|figure|diagram|image|map|graph|chart)\b/i;
const PLACEHOLDER_IMAGES = new Set([
  "/boy.svg",
  "/girl.svg",
  "/man.svg",
  "/woman.svg",
  "/robot.svg",
  "/zombie.svg",
  "/hero.svg",
  "/mascot.svg",
  "/linga-logo.svg",
]);

let cachedDiagramFiles: string[] | null = null;
let cachedDiagramQuality: Map<string, boolean> | null = null;

const MIN_PNG_FILE_BYTES = 1800;
const MIN_PNG_WIDTH = 120;
const MIN_PNG_HEIGHT = 60;

type ParsedDiagramName = {
  pageNo: number | null;
  regionNo: number | null;
};

const toSeasonCode = (season?: string | null): string | null => {
  if (!season) return null;
  const s = season.toLowerCase().trim();
  if (s.startsWith("m")) return "m"; // may / may-june
  if (s.startsWith("j")) return "m"; // june in some records maps to m-series
  if (s.startsWith("s")) return "s"; // specimen
  if (s.startsWith("w")) return "w"; // winter
  if (s.includes("oct") || s.includes("nov")) return "w";
  if (s.includes("may") || s.includes("jun")) return "m";
  return s.charAt(0) || null;
};

const getSubjectCodeFromText = (subject?: string | null): string | null => {
  if (!subject) return null;
  const m = subject.match(/\((\d{4})\)/);
  return m?.[1] || null;
};

const getDiagramFiles = (): string[] => {
  if (cachedDiagramFiles) return cachedDiagramFiles;
  try {
    const dir = path.join(process.cwd(), "public", "diagrams");
    if (!fs.existsSync(dir)) {
      cachedDiagramFiles = [];
      return cachedDiagramFiles;
    }
    cachedDiagramFiles = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
    return cachedDiagramFiles;
  } catch {
    cachedDiagramFiles = [];
    return cachedDiagramFiles;
  }
};

const parseDiagramName = (name: string): ParsedDiagramName => {
  // Old pattern: <paper>.pdf_<page>_<region>.png
  const oldPattern = name.match(/\.pdf_(\d+)_(\d+)\.png$/i);
  if (oldPattern) {
    return {
      pageNo: Number.parseInt(oldPattern[1], 10),
      regionNo: Number.parseInt(oldPattern[2], 10),
    };
  }

  // Deterministic pattern: <paper>_p<page>_q<question>[_i<idx>].png
  const deterministic = name.match(/_p(\d+)_q(\d+)(?:_i(\d+))?\.png$/i);
  if (deterministic) {
    return {
      pageNo: Number.parseInt(deterministic[1], 10),
      regionNo: deterministic[3] ? Number.parseInt(deterministic[3], 10) : 0,
    };
  }

  return { pageNo: null, regionNo: null };
};

const isPngBufferValid = (buffer: Buffer) => {
  if (buffer.length < 24) return false;
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.subarray(0, 8).equals(pngSignature);
};

const readPngDimensions = (buffer: Buffer) => {
  if (!isPngBufferValid(buffer)) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
};

const buildDiagramQualityCache = () => {
  if (cachedDiagramQuality) return cachedDiagramQuality;
  const qualityMap = new Map<string, boolean>();

  try {
    const dir = path.join(process.cwd(), "public", "diagrams");
    if (!fs.existsSync(dir)) {
      cachedDiagramQuality = qualityMap;
      return cachedDiagramQuality;
    }

    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
    files.forEach((name) => {
      const fullPath = path.join(dir, name);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) {
          qualityMap.set(name, false);
          return;
        }
        if (stat.size < MIN_PNG_FILE_BYTES) {
          qualityMap.set(name, false);
          return;
        }
        const data = fs.readFileSync(fullPath);
        const dimensions = readPngDimensions(data);
        if (!dimensions) {
          qualityMap.set(name, false);
          return;
        }
        if (dimensions.width < MIN_PNG_WIDTH || dimensions.height < MIN_PNG_HEIGHT) {
          qualityMap.set(name, false);
          return;
        }
        qualityMap.set(name, true);
      } catch {
        qualityMap.set(name, false);
      }
    });
  } catch {
    // noop
  }

  cachedDiagramQuality = qualityMap;
  return cachedDiagramQuality;
};

const isHighQualityDiagramPath = (src: string) => {
  if (!src.startsWith("/diagrams/")) return true;
  const name = src.replace(/^\/diagrams\//, "");
  if (/_ms_/i.test(name)) return false; // prefer question-paper diagrams only
  const qualityMap = buildDiagramQualityCache();
  return qualityMap.get(name) === true;
};

const derivePaperCodes = (
  paperNumber?: number | null,
  variant?: string | null
) => {
  const variantText = String(variant || "").trim().toLowerCase();
  const paperText = paperNumber != null ? String(paperNumber).trim() : "";

  const directTwoDigit = variantText.match(/\b(\d{2})\b/);
  const directOneDigit = variantText.match(/\b(\d)\b/);

  const codes = new Set<string>();
  if (directTwoDigit?.[1]) {
    codes.add(directTwoDigit[1]);
  }
  if (paperText) {
    codes.add(paperText);
  }
  if (paperText && directOneDigit?.[1]) {
    codes.add(`${paperText}${directOneDigit[1]}`);
  }
  return Array.from(codes);
};

const getPublicFileExists = (relativePath: string) => {
  try {
    const clean = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
    const fullPath = path.join(process.cwd(), "public", clean);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
};

const getPaperSpecificDiagrams = ({
  subjectCode,
  year,
  season,
  paperNumber,
  variant,
}: {
  subjectCode: string;
  year?: number | null;
  season?: string | null;
  paperNumber?: number | null;
  variant?: string | null;
}) => {
  const files = getDiagramFiles();
  if (files.length === 0) return [];

  const yy = year ? String(year).slice(-2) : null;
  const seasonCode = toSeasonCode(season);
  const paperCodes = derivePaperCodes(paperNumber, variant);

  const filtered = paperCodes
    .flatMap((paperCode) => {
      const paperPrefix = yy && seasonCode ? `${subjectCode}_${seasonCode}${yy}_qp_${paperCode}` : null;
      if (!paperPrefix) return [];
      return files.filter((name) => name.startsWith(paperPrefix));
    });

  if (filtered.length === 0) return [];

  // Quality guard: skip early cover/header extracts that often contain logos/watermarks.
  const qualityFiltered = filtered.filter((name) => {
    const parsed = parseDiagramName(name);
    const isHighQuality = buildDiagramQualityCache().get(name) === true;
    if (!isHighQuality) return false;
    if (parsed.pageNo == null) return true;
    return parsed.pageNo >= 2;
  });
  const chosen = qualityFiltered.length > 0 ? qualityFiltered : filtered;
  return chosen.map((name) => `/diagrams/${name}`);
};

export const hasResourceReference = (text?: string | null) => {
  if (!text) return false;
  return RESOURCE_REFERENCE_REGEX.test(text);
};

export const isLikelyPlaceholderImage = (src?: string | null) => {
  if (!src) return false;
  return PLACEHOLDER_IMAGES.has(src.trim().toLowerCase());
};

export const isUsableImageSrc = (src?: string | null) => {
  if (!src || typeof src !== "string") return false;
  const value = src.trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith("/")) {
    if (!getPublicFileExists(value)) return false;
    return isHighQualityDiagramPath(value);
  }
  return false;
};

export const getFallbackDiagramForQuestion = (
  questionText: string,
  meta: PaperMeta
): string | null => {
  void questionText;
  const subjectCode = meta.subjectCode || getSubjectCodeFromText(meta.subject);
  if (!subjectCode) return null;
  const pool = getPaperSpecificDiagrams({
    subjectCode,
    year: meta.year,
    season: meta.season,
    paperNumber: meta.paperNumber,
    variant: meta.variant,
  });
  // Strict mode: never guess between multiple candidates.
  if (pool.length === 1) return pool[0];
  return null;
};

export const resolveQuestionImageSrc = (
  currentSrc: string | null | undefined,
  questionText: string,
  meta: PaperMeta
) => {
  const hasReference = hasResourceReference(questionText);
  const isCurrentUsable = isUsableImageSrc(currentSrc);
  const isPlaceholder = isLikelyPlaceholderImage(currentSrc);

  if (isCurrentUsable && !isPlaceholder) {
    return currentSrc as string;
  }

  if (hasReference) {
    const fallback = getFallbackDiagramForQuestion(questionText, meta);
    if (fallback) return fallback;
    // Do not display placeholder images for resource-based questions.
    return null;
  }

  return isCurrentUsable && !isPlaceholder ? (currentSrc as string) : null;
};
