"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  question: any;
  className?: string;
};

type TableModel = {
  headers: string[];
  rows: string[][];
};

type ChartPoint = {
  label: string;
  value: number;
};

const RESOURCE_NOTE_REGEX = /\[(?:table|figure|diagram|image)[^\]]*\]/gi;
const IMPLICIT_RESOURCE_TEXT_REGEX = /\b(table|figure|diagram|image|map|graph|chart)\b/i;
const CHART_REQUEST_REGEX = /\b(plot|draw|construct|bar chart|line graph|graph|chart)\b/i;

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractResourceNotes(text?: string): string[] {
  if (!isString(text)) return [];
  const matches = text.match(RESOURCE_NOTE_REGEX) || [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

export function stripResourceNotes(text?: string): string {
  if (!isString(text)) return "";
  return text.replace(RESOURCE_NOTE_REGEX, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extractImageSources(question: any): string[] {
  if (!question || typeof question !== "object") return [];

  const sources: string[] = [];
  const singleKeys = ["imageSrc", "fallbackImageSrc", "image", "imageUrl", "diagram", "diagramUrl", "figure", "figureUrl"];
  const listKeys = ["images", "imageUrls", "diagrams", "diagramUrls", "figures"];

  for (const key of singleKeys) {
    const value = question[key];
    if (isString(value)) sources.push(value.trim());
  }

  for (const key of listKeys) {
    const value = question[key];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (isString(item)) sources.push(item.trim());
      });
    }
  }

  if (question.assets && typeof question.assets === "object") {
    const assets = question.assets as Record<string, unknown>;
    const imageLike = assets.images;
    if (Array.isArray(imageLike)) {
      imageLike.forEach((item) => {
        if (isString(item)) sources.push(item.trim());
      });
    }
  }

  return Array.from(new Set(sources));
}

function normalizeTable(raw: unknown): TableModel | null {
  if (!raw) return null;

  if (Array.isArray(raw) && raw.length > 0) {
    if (Array.isArray(raw[0])) {
      const rows = raw as unknown[][];
      const firstRow = rows[0].map((cell) => String(cell ?? ""));
      const body = rows.slice(1).map((row) => row.map((cell) => String(cell ?? "")));
      return { headers: firstRow, rows: body };
    }

    if (typeof raw[0] === "object" && raw[0] !== null) {
      const dictRows = raw as Record<string, unknown>[];
      const headers = Object.keys(dictRows[0]);
      const rows = dictRows.map((row) => headers.map((h) => String(row[h] ?? "")));
      return { headers, rows };
    }
  }

  if (typeof raw === "object" && raw !== null) {
    const table = raw as Record<string, unknown>;
    const headers = Array.isArray(table.headers)
      ? table.headers.map((h) => String(h ?? ""))
      : Array.isArray(table.columns)
        ? table.columns.map((h) => String(h ?? ""))
        : [];
    const sourceRows = Array.isArray(table.rows)
      ? table.rows
      : Array.isArray(table.data)
        ? table.data
        : [];

    if (headers.length > 0 && sourceRows.length > 0) {
      const rows = sourceRows.map((row) => {
        if (Array.isArray(row)) return row.map((cell) => String(cell ?? ""));
        if (typeof row === "object" && row !== null) {
          const rowObj = row as Record<string, unknown>;
          return headers.map((h) => String(rowObj[h] ?? ""));
        }
        return [String(row ?? "")];
      });
      return { headers, rows };
    }
  }

  return null;
}

function extractTable(question: any): TableModel | null {
  if (!question || typeof question !== "object") return null;

  const candidates = [question.table, question.tableData, question.tables, question.dataTable];
  for (const candidate of candidates) {
    const table = normalizeTable(candidate);
    if (table) return table;
  }
  return null;
}

function extractChartPointsFromText(text?: string): ChartPoint[] {
  if (!isString(text) || !CHART_REQUEST_REGEX.test(text)) return [];

  const matches = Array.from(text.matchAll(/([A-Za-z0-9 .()%/-]{2,20})\s*:\s*(-?\d+(?:\.\d+)?)/g));
  const points = matches
    .map((m) => ({
      label: m[1].trim(),
      value: Number(m[2]),
    }))
    .filter((p) => Number.isFinite(p.value));

  if (points.length < 3) return [];
  return points;
}

function GeneratedChart({ points }: { points: ChartPoint[] }) {
  const width = 760;
  const height = 320;
  const margin = { top: 20, right: 20, bottom: 55, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const barGap = 16;
  const barWidth = Math.max(20, (innerW - barGap * (points.length - 1)) / points.length);

  return (
    <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/40 p-3">
      <p className="text-xs font-bold text-sky-700 mb-2">Auto-generated chart from question data</p>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px]">
          <line
            x1={margin.left}
            y1={margin.top + innerH}
            x2={margin.left + innerW}
            y2={margin.top + innerH}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerH}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {points.map((point, i) => {
            const x = margin.left + i * (barWidth + barGap);
            const barH = (point.value / maxValue) * (innerH - 10);
            const y = margin.top + innerH - barH;
            return (
              <g key={`${point.label}-${i}`}>
                <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill="#3b82f6" />
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#334155">
                  {point.value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={margin.top + innerH + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function QuestionResources({ question, className = "" }: Props) {
  const text = isString(question?.question) ? question.question : question?.text;
  const notes = extractResourceNotes(text);
  const allImages = extractImageSources(question);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [lowQualityImages, setLowQualityImages] = useState<string[]>([]);
  useEffect(() => {
    setFailedImages([]);
    setLowQualityImages([]);
  }, [question?.id, question?.question, question?.text]);
  const images = useMemo(
    () => allImages.filter((src) => !failedImages.includes(src) && !lowQualityImages.includes(src)),
    [allImages, failedImages, lowQualityImages]
  );
  const table = extractTable(question);
  const chartPoints = extractChartPointsFromText(text);
  const mentionsResourceInText = isString(text) ? IMPLICIT_RESOURCE_TEXT_REGEX.test(text) : false;
  const showMissingResourceHint = mentionsResourceInText && images.length === 0 && !table && chartPoints.length === 0;

  if (images.length === 0 && !table && chartPoints.length === 0 && notes.length === 0 && !showMissingResourceHint) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {images.map((src, i) => (
        <div key={`${src}-${i}`} className="relative w-full h-72 sm:h-80 rounded-2xl border-2 border-gray-100 bg-white overflow-hidden">
          <span className="absolute top-3 left-3 z-10 rounded-full bg-blue-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            Figure {i + 1}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Question resource ${i + 1}`}
            className="w-full h-full object-contain p-3"
            loading="lazy"
            onLoad={(event) => {
              const img = event.currentTarget;
              const tooSmall = img.naturalWidth < 120 || img.naturalHeight < 60;
              if (tooSmall) {
                setLowQualityImages((prev) => (prev.includes(src) ? prev : [...prev, src]));
              }
            }}
            onError={() => {
              setFailedImages((prev) => (prev.includes(src) ? prev : [...prev, src]));
            }}
          />
        </div>
      ))}

      {table && (
        <div className="rounded-2xl border-2 border-gray-100 overflow-hidden bg-white">
          <div className="px-3 py-2 border-b border-gray-100 bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-700">
            Table
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {table.headers.map((header, i) => (
                    <th key={`${header}-${i}`} className="text-left px-3 py-2 font-bold text-gray-700 border-b border-gray-100">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIndex) => (
                  <tr key={rIndex} className="odd:bg-white even:bg-gray-50/50">
                    {row.map((cell, cIndex) => (
                      <td key={cIndex} className="px-3 py-2 text-gray-700 border-b border-gray-100 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chartPoints.length > 0 && <GeneratedChart points={chartPoints} />}

      {(notes.length > 0 || showMissingResourceHint) && !table && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-medium">
          {notes.length > 0
            ? notes.join(" ")
            : "This question references a diagram/table, but no linked resource was found yet."}
        </div>
      )}
    </div>
  );
}
