import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/src/rag/hybridSearch";
import { generateAnswer } from "@/src/rag/answer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const question = String(body?.question || "").trim();
  if (!question) return NextResponse.json({ error: "pergunta obrigatória" }, { status: 400 });
  const topK = parseInt(process.env.RAG_TOP_K || "8", 10);
  const results = await hybridSearch(question, topK);
  const answer = await generateAnswer(question, results.map(r => ({ id: r.id, content: r.content })));
  return NextResponse.json({ answer, citations: results.map(r => ({ id: r.id, metadata: r.metadata, score: r.score })) });
}
