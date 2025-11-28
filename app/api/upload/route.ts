import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/src/pdf/extract";
import { chunkText } from "@/src/embedding/chunk";
import { embedTexts } from "@/src/embedding/generate";
import { getPool, initSchema, toPgVector } from "@/src/db/postgres";
import { createHash } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const missing: string[] = []
    if (!process.env.GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY")
    if (!process.env.SUPABASE_DB_URL) missing.push("SUPABASE_DB_URL")
    if (missing.length) {
      return NextResponse.json({ error: `variáveis ausentes: ${missing.join(", ")}` }, { status: 400 })
    }
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
    const embModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
    const hashes = chunks.map(c => createHash("sha256").update(c.content).digest("hex"));
    const schema = process.env.SUPABASE_DB_SCHEMA || "public";
    const client = await getPool().connect();
    let existing: Set<string> = new Set();
    try {
      const res = await client.query(`select content_hash from ${schema}.rag_chunks where content_hash = any($1)`, [hashes]);
      existing = new Set(res.rows.map((r: { content_hash: string }) => r.content_hash));
    } finally {
      client.release();
    }
    const toInsert = chunks.filter((_, i) => !existing.has(hashes[i]));
    const dim = parseInt(process.env.EMBEDDING_DIM || "768", 10);
    const embeddings = await embedTexts(
      toInsert.map(c => c.content),
      apiKey,
      embModel,
      { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: dim }
    );
    const client2 = await getPool().connect();
    const insertedIds: string[] = [];
    try {
      for (let i = 0; i < toInsert.length; i++) {
        const c = toInsert[i];
        const e = embeddings[i];
        const h = createHash("sha256").update(c.content).digest("hex");
        await client2.query(`insert into ${schema}.rag_chunks (id, content, embedding, metadata, content_hash) values ($1, $2, $3::vector, $4, $5) on conflict (content_hash) do nothing`, [c.id, c.content, toPgVector(e), c.metadata, h]);
        if (insertedIds.length < 10) insertedIds.push(c.id);
      }
    } finally {
      client2.release();
    }
    return NextResponse.json({
      chunks_total: chunks.length,
      chunks_inserted: toInsert.length,
      duplicates_total: chunks.length - toInsert.length,
      emb_model: embModel,
      embedding_dim: dim,
      inserted_ids_sample: insertedIds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
