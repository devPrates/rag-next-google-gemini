import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.SUPABASE_DB_URL as string;
    pool = new Pool({ connectionString: url, max: 4 });
  }
  return pool;
}

export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function initSchema(): Promise<void> {
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";
  const dim = parseInt(process.env.EMBEDDING_DIM || "3072", 10);
  const client = await getPool().connect();
  try {
    await client.query("create extension if not exists vector");
    await client.query(`create table if not exists ${schema}.rag_chunks (id uuid primary key, content text not null, embedding vector(${dim}) not null, metadata jsonb)`);
    await client.query(`create index if not exists rag_chunks_embedding_idx on ${schema}.rag_chunks using ivfflat (embedding vector_cosine_ops)`);
    await client.query(`create index if not exists rag_chunks_tsv_idx on ${schema}.rag_chunks using gin (to_tsvector('portuguese', content))`);
  } finally {
    client.release();
  }
}
