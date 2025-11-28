import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/src/embedding/chunk";
import { embedTexts } from "@/src/embedding/generate";
import { generateAnswer } from "@/src/rag/answer";

export const runtime = "nodejs";

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body?.question || "").trim();
  const pdfContent = String(body?.pdfContent || "").trim();
  if (!question || !pdfContent) {
    return NextResponse.json({ error: "pergunta e pdfContent obrigatórios" }, { status: 400 });
  }
  const size = parseInt(process.env.CHUNK_SIZE_TOKENS || "800", 10);
  const overlap = parseInt(process.env.CHUNK_OVERLAP_TOKENS || "160", 10);
  const chunks = chunkText(pdfContent, size, overlap);
  const apiKey = process.env.GOOGLE_API_KEY as string;
  const embModel = process.env.EMBEDDING_MODEL || "text-embedding-004";
  const chunkEmbeddings = await embedTexts(chunks.map(c => c.content), apiKey, embModel);
  const queryEmb = (await embedTexts([question], apiKey, embModel))[0];
  const scored = chunks.map((c, i) => ({ id: c.id, content: c.content, score: cosine(chunkEmbeddings[i], queryEmb) }));
  const topK = parseInt(process.env.RAG_TOP_K || "8", 10);
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);
  const answer = await generateAnswer(question, top.map(t => ({ id: t.id, content: t.content })));
  return NextResponse.json({ answer });
}
