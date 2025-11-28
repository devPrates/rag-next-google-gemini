import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.SUPABASE_DB_URL as string;
    if (!url) {
      throw new Error("SUPABASE_DB_URL não configurado")
    }
    pool = new Pool({ connectionString: url, max: 4 });
  }
  return pool;
}

export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function initSchema(): Promise<void> {
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";
  const dim = parseInt(process.env.EMBEDDING_DIM || "768", 10);
  const client = await getPool().connect();
  try {
    await client.query("create extension if not exists vector");
    await client.query(`create table if not exists ${schema}.rag_chunks (id uuid primary key, content text not null, embedding vector(${dim}) not null, metadata jsonb)`);
    await client.query(`alter table ${schema}.rag_chunks add column if not exists content_hash text`);
    await client.query(`create unique index if not exists rag_chunks_content_hash_idx on ${schema}.rag_chunks (content_hash)`);
    const resDim = await client.query(
      "select format_type(a.atttypid, a.atttypmod) as t from pg_attribute a join pg_class c on a.attrelid=c.oid join pg_namespace n on c.relnamespace=n.oid where c.relname=$1 and n.nspname=$2 and a.attname='embedding'",
      ["rag_chunks", schema]
    );
    const typeText = (resDim.rows?.[0]?.t as string | undefined) || undefined;
    if (typeText && typeText.startsWith("vector(")) {
      const curDim = parseInt(typeText.slice(7, -1), 10);
      if (curDim !== dim) {
        const countRes = await client.query(`select count(*)::int as c from ${schema}.rag_chunks`);
        const rowCount = (countRes.rows?.[0]?.c as number | undefined) ?? 0;
        if (rowCount === 0) {
          await client.query(`alter table ${schema}.rag_chunks alter column embedding type vector(${dim})`);
        } else {
          throw new Error(`dimensão existente ${curDim} difere de EMBEDDING_DIM=${dim}`);
        }
      }
    }
    if (dim <= 2000) {
      await client.query(`create index if not exists rag_chunks_embedding_ivfflat_idx on ${schema}.rag_chunks using ivfflat (embedding vector_cosine_ops)`);
    } else {
      try {
        await client.query(`create index if not exists rag_chunks_embedding_hnsw_idx on ${schema}.rag_chunks using hnsw (embedding vector_cosine_ops)`);
      } catch {
        // Sem índice quando dimensão > 2000 e hnsw indisponível
      }
    }
    await client.query(`create index if not exists rag_chunks_tsv_idx on ${schema}.rag_chunks using gin (to_tsvector('portuguese', content))`);
    await client.query(`analyze ${schema}.rag_chunks`);
  } finally {
    client.release();
  }
}
