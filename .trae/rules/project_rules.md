# Project Rules --- RAG Pipeline with Supabase + Google AI

## 1. Objetivo do Projeto

Criar um sistema capaz de: 1. Receber upload de PDFs. 2. Extrair texto
do PDF. 3. Gerar embeddings e salvar chunks no Supabase (pgvector). 4.
Realizar busca híbrida (semântica + palavra-chave). 5. Chamar a LLM do
Google para montar a resposta final ao usuário.

## 2. Fluxo Geral do Sistema

1.  **Upload do PDF**
    -   O usuário envia um PDF.
    -   O sistema armazena temporariamente ou processa diretamente.
2.  **Extração do Texto**
    -   Utilizar biblioteca de parsing (pdf-parse, pdfjs-dist, pdf-lib
        ou backend Java/Python).
    -   O texto deve ser normalizado (quebras, espaços, caracteres
        especiais).
3.  **Chunking**
    -   Tamanho recomendado: 500--1200 tokens.
    -   Sobreposição recomendada: 15--20%.
    -   Cada chunk deve conter:
        -   id
        -   conteúdo
        -   metadados (página, título, seção, timestamps etc.)
4.  **Geração de Embeddings**
    -   Utilizar modelo do Google para embeddings (caso tenha custo
        zero, use modelos embedding gratuitos).
    -   Salvar no Supabase (pgvector) com:
        -   id
        -   texto do chunk
        -   vetor
        -   metadados
5.  **Armazenamento**
    -   Estrutura da tabela:
        -   `id uuid`
        -   `content text`
        -   `embedding vector`
        -   `metadata jsonb`
6.  **Busca Híbrida**
    -   Semantic search: cosinesim via pgvector (`<->`).
    -   Keyword search: `tsvector` ou ILIKE.
    -   Combinar resultados:
        -   peso recomendável: **0.7 semântica + 0.3 keyword**
7.  **Montagem do Prompt para a LLM**
    -   Incluir:

        -   Pergunta original
        -   Top N chunks relevantes (recomendado 5--10)
        -   Instruções para não alucinar
        -   Tempo máximo de resposta

    -   Exemplo:

            Você é um assistente especializado em responder baseado APENAS no contexto abaixo.
            Se não souber, diga “não encontrei essa informação”.
8.  **Resposta Final**
    -   A LLM do Google deve:
        -   Consolidar a resposta
        -   Citar trechos do contexto quando aplicável
        -   Nunca inventar conteúdo fora do contexto

## 3. Regras de Desenvolvimento

-   Nunca enviar chunks irrelevantes para a LLM.
-   Garantir que todos os textos são normalizados antes de gerar
    embeddings.
-   Realizar logs do processo de chunking e geração.
-   Versionar o esquema SQL do Supabase.
-   Nunca armazenar PDFs originais sem consentimento.
-   Manter camada de autenticação obrigatória no sistema.
-   Logs não podem conter conteúdo sensível dos PDFs.

## 4. Boas Práticas

-   Sempre testar semantic search com perguntas reais.
-   Monitorar embeddings duplicados.
-   Evitar chunks muito pequenos.
-   Fazer fallback para keyword caso embeddings não retornem resultados.
-   Testar pelo menos dois modelos de embeddings.

## 5. Estrutura Recomendada de Pastas

    /src
      /pdf
        extract.ts
      /embedding
        generate.ts
        chunk.ts
      /db
        supabase.ts
      /rag
        retriever.ts
        hybridSearch.ts
        answer.ts
      /api
        upload.ts
        query.ts

## 6. Pontos Importantes

-   Todo erro deve retornar mensagens amigáveis.
-   O pipeline deve ser desacoplado e modular.
-   Evitar dependência inteira do front-end para o processo de chunking.
