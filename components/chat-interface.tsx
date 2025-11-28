"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, Send, Loader2, FileQuestion } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  pdfContent: string
  fileName: string
}

export function ChatInterface({ pdfContent, fileName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (pdfContent) {
      setMessages([])
    }
  }, [pdfContent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || !pdfContent) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          pdfContent,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao obter resposta")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
      }
      setMessages((prev) => [...prev, assistantMessage])
      toast.success("Resposta gerada")
    } catch (error) {
      console.error("Erro:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua pergunta.",
      }
      setMessages((prev) => [...prev, errorMessage])
      toast.error("Falha ao obter resposta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Perguntas e Respostas
        </CardTitle>
        <CardDescription>
          {fileName ? `Fazendo perguntas sobre: ${fileName}` : "Aguardando upload de documento"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          {!pdfContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Faça upload de um PDF para começar a conversar</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">Documento carregado! Faça sua primeira pergunta.</p>
              <p className="text-xs text-muted-foreground">Exemplo: &quot;Qual é o tema principal deste documento?&quot;</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pdfContent ? "Faça uma pergunta..." : "Aguardando documento..."}
              disabled={!pdfContent || isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!pdfContent || isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
