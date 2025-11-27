
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [chunks, setChunks] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setChunks(null);
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(String(j?.error || "falha no upload"));
      return;
    }
    const json = await res.json();
    setChunks(json.chunks);
  }

  async function handleQuery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setAnswer("");
    const q = question.trim();
    if (!q) return;
    setMessages(m => [...m, { role: "user", content: q }]);
    const res = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(String(j?.error || "falha na consulta"));
      return;
    }
    const json = await res.json();
    setAnswer(json.answer);
    setMessages(m => [...m, { role: "assistant", content: String(json.answer || "") }]);
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>RAG com Supabase + Google AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleUpload} className="flex items-center gap-3">
            <Input type="file" name="file" accept="application/pdf" required />
            <Button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Enviar"}</Button>
          </form>
          {chunks !== null && <div className="text-sm text-muted-foreground">Chunks inseridos: {chunks}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      <Card className="h-[60vh] flex flex-col">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 grid grid-rows-[1fr_auto] gap-3">
          <ScrollArea className="rounded-md border p-4">
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{m.role === "assistant" ? "AI" : "U"}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] rounded-md px-3 py-2 ${m.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <form onSubmit={handleQuery} className="grid grid-cols-[1fr_auto] gap-3">
            <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Digite sua pergunta" className="min-h-12" />
            <Button type="submit">Enviar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
