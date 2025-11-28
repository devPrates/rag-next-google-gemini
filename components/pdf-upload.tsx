"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface PdfUploadProps {
  onPdfProcessed: (content: string, fileName: string) => void
  fileName: string
}

export function PdfUpload({ onPdfProcessed, fileName }: PdfUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const appendLog = (line: string) => {
    const ts = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${ts}] ${line}`])
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>
      const msg = ce?.detail
      if (typeof msg === "string" && msg.trim().length > 0) {
        appendLog(msg)
      }
    }
    window.addEventListener("app-log", handler as EventListener)
    return () => {
      window.removeEventListener("app-log", handler as EventListener)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são suportados")
      return
    }

    setIsLoading(true)
    setIsProcessed(false)

    try {
      appendLog(`iniciando upload de '${file.name}'`)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        appendLog(`falha no upload: ${String(err?.error || "Erro ao processar PDF")}`)
        throw new Error(String(err?.error || "Erro ao processar PDF"))
      }

      const data = await response.json()
      appendLog(`upload concluído com sucesso`)
      onPdfProcessed("", file.name)
      const inserted = Number(data?.chunks_inserted || 0)
      const total = Number(data?.chunks_total || 0)
      const embModel = String(data?.emb_model || "")
      const embDim = Number(data?.embedding_dim || 0)
      const duplicates = Number(data?.duplicates_total || Math.max(0, total - inserted))
      const extra = duplicates > 0 ? ` (${duplicates} duplicados)` : ""
      toast.success(`PDF processado: ${inserted}/${total} chunks inseridos${extra}`)
      if (embModel) appendLog(`modelo de embedding: ${embModel} (dim=${embDim || "n/d"})`)
      appendLog(`chunks gerados: ${total} | novos inseridos: ${inserted} | duplicados: ${duplicates}`)
      const ids: string[] = Array.isArray(data?.inserted_ids_sample) ? data.inserted_ids_sample : []
      if (ids.length) appendLog(`amostra de ids inseridos: ${ids.join(", ")}`)
      setIsProcessed(true)
    } catch (error) {
      console.error("Erro:", error)
      const msg = error instanceof Error ? error.message : "Erro ao processar o PDF"
      appendLog(`erro: ${msg}`)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [onPdfProcessed])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documento
          </CardTitle>
          <CardDescription>Faça upload de um PDF para começar a fazer perguntas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf"
              onChange={handleChange}
              className="hidden"
              disabled={isLoading}
            />

            <label htmlFor="file-upload" className="flex flex-col items-center gap-3 cursor-pointer">
              {isLoading ? (
                <>
                  <Loader2 className="h-12 w-12 text-accent animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando PDF...</p>
                </>
              ) : isProcessed ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="text-sm font-medium">PDF processado com sucesso!</p>
                  <p className="text-xs text-muted-foreground">{fileName}</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Clique para fazer upload ou arraste o arquivo</p>
                    <p className="text-xs text-muted-foreground">Apenas arquivos PDF</p>
                  </div>
                </>
              )}
            </label>
          </div>

          {isProcessed && (
            <Button
              onClick={() => {
                setIsProcessed(false)
                onPdfProcessed("", "")
              }}
              variant="outline"
              className="w-full"
            >
              Fazer upload de outro PDF
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Logs</CardTitle>
          <CardDescription>Eventos e resultados do processamento</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40 border rounded-md p-3">
            <div className="space-y-1 text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Sem logs ainda</p>
              ) : (
                logs.map((l, i) => (
                  <p key={i} className="font-mono wrap-break-words">
                    {l}
                  </p>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )
}
