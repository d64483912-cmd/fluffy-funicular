import { supabase } from "./client";

export type ChatHistoryRow = {
  id: string;
  user_id: string | null;
  session_id: string;
  query: string;
  response: string;
  sources: unknown;
  created_at: string;
};

export async function getRecentHistory(params: {
  sessionId: string;
  limit: number;
}): Promise<ChatHistoryRow[]> {
  const { data, error } = await supabase
    .from("chat_history")
    .select("*")
    .eq("session_id", params.sessionId)
    .order("created_at", { ascending: false })
    .limit(params.limit);

  if (error) throw error;
  return data ?? [];
}

export async function insertChatHistory(params: {
  userId?: string | null;
  sessionId: string;
  query: string;
  response: string;
  sources: unknown;
}): Promise<void> {
  const { error } = await supabase.from("chat_history").insert({
    user_id: params.userId ?? null,
    session_id: params.sessionId,
    query: params.query,
    response: params.response,
    sources: params.sources,
  });

  if (error) throw error;
}
