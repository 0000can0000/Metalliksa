# server/airgap.ts

- AirgapBlockedService · type · L6-L11 — type AirgapBlockedService = | "Gemini AI (copilot / micrograph vision)" | "NVIDIA cloud NIM / DeepSeek endpoints" | "Materials Project live DFT API" | "External powder / pricing APIs" | "Crossref literature search";
- isAirgappedFromEnv · function · L27-L30 — function isAirgappedFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): boolean
- airgapDenyPayload · function · L32-L40 — function airgapDenyPayload(service: string)
