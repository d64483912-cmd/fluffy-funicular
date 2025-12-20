import crypto from "node:crypto";

import type { Citation, NelsonChunkMetadata } from "./types";

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function makeDeterministicId(input: Record<string, unknown>): string {
  return crypto.createHash("sha1").update(JSON.stringify(input)).digest("hex");
}

export function buildCitation(params: { metadata: NelsonChunkMetadata; content: string }): Citation {
  const { metadata, content } = params;

  const title = asString(metadata.book_title) ?? "Nelson";
  const edition = asString(metadata.edition);
  const chapter = asString(metadata.chapter_section);
  const pageNumber = asNumber(metadata.page_number);
  const page = pageNumber !== undefined ? String(pageNumber) : undefined;

  const url = asString(metadata.url) ?? asString(metadata.source_url);

  const snippet =
    asString(metadata.snippet) ??
    asString(metadata.summary) ??
    content.trim().slice(0, 220);

  const id =
    asString(metadata.id) ??
    asString(metadata.chunk_id) ??
    makeDeterministicId({ title, edition, chapter, page, snippet });

  const inlineParts: string[] = [title];
  if (chapter) inlineParts.push(chapter);
  if (page) inlineParts.push(`p. ${page}`);

  return {
    id,
    title: edition ? `${title} (${edition})` : title,
    chapter,
    page,
    snippet,
    url,
    inline: `[${inlineParts.join(", ")}]`,
  };
}
