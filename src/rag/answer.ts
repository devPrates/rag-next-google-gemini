type ChunkInput = { id: string; content: string };

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}

function buildPrompt(question: string, chunks: ChunkInput[]): string {
  const header = [
    "Responda em português brasileiro com base APENAS nos trechos abaixo.",
    "Forneça uma resposta curta porém completa (até 4 frases).",
    "Não mencione ids, rótulos ou as palavras 'Contexto'/'chunk' na resposta.",
    "Se perguntado sobre tema/assunto, identifique o tema principal e explique em poucas frases.",
    "Se não houver resposta direta, resuma o que os trechos relacionados indicam sem inventar.",
    "Se a pergunta começar com 'quantos', retorne um número e breve explicação.",
    "Finalize a última frase com ponto final.",
  ].join(" ");
  const maxCtx = parseInt(process.env.MAX_CONTEXT_CHARS || "6000", 10);
  const perChunk = Math.floor(maxCtx / Math.max(chunks.length, 1));
  const ctx = chunks
    .map((c, i) => `Trecho ${i + 1}:\n${truncate(c.content, perChunk)}`)
    .join("\n\n---\n\n");
  const q = `Pergunta: ${question}\nResposta:`;
  return [header, ctx, q].join("\n\n");
}

function cleanAnswer(text: string): string {
  const lines = text.split("\n").map((l) => l.trim());
  const filtered = lines.filter((l) => {
    const hasId = /\(id\s+[0-9a-f\-]+\)/i.test(l);
    const startsContext = /^\s*(no\s*)?contexto\b/i.test(l);
    return !hasId && !startsContext;
  });
  const out = filtered.join("\n").trim();
  const candidate = out.length > 0 ? out : text.trim();
  const incomplete = /[,;:]\s*$/.test(candidate) || /de acordo com os trechos fornecidos\s*$/i.test(candidate);
  if (incomplete) return "";
  return candidate;
}

export async function generateAnswer(question: string, chunks: ChunkInput[]): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY as string;
  const modelId = process.env.GENERATION_MODEL || "gemini-2.0-flash";
  const prompt = buildPrompt(question, chunks);
  const maxOut = parseInt(process.env.MAX_OUTPUT_TOKENS || "768", 10);

  const { generateText } = await import("ai");
  const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
  const google = createGoogleGenerativeAI({ apiKey });
  const tryModels = [modelId, "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastErr: unknown;
  for (const m of tryModels) {
    try {
      const result = await generateText({ model: google(m), prompt, maxOutputTokens: maxOut, temperature: 0.2 });
      const text = cleanAnswer((result.text || "").trim());
      if (text.length > 0) return text;
      lastErr = new Error("modelo retornou resposta vazia");
    } catch (e) {
      lastErr = e;
    }
  }
  const fallback = "não encontrei essa informação";
  return fallback;
}
