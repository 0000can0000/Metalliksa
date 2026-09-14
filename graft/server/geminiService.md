# server/geminiService.ts

- getGeminiClient · function · L6-L22 — function getGeminiClient(): GoogleGenAI
- waitMs · function · L24-L24 — waitMs = (ms: number)
- GeminiContentFallbackOptions · interface · L26-L33 — interface GeminiContentFallbackOptions
- generateGeminiContentWithFallback · function · L39-L126 — async function generateGeminiContentWithFallback( ai: GoogleGenAI, params: GeminiContentFallbackOptions )
- extractJsonFromLlmText · function · L131-L142 — function extractJsonFromLlmText<T = any>(rawText: string, fallback: T): T
