import type { EvaluationInput, EvaluationOutput } from "./evaluation-pipeline";

type OcrExtractor = (fileBuffer: Buffer, mimeType: string) => Promise<{
  text: string;
  confidence: number;
}>;

export type OcrEvaluationInput = {
  fileBuffer: Buffer;
  mimeType: string;
  evaluationInput: Omit<EvaluationInput, "studentAnswer">;
};

export type OcrEvaluationOutput = {
  ocrText: string;
  ocrConfidence: number;
  evaluation: EvaluationOutput;
};

export async function runOcrEvaluationPipeline(
  input: OcrEvaluationInput,
  extractOcr: OcrExtractor,
  evaluateTextAnswer: (payload: EvaluationInput) => Promise<EvaluationOutput>
): Promise<OcrEvaluationOutput> {
  const ocr = await extractOcr(input.fileBuffer, input.mimeType);
  const extractedText = String(ocr.text || "").trim();

  const evaluation = await evaluateTextAnswer({
    ...input.evaluationInput,
    studentAnswer: extractedText,
  });

  return {
    ocrText: extractedText,
    ocrConfidence: ocr.confidence,
    evaluation,
  };
}
