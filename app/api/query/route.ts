import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/src/rag/hybridSearch";
import { generateAnswer } from "@/src/rag/answer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    if (!question) return NextResponse.json({ error: "pergunta obrigatória" }, { status: 400 });
    const missing: string[] = []
    if (!process.env.GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY")
    if (!process.env.SUPABASE_DB_URL) missing.push("SUPABASE_DB_URL")
    if (missing.length) {
      return NextResponse.json({ error: `variáveis ausentes: ${missing.join(", ")}` }, { status: 400 })
    }
    const topK = parseInt(process.env.RAG_TOP_K || "10", 10);
    const results = await hybridSearch(question, topK);
    const answer = await generateAnswer(question, results.map(r => ({ id: r.id, content: r.content })));
    return NextResponse.json({ answer, citations: results.map(r => ({ id: r.id, metadata: r.metadata, score: r.score })) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
