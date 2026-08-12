import { appConfig } from "@/lib/env";
import type { ChatMessage, LLMProvider } from "./types";

function extractJson(text: string): unknown {
  // Strip markdown fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[{\[]/);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start < 0 || end < 0) throw new Error("No JSON found in LLM response");
  return JSON.parse(candidate.slice(start, end + 1));
}

export class OpenAILLM implements LLMProvider {
  name = "OpenAI Compatible";
  kind = "openai";

  private key: string;

  constructor() {
    this.key = appConfig.openaiApiKey;
  }

  async complete(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.key) throw new Error("OPENAI_API_KEY not configured");
    const res = await fetch(`${appConfig.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: appConfig.openaiLlmModel,
        messages,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 4000,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");
    return content;
  }

  async completeJson<T>(messages: ChatMessage[], opts?: { temperature?: number }): Promise<T> {
    const text = await this.complete(
      [
        ...messages,
        {
          role: "user",
          content:
            "Respond ONLY with valid JSON. No markdown, no commentary, no code fences. The JSON must exactly match the requested schema.",
        },
      ],
      opts
    );
    return extractJson(text) as T;
  }

  async testConnection() {
    if (!this.key) return { ok: false, message: "OPENAI_API_KEY not configured" };
    try {
      await this.complete([{ role: "user", content: "Reply with the word ok" }], { maxTokens: 5 });
      return { ok: true, message: "Connected to OpenAI-compatible API" };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}
