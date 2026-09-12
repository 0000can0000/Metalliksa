import { Router } from "express";
import { lpbfWorker } from "../server/lpbfWorkerBridge";

export const lpbfSimulationRouter = Router();
lpbfSimulationRouter.use("/api/lpbf", (req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Same-origin requests required" }); }
    catch { return res.status(403).json({ error: "Invalid origin" }); }
  }
  next();
});
for (const [method, route, rpc] of [
  ["get", "/api/lpbf/capabilities", "capabilities"],
  ["post", "/api/lpbf/jobs", "submit"],
  ["get", "/api/lpbf/jobs/:id", "get"],
  ["delete", "/api/lpbf/jobs/:id", "cancel"],
] as const) {
  lpbfSimulationRouter[method](route, async (req, res) => {
    try {
      if (rpc === "submit" && Buffer.byteLength(JSON.stringify(req.body)) > 500000) return res.status(413).json({ error: "Simulation input too large" });
      const data = await lpbfWorker.request(rpc, rpc === "submit" ? req.body : ("id" in req.params ? req.params.id : null));
      res.status(rpc === "submit" ? 202 : 200).json(data);
    } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "Simulation request failed" }); }
  });
}
