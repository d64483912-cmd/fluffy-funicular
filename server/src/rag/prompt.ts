import type { Citation } from "./types";

export type ChatMode = "academic" | "clinical";

export type AIStyle = "concise" | "detailed" | "evidence";

export function buildSystemPrompt(mode: ChatMode, aiStyle?: AIStyle): string {
  const base =
    "You are Nelson-GPT, a pediatric clinical knowledge assistant. " +
    "Use ONLY the provided Nelson Textbook context when making factual claims. " +
    "If the context is insufficient, say so and ask a clarifying question. " +
    "Always include concise inline citations in the format [Nelson, Ch. X, p. Y] when supported by context.";

  const style =
    aiStyle === "concise"
      ? "\n\nStyle: Be concise."
      : aiStyle === "detailed"
        ? "\n\nStyle: Be detailed and step-by-step."
        : aiStyle === "evidence"
          ? "\n\nStyle: Be evidence-forward and explicitly tie claims to citations."
          : "";

  if (mode === "clinical") {
    return (
      base +
      style +
      "\n\nMode: Clinical. Prioritize actionable differentials, red flags, and management steps, " +
      "but never replace clinical judgment."
    );
  }

  return base + style + "\n\nMode: Academic. Prioritize definitions, mechanisms, and structured explanations.";
}

export function buildUserPrompt(params: {
  query: string;
  contextText: string;
  citations: Citation[];
}): string {
  const citationHint = params.citations.length
    ? `Available citations: ${params.citations
        .map((c) => c.inline ?? `[${c.title}${c.chapter ? `, ${c.chapter}` : ""}${c.page ? `, p. ${c.page}` : ""}]`)
        .join(" ")}`
    : "No citations available.";

  return [
    "Nelson Textbook context:",
    params.contextText ? params.contextText : "(no context retrieved)",
    "\nUser question:",
    params.query,
    "\nCitation reminder:",
    citationHint,
  ].join("\n");
}
