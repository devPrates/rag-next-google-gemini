
"use client";

import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PdfUpload } from "@/components/pdf-upload";
import { ChatInterface } from "@/components/chat-interface";

export default function Home() {
  const [pdfContent, setPdfContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <FileText className="h-8 w-8 text-accent" />
                <Sparkles className="h-4 w-4 text-accent absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">RAG Document Assistant</h1>
                <p className="text-sm text-muted-foreground">Pergunte qualquer coisa sobre seus PDFs</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <PdfUpload
            onPdfProcessed={(content, name) => {
              setPdfContent(content);
              setFileName(name);
            }}
            fileName={fileName}
          />

          <ChatInterface pdfContent={pdfContent} fileName={fileName} />
        </div>
      </div>
    </main>
  );
}
