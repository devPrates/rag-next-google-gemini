import { embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

type EmbedOptions = {
  taskType?: string;
  outputDimensionality?: number;
};

export async function embedTexts(texts: string[], apiKey: string, model: string, options?: EmbedOptions): Promise<number[][]> {
  const google = createGoogleGenerativeAI({ apiKey });
  const googleOpts: Record<string, number | string> = {};
  if (typeof options?.outputDimensionality === "number") {
    googleOpts.outputDimensionality = options.outputDimensionality;
  }
  if (typeof options?.taskType === "string") {
    googleOpts.taskType = options.taskType;
  }
  const { embeddings } = await embedMany({
    model: google.textEmbedding(model),
    values: texts,
    providerOptions: {
      google: googleOpts,
    },
  });
  return embeddings;
}
