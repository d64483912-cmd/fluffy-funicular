import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";

import { parse } from "csv-parse/sync";

import { OpenAIEmbeddings } from "@langchain/openai";

import { supabase } from "../server/src/supabase/client";
import { env } from "../server/src/util/env";

type CsvRow = Record<string, string | undefined>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; baseMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 5;
  const baseMs = opts?.baseMs ?? 500;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const backoff = baseMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
    }
  }

  throw lastErr;
}

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function getRequiredArg(name: string): string {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  throw new Error(`Missing required arg: ${name}`);
}

const csvPath = process.argv.includes("--csv") ? getRequiredArg("--csv") : process.argv[2];
if (!csvPath) {
  // eslint-disable-next-line no-console
  console.error("Usage: tsx scripts/ingest_nelson_chunks.ts --csv path/to/chunks.csv");
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, "utf8");
const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as CsvRow[];

const embeddings = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_EMBEDDING_MODEL,
});

const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE ?? 64);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function asText(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function asNumber(value: string | undefined): number | undefined {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

// eslint-disable-next-line no-console
console.log(`Loaded ${rows.length} CSV rows. Starting ingestion in batches of ${BATCH_SIZE}...`);

let inserted = 0;

for (const batch of chunk(rows, BATCH_SIZE)) {
  const contents = batch.map((r) => (r.content ?? "").trim());

  const vectors = await withRetry(async () => embeddings.embedDocuments(contents));

  const insertRows = batch.map((r, idx) => {
    const baseMetadata = parseJson(r.metadata);
    const metadata: Record<string, unknown> =
      baseMetadata && typeof baseMetadata === "object" && !Array.isArray(baseMetadata)
        ? (baseMetadata as Record<string, unknown>)
        : {};

    const id = asText(r.id) ?? crypto.randomUUID();

    const bookTitle = asText(r.book_title) ?? asText(r.bookTitle) ?? "Nelson";
    const edition = asText(r.edition) ?? asText(r.book_edition);
    const chapterSection = asText(r.chapter_section) ?? asText(r.chapterSection) ?? asText(r.section);
    const category = asText(r.category);
    const summary = asText(r.summary);
    const pageNumber = asNumber(r.page_number ?? r.page);
    const createdAt = asText(r.created_at) ?? asText(r.createdAt);

    metadata.id = id;
    metadata.book_title = bookTitle;
    if (edition) metadata.edition = edition;
    if (chapterSection) metadata.chapter_section = chapterSection;
    if (category) metadata.category = category;
    if (summary) metadata.summary = summary;
    if (pageNumber !== undefined) metadata.page_number = pageNumber;

    const embedding = vectors[idx];
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error(`Unexpected embedding length: ${Array.isArray(embedding) ? embedding.length : "not-array"}`);
    }

    return {
      id,
      book_title: bookTitle,
      edition,
      chapter_section: chapterSection,
      content: (r.content ?? "").trim(),
      summary,
      category,
      embedding,
      created_at: createdAt ?? undefined,
      metadata,
    };
  });

  await withRetry(async () => {
    const { error } = await supabase
      .from("nelson_textbook_chunks")
      .upsert(insertRows, { onConflict: "id" });
    if (error) throw error;
  });

  inserted += insertRows.length;
  // eslint-disable-next-line no-console
  console.log(`Inserted ${inserted}/${rows.length}`);

  await sleep(150);
}

// eslint-disable-next-line no-console
console.log("Ingestion complete.");
