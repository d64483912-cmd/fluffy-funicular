import { env } from "../util/env";
import { mistral, type MistralChatMessage } from "./client";

function extractDeltaContent(event: unknown): string | undefined {
  if (!event || typeof event !== "object") return undefined;

  const e = event as Record<string, unknown>;
  const data = (e.data ?? e) as Record<string, unknown>;
  const choices = data.choices;

  if (!Array.isArray(choices) || choices.length === 0) return undefined;

  const first = choices[0] as Record<string, unknown>;
  const delta = first.delta as Record<string, unknown> | undefined;
  const content = delta?.content;

  return typeof content === "string" ? content : undefined;
}

export async function* streamMistralChat(params: {
  messages: MistralChatMessage[];
  model?: string;
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const stream = await mistral.chat.stream({
    model: params.model ?? env.MISTRAL_MODEL,
    messages: params.messages,
    signal: params.signal,
  } as unknown as Record<string, unknown>);

  for await (const event of stream as AsyncIterable<unknown>) {
    const token = extractDeltaContent(event);
    if (token) yield token;
  }
}

export async function completeMistralChat(params: {
  messages: MistralChatMessage[];
  model?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const response = await mistral.chat.complete({
    model: params.model ?? env.MISTRAL_MODEL,
    messages: params.messages,
    signal: params.signal,
  } as unknown as Record<string, unknown>);

  const content = (response as any)?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
  }

  return "";
}
