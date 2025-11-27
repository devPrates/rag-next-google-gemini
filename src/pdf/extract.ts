type PdfParseFn = (b: Buffer) => Promise<{ text?: string }>;

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const mod: unknown = await import("pdf-parse");
  const fn: PdfParseFn = (mod as { default?: PdfParseFn }).default ?? (mod as PdfParseFn);
  const data = await fn(buffer);
  const txt = data.text || "";
  return normalizeText(txt);
}
