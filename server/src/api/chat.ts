import crypto from "node:crypto";

import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

import { completeMistralChat, streamMistralChat } from "../mistral/chat";
import { buildSystemPrompt, buildUserPrompt, type ChatMode } from "../rag/prompt";
import { retrieveNelsonContext } from "../rag/retrieval";
import type { Citation, Source } from "../rag/types";
import { getRecentHistory, insertChatHistory } from "../supabase/chatHistory";
import { env } from "../util/env";
import { logger } from "../util/logger";
import { initSse, sseEvent, sseComment } from "../util/sse";

type StreamPayload =
  | { type: "token"; token: string }
  | { type: "sources"; citations: Citation[]; sources?: Source[] }
  | { type: "evidence"; value: boolean }
  | { type: "done"; message: string; citations?: Citation[]; sources?: Source[] }
  | { type: "error"; message: string };

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatRequestSchema = z
  .object({
    query: z.string().max(4000).optional(),
    prompt: z.string().max(4000).optional(),
    mode: z.enum(["academic", "clinical"]).default("academic"),
    aiStyle: z.enum(["concise", "detailed", "evidence"]).optional(),
    history: z.array(MessageSchema).default([]),
    sessionId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    k: z.number().int().positive().max(20).optional(),
  })
  .refine((v) => Boolean(v.query ?? v.prompt), {
    message: "Either 'query' or 'prompt' is required",
  });

function sanitizeQuery(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function send(res: Parameters<typeof sseEvent>[0], payload: StreamPayload): void {
  sseEvent(res, "message", payload);
}

export const chatRouter = Router();

async function handleChat(req: Request, res: Response) {
  initSse(res);

  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    send(res, { type: "error", message: "Invalid request body" });
    res.end();
    return;
  }

  const query = sanitizeQuery(parsed.data.query ?? parsed.data.prompt ?? "");
  const mode = parsed.data.mode as ChatMode;
  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();
  const userId = parsed.data.userId ?? null;

  const abortController = new AbortController();
  req.on("close", () => abortController.abort());

  sseComment(res, `session=${sessionId}`);

  try {
    const requestHistory = parsed.data.history;

    const dbHistoryRows = requestHistory.length
      ? []
      : env.RAG_HISTORY_TURNS
        ? await getRecentHistory({ sessionId, limit: env.RAG_HISTORY_TURNS })
        : [];

    const dbHistoryMessages = [...dbHistoryRows]
      .reverse()
      .flatMap((h) => [
        { role: "user" as const, content: h.query },
        { role: "assistant" as const, content: h.response },
      ]);

    const historyForModel = requestHistory.length ? requestHistory : dbHistoryMessages;

    const recentUserQueries = historyForModel
      .filter((m) => m.role === "user")
      .slice(-env.RAG_HISTORY_TURNS)
      .map((m) => sanitizeQuery(m.content))
      .filter(Boolean);

    const retrievalQuery = [...recentUserQueries, query].join("\n");

    const { contextText, citations, sources } = await retrieveNelsonContext({
      query: retrievalQuery,
      k: parsed.data.k,
    });

    const finalCitations = uniqueBy(citations, (c) => c.id);
    const finalSources = uniqueBy(sources, (s) => s.id);

    send(res, { type: "sources", citations: finalCitations, sources: finalSources });
    send(res, { type: "evidence", value: finalCitations.length > 0 });

    const system = buildSystemPrompt(mode, parsed.data.aiStyle);
    const userPrompt = buildUserPrompt({ query, contextText, citations: finalCitations });

    const messages = [
      { role: "system" as const, content: system },
      ...historyForModel.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userPrompt },
    ];

    let assistantMessage = "";

    try {
      for await (const token of streamMistralChat({
        messages,
        signal: abortController.signal,
      })) {
        assistantMessage += token;
        send(res, { type: "token", token });
      }
    } catch (streamErr) {
      logger.warn({ err: streamErr }, "mistral stream failed; retrying with non-stream completion");
      assistantMessage = await completeMistralChat({
        messages,
        signal: abortController.signal,
      });

      // Send the non-streamed message as a single token so the UI still updates.
      if (assistantMessage) send(res, { type: "token", token: assistantMessage });
    }

    const finalMessage = assistantMessage.trim();

    send(res, {
      type: "done",
      message: finalMessage,
      citations: finalCitations,
      sources: finalSources,
    });

    await insertChatHistory({
      userId,
      sessionId,
      query,
      response: finalMessage,
      sources: finalSources,
    });

    res.end();
  } catch (err) {
    logger.error({ err }, "chat pipeline failed");
    send(res, {
      type: "error",
      message: "Sorry — I couldn't complete that request right now. Please try again.",
    });
    res.end();
  }
}

chatRouter.post("/chat", handleChat);
chatRouter.post("/rag", handleChat);

chatRouter.get("/history/:sessionId", async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const history = await getRecentHistory({
      sessionId: req.params.sessionId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    });

    res.status(200).json({ sessionId: req.params.sessionId, history });
  } catch (err) {
    logger.error({ err }, "history fetch failed");
    res.status(500).json({ message: "Unable to fetch history" });
  }
});
