import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

import { supabase } from "../supabase/client";
import { env } from "../util/env";
import { buildCitation } from "./citations";
import type { Citation, NelsonChunkMetadata, RetrievedChunk, Source } from "./types";

const embeddings = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_EMBEDDING_MODEL,
});

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: "nelson_textbook_chunks",
  queryName: "match_nelson_textbook_chunks",
});

function toMetadata(value: unknown): NelsonChunkMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as NelsonChunkMetadata;
  }
  return {};
}

function maybeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function retrieveNelsonContext(params: {
  query: string;
  k?: number;
  maxContextChars?: number;
  filter?: Record<string, unknown>;
}): Promise<{
  contextText: string;
  chunks: RetrievedChunk[];
  citations: Citation[];
  sources: Source[];
}> {
  const k = params.k ?? env.RAG_TOP_K;
  const maxContextChars = params.maxContextChars ?? env.RAG_MAX_CONTEXT_CHARS;

  const results = await vectorStore.similaritySearchWithScore(params.query, k, params.filter);

  const chunks: RetrievedChunk[] = [];
  const citations: Citation[] = [];
  const sources: Source[] = [];

  let contextText = "";

  for (const [doc, score] of results) {
    const metadata = toMetadata(doc.metadata);

    const content = doc.pageContent.trim();
    if (!content) continue;

    const citation = buildCitation({ metadata, content });

    const nextBlock = `\n\n[Source] ${citation.inline ?? "[Nelson]"}\n${content}`;
    if ((contextText.length + nextBlock.length) > maxContextChars) break;

    contextText += nextBlock;

    chunks.push({
      content,
      metadata,
      similarity: typeof score === "number" ? score : undefined,
    });

    citations.push(citation);
    sources.push({
      id: citation.id,
      title: citation.title,
      chapter: citation.chapter,
      page: citation.page,
      summary: maybeString(metadata.summary),
      url: citation.url,
      metadata,
    });
  }

  // If retrieval returns nothing, return empty context but keep function stable.
  return {
    contextText: contextText.trim(),
    chunks,
    citations,
    sources,
  };
}
