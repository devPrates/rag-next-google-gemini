type EmbeddingResponse = { embedding: number[] };

async function embedContent(apiKey: string, model: string, text: string): Promise<EmbeddingResponse> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:embedContent`;
  const body = {
    model,
    content: { parts: [{ text }] },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`embedContent failed ${res.status}`);
  const json = await res.json();
  const values: number[] = json?.embedding?.value || json?.embedding?.values || json?.embeddings?.[0]?.values || [];
  return { embedding: values };
}

export async function embedTexts(texts: string[], apiKey: string, model: string): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    const r = await embedContent(apiKey, model, t);
    out.push(r.embedding);
  }
  return out;
}
