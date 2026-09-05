import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GeminiContentFallbackOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  thinkingLevel?: ThinkingLevel;
  timeoutMs?: number;
  preferredModel?: string;
}

/**
 * Resilient AI helper with retry & fallback for 503 high demand, 429 rate limits, timeouts, and model availability.
 * Automatically leverages ThinkingLevel.LOW on Gemini 3 series for fast, responsive generation.
 */
export async function generateGeminiContentWithFallback(
  ai: GoogleGenAI,
  params: GeminiContentFallbackOptions
) {
  // Ordered sequence of robust, ultra-fast and available models per Gemini SDK guidelines
  const defaultModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  const models = params.preferredModel
    ? [params.preferredModel, ...defaultModels.filter((m) => m !== params.preferredModel)]
    : defaultModels;

  const defaultTimeout = params.timeoutMs ?? 20000;
  let lastError: any = null;

  for (const model of models) {
    // Only retry on transient 429 rate limit or network resets; do not retry timeouts or 503 high-demand on the same model.
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let timer: NodeJS.Timeout | null = null;

      try {
        const isGemini3 = model.startsWith("gemini-3");
        const config: any = {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.25,
        };

        // Enable low thinking level on Gemini 3 series to achieve low latency (1-2s) and prevent timeouts
        if (isGemini3) {
          config.thinkingConfig = {
            thinkingLevel: params.thinkingLevel ?? ThinkingLevel.LOW,
          };
        }

        const callPromise = ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Gemini API call to ${model} timed out after ${defaultTimeout}ms`));
          }, defaultTimeout);
        });

        const response = await Promise.race([callPromise, timeoutPromise]);
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "").toLowerCase();
        const status = err?.status || err?.code || (err?.error && err?.error?.code);

        const isTimeout = errMsg.includes("timed out") || errMsg.includes("timeout");
        const isHighDemand =
          status === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("overloaded");

        console.warn(`[Gemini API] Attempt ${attempt + 1} with ${model} failed:`, err?.message || err);

        // If the model timed out or is experiencing high demand (503), do not waste time retrying it.
        // Immediately failover to the next available fallback model.
        if (isTimeout || isHighDemand) {
          console.warn(`[Gemini API] ${model} encountered ${isTimeout ? "timeout" : "high demand (503)"}. Failing over immediately to next model...`);
          break;
        }

        // Only retry on rate limits (429) or transient 500 server errors
        const isTransient = status === 429 || status === 500 || errMsg.includes("429") || errMsg.includes("resource_exhausted");
        if (isTransient && attempt === 0) {
          await waitMs(400 + Math.random() * 400);
          continue;
        }

        break;
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate AI response across fallback models.");
}

/**
 * Safe JSON extractor from LLM text with markdown code fences stripping
 */
export function extractJsonFromLlmText<T = any>(rawText: string, fallback: T): T {
  if (!rawText) return fallback;
  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const textToParse = jsonMatch ? jsonMatch[1] : rawText;
    const cleaned = textToParse.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[GeminiService] JSON parse failed, returning fallback object:", err);
    return fallback;
  }
}
