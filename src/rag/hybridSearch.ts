import { getPool, toPgVector } from "@/src/db/postgres";
import { embedTexts } from "@/src/embedding/generate";

export type RetrievedChunk = { id: string; content: string; metadata: Record<string, unknown>; score: number };

export async function hybridSearch(queryText: string, topK: number): Promise<RetrievedChunk[]> {
  const apiKey = process.env.GOOGLE_API_KEY as string;
  const embModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
  const dim = parseInt(process.env.EMBEDDING_DIM || "768", 10);
  const qEmb = (await embedTexts([queryText], apiKey, embModel, { taskType: "QUESTION_ANSWERING", outputDimensionality: dim }))[0];
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";
  const semW = 0.85;
  const kwW = 0.15;
  const client = await getPool().connect();
  try {
    const sql = `
      with q as (select $1::vector as v, $2::text as qtxt)
      select id, content, metadata,
        ((1.0 / (1.0 + (embedding <=> (select v from q)))) * ${semW}) +
        (coalesce(ts_rank(to_tsvector('portuguese', content), websearch_to_tsquery((select qtxt from q))), 0) * ${kwW}) as score
      from ${schema}.rag_chunks
      order by score desc
      limit $3
    `;
    const res = await client.query(sql, [toPgVector(qEmb), queryText, topK]);
    return res.rows as RetrievedChunk[];
  } finally {
    client.release();
  }
}
