import { Mistral } from "@mistralai/mistralai";

import { env } from "../util/env";

export const mistral = new Mistral({
  apiKey: env.MISTRAL_API_KEY,
});

export type MistralChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
