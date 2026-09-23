/**
 * Air-gap / offline mode: AIRGAPPED=1 disables outbound cloud services.
 * Local Python LPBF / CALPHAD / EIS remain available.
 */

export type AirgapBlockedService =
  | "GPT-6 AI (copilot / micrograph vision)"
  | "NVIDIA cloud NIM / DeepSeek endpoints"
  | "Materials Project live DFT API"
  | "External powder / pricing APIs"
  | "Crossref literature search";

export const AIRGAP_BLOCKED_SERVICES: AirgapBlockedService[] = [
  "GPT-6 AI (copilot / micrograph vision)",
  "NVIDIA cloud NIM / DeepSeek endpoints",
  "Materials Project live DFT API",
  "External powder / pricing APIs",
  "Crossref literature search",
];

export const AIRGAP_ALLOWED_LOCAL = [
  "Local LPBF build-job (Rosenthal screening + slicer)",
  "Local Python physics (CALPHAD / EIS / kinetics when installed)",
  "Bundled Materials Project reference catalog (offline copy)",
] as const;

export function isAirgappedFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): boolean {
  const raw = String(env.AIRGAPPED ?? env.VITE_AIRGAPPED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function airgapDenyPayload(service: string) {
  return {
    error: `Air-gap mode (AIRGAPPED=1): ${service} is disabled. Local LPBF and physics engines remain available.`,
    airgapped: true,
    blockedService: service,
    blockedServices: AIRGAP_BLOCKED_SERVICES,
    allowedLocal: AIRGAP_ALLOWED_LOCAL,
  };
}
