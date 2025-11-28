import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/src/pdf/extract";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "arquivo PDF obrigatório" }, { status: 400 });
  }
  const buf = Buffer.from(await (file as File).arrayBuffer());
  const text = await extractTextFromPDF(buf);
  return NextResponse.json({ text });
}
