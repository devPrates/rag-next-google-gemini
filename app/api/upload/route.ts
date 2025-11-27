import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/src/pdf/extract";
import { chunkText } from "@/src/embedding/chunk";
import { embedTexts } from "@/src/embedding/generate";
import { getPool, initSchema, toPgVector } from "@/src/db/postgres";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "arquivo obrigatório" }, { status: 400 });
  const buf = Buffer.from(await (file as File).arrayBuffer());
  const text = await extractTextFromPDF(buf);
  const size = parseInt(process.env.CHUNK_SIZE_TOKENS || "800", 10);
  const overlap = parseInt(process.env.CHUNK_OVERLAP_TOKENS || "160", 10);
  const chunks = chunkText(text, size, overlap);
  await initSchema();
  const apiKey = process.env.GOOGLE_API_KEY as string;
  const embModel = process.env.EMBEDDING_MODEL || "text-embedding-004";
  const embeddings = await embedTexts(chunks.map(c => c.content), apiKey, embModel);
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";
  const client = await getPool().connect();
  try {
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const e = embeddings[i];
      await client.query(`insert into ${schema}.rag_chunks (id, content, embedding, metadata) values ($1, $2, $3::vector, $4) on conflict (id) do nothing`, [c.id, c.content, toPgVector(e), c.metadata]);
    }
  } finally {
    client.release();
  }
  return NextResponse.json({ chunks: chunks.length });
}
