import { Router, Request, Response } from "express";
import { getGeminiClient, generateGeminiContentWithFallback } from "../server/geminiService.ts";
import { airgapDenyPayload, isAirgappedFromEnv } from "../server/airgap.ts";
import { APPROVED_SOURCE_HOSTS, collectApprovedSource } from "../server/approvedSourceCollector.ts";

export const orchestratorRouter = Router();
const AIRGAPPED = isAirgappedFromEnv(process.env);

async function callCompatibleAgent(label: "Sol" | "Astra", prompt: string) {
  const prefix = label === "Sol" ? "SOLANA" : "ASTRA";
  const baseUrl = process.env[`${prefix}_BASE_URL`]?.trim();
  const apiKey = process.env[`${prefix}_API_KEY`]?.trim();
  const model = process.env[`${prefix}_MODEL`]?.trim();
  if (!baseUrl || !apiKey || !model) return { configured: false, text: `${label} yapılandırılmamış; bu adım atlandı.` };

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "system", content: `You are Metalliksa's ${label} agent. Return concise, evidence-aware engineering decisions.` }, { role: "user", content: prompt }] }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("Empty agent response");
    return { configured: true, text };
  } finally {
    clearTimeout(timer);
  }
}

function approvedSourceForUrl(rawUrl: string): keyof typeof APPROVED_SOURCE_HOSTS | null {
  try {
    const hostname = new URL(rawUrl).hostname;
    for (const [sourceId, hosts] of Object.entries(APPROVED_SOURCE_HOSTS)) {
      if (hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return sourceId as keyof typeof APPROVED_SOURCE_HOSTS;
    }
  } catch { /* Ignore malformed model output. */ }
  return null;
}

function findDownloadCandidates(text: string) {
  const urls = text.match(/https:\/\/[^\s<>"')\]]+/gi) || [];
  return [...new Set(urls.map((url) => url.replace(/[.,;:]+$/, "")))].filter((url) => /\.(csv|json|zip|txt|xml)(\?|$)/i.test(url));
}

orchestratorRouter.get("/api/orchestrator/approved-sources", (_req: Request, res: Response) => {
  res.json({ sources: APPROVED_SOURCE_HOSTS, automaticCollection: true, modelTraining: false });
});

orchestratorRouter.post("/api/orchestrator/collect-source", async (req: Request, res: Response) => {
  if (AIRGAPPED) return res.status(503).json({ error: "Source collection is disabled in air-gapped mode." });
  const sourceId = req.body?.sourceId;
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!(sourceId in APPROVED_SOURCE_HOSTS) || !url) return res.status(400).json({ error: "An approved sourceId and HTTPS URL are required." });
  try {
    const metadata = await collectApprovedSource(sourceId as keyof typeof APPROVED_SOURCE_HOSTS, url);
    return res.status(201).json({ data: metadata, nextStep: "quality-check" });
  } catch (error: any) {
    console.error("[Orchestrator] Approved source collection failed", error);
    return res.status(422).json({ error: error?.message || "Approved source collection failed." });
  }
});

orchestratorRouter.post("/api/orchestrator/dataset-plan", async (req: Request, res: Response) => {
  if (AIRGAPPED) return res.status(503).json(airgapDenyPayload("AI dataset planning"));
  const objective = typeof req.body?.objective === "string" ? req.body.objective.trim() : "";
  const constraints = typeof req.body?.constraints === "string" ? req.body.constraints.trim() : "";
  const availableData = typeof req.body?.availableData === "string" ? req.body.availableData.trim() : "";
  if (!objective) return res.status(400).json({ error: "Dataset objective is required." });

  try {
    const ai = getGeminiClient();
    const context = `OBJECTIVE:\n${objective}\n\nCONSTRAINTS:\n${constraints || "Not specified"}\n\nAVAILABLE DATA:\n${availableData || "Not specified"}`;
    const sol = await callCompatibleAgent("Sol", `${context}\n\nRoute this task across the scientific agents. Decide which approved public sources and data groups are relevant, and list the exact questions Astra and Gemini must answer. Do not download anything yourself.`);
    const astra = await callCompatibleAgent("Astra", `${context}\n\nSOL ROUTING:\n${sol.text}\n\nAct as the physics and decision gate. Define the minimum physically meaningful variables, controls, targets, uncertainty fields, and rejection criteria for this dataset. Flag any claims that require NIST or other primary-source evidence.`);
    const flash = await generateGeminiContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: `${context}\n\nSOL ROUTING:\n${sol.text}\n\nASTRA PHYSICS GATE:\n${astra.text}\n\nAct as the fast data inventory agent. We currently have no ready local dataset. Propose candidate public sources first, prioritizing the approved allowlist: NIST AM-Bench, Materials Project, and NOMAD when relevant. These approved sources may be collected automatically without another user prompt; arbitrary internet pages may not. For each source, state the exact dataset/record to seek, direct downloadable URL when known, access method, license/terms check, file types, minimum fields, labels, and immediate data-quality checks. Do not claim that a source was downloaded, and do not invent files or measurements.`,
      systemInstruction: "You are the Gemini Flash data inventory worker for a scientific LPBF project. Source-first, provenance-first, concrete and concise. Approved-source collection is allowed; arbitrary scraping is forbidden.",
    });
    const flashText = (flash as any)?.response?.text || "";
    const pro = await generateGeminiContentWithFallback(ai, {
      preferredModel: "gemini-3.1-pro-preview",
      contents: `${context}\n\nASTRA PHYSICS GATE:\n${astra.text}\n\nFLASH INVENTORY:\n${flashText}\n\nAct as the independent physics reviewer. Check whether each proposed public source is appropriate and traceable. Reject unnecessary variables, identify missing physical controls, propose leakage-safe train/validation/test splits, and list provenance, version, license, citation, and unit requirements. Mark anything that must be manually verified before download.`,
      systemInstruction: "You are the senior LPBF physics reviewer. Check dimensional meaning, experimental comparability, uncertainty and causal leakage.",
    });
    const proText = (pro as any)?.response?.text || "";
    const synthesis = await generateGeminiContentWithFallback(ai, {
      preferredModel: "gemini-3.8-flash",
      contents: `${context}\n\nSOL ROUTING:\n${sol.text}\n\nASTRA DECISION GATE:\n${astra.text}\n\nFLASH PROPOSAL:\n${flashText}\n\nPRO REVIEW:\n${proText}\n\nSynthesize a human-reviewable dataset plan with these exact sections: Decision, Public source shortlist, Required data groups, Required fields, Labels and targets, Split strategy, Provenance, Quality gates, Upload order, Open questions. Clearly state that the local dataset is empty, distinguish source discovery from actual download, include NIST AM-Bench or explain why it is unsuitable, and do not claim that data exists or was retrieved.`,
      systemInstruction: "You are the dataset planning coordinator. Produce a practical plan; data upload must wait for human approval.",
    });
    const collectedSources: unknown[] = [];
    if (availableData.includes("otomatik") || constraints.includes("otomatik")) {
      for (const candidate of findDownloadCandidates(`${flashText}\n${proText}`).slice(0, 3)) {
        const sourceId = approvedSourceForUrl(candidate);
        if (!sourceId) continue;
        try {
          collectedSources.push(await collectApprovedSource(sourceId, candidate));
        } catch (collectionError: any) {
          console.warn(`[Orchestrator] Candidate source skipped: ${candidate}`, collectionError?.message || collectionError);
        }
      }
    }
    return res.json({
      success: true,
      plan: (synthesis as any)?.response?.text || "",
      agents: { dispatcher: sol.configured ? "Sol / connected" : "Sol / missing configuration", physicsLead: astra.configured ? "Astra / connected" : "Astra / missing configuration", inventory: flash.modelUsed, reviewer: pro.modelUsed },
      evidence: { dispatcher: sol.text, physicsGate: astra.text, inventory: flashText, review: proText },
      uploadAllowed: false,
      sourceCollectionAllowed: true,
      collectedSources,
    });
  } catch (error: any) {
    console.error("[Orchestrator] Dataset planning failed", error);
    return res.status(500).json({ error: error?.message || "Dataset planning failed." });
  }
});
