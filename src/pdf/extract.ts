 

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const mod = await import("pdf2json");
  type PDFParserConstructor = new (opt?: unknown, v?: number) => {
    on(event: string, handler: (...args: unknown[]) => void): void;
    parseBuffer(buf: Buffer): void;
    getRawTextContent?: () => string;
  };
  const ParserCtor = ((mod as { default?: unknown }).default ?? (mod as unknown)) as PDFParserConstructor;
  const parser = new ParserCtor(undefined, 1);
  const text: string = await new Promise((resolve, reject) => {
    parser.on("pdfParser_dataError", (err: unknown) => {
      const msg = (err as { parserError?: { message?: string } } | undefined)?.parserError?.message || String((err as { parserError?: unknown } | undefined)?.parserError || err || "erro ao parsear PDF");
      reject(new Error(msg));
    });
    parser.on("pdfParser_dataReady", () => {
      try {
        const raw = typeof parser.getRawTextContent === "function" ? parser.getRawTextContent() : "";
        resolve(raw);
      } catch (e) {
        reject(e as Error);
      }
    });
    parser.parseBuffer(buffer);
  });
  return normalizeText(text);
}
