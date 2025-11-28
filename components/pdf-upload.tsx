"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react"

interface PdfUploadProps {
  onPdfProcessed: (content: string, fileName: string) => void
  fileName: string
}

export function PdfUpload({ onPdfProcessed, fileName }: PdfUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Por favor, envie apenas arquivos PDF")
      return
    }

    setIsLoading(true)
    setIsProcessed(false)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erro ao processar PDF")
      }

      const data = await response.json()
      onPdfProcessed(data.text, file.name)
      setIsProcessed(true)
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao processar o PDF. Tente novamente.")
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
  )
}
