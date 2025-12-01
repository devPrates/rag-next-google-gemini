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
  isReady?: boolean
}

export function ChatInterface(props: ChatInterfaceProps) {
  const { fileName, isReady } = props
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const log = (line: string) => {
    try {
      const payload = `[query] ${line}`
      window.dispatchEvent(new CustomEvent<string>("app-log", { detail: payload }))
    } catch {}
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (fileName) {
      setMessages([])
    }
  }, [fileName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || !fileName) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      log(`pergunta enviada: '${input.trim()}'`)
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
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
      const cits: Array<{ id: string; score: number }> = Array.isArray(data?.citations)
        ? data.citations.map((c: { id: string; score: number }) => ({ id: c.id, score: c.score }))
        : []
      if (cits.length) {
        const top = cits.slice(0, 3)
        log(`trechos recuperados: ${cits.length}; top scores: ${top.map((t) => t.score.toFixed(3)).join(", ")}`)
        log(`ids citados (amostra): ${top.map((t) => t.id).join(", ")}`)
      } else {
        log("nenhuma citação retornada pela API")
      }
      if (typeof data.answer === "string" && data.answer.trim().toLowerCase() === "não encontrei essa informação") {
        log("resposta retornou fallback por ausência de correspondência direta nos trechos")
      } else {
        log("resposta gerada com base nos trechos recuperados")
      }
    } catch (error) {
      console.error("Erro:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua pergunta.",
      }
      setMessages((prev) => [...prev, errorMessage])
      toast.error("Falha ao obter resposta")
      log("falha ao obter resposta da API de consulta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="grid grid-rows-[auto_1fr_auto] h-[70vh] md:h-[80vh]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Perguntas e Respostas
        </CardTitle>
        <CardDescription>
          {fileName ? `Fazendo perguntas sobre: ${fileName}` : "Aguardando upload de documento"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 min-h-0">
        <ScrollArea className="h-full px-6">
          {!isReady ? (
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
              <div ref={endRef} />
            </div>
          )}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="p-4 border-t bg-card/70 backdrop-blur supports-backdrop-filter:bg-card/60">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isReady ? "Faça uma pergunta..." : "Aguardando documento..."}
              disabled={!isReady || isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!isReady || isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
