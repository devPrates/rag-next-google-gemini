type ChunkInput = { id: string; content: string };

function buildPrompt(question: string, chunks: ChunkInput[]): string {
  const header = "Você é um assistente especializado em responder baseado APENAS no contexto abaixo. Se não souber, diga 'não encontrei essa informação'.";
  const ctx = chunks.map((c, i) => `Contexto ${i + 1} (id ${c.id}):\n${c.content}`).join("\n\n");
  const q = `Pergunta: ${question}`;
  return [header, ctx, q].join("\n\n");
}

export async function generateAnswer(question: string, chunks: ChunkInput[]): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY as string;
  const model = process.env.GENERATION_MODEL || "gemini-1.5-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const prompt = buildPrompt(question, chunks);
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`generateContent failed ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}
