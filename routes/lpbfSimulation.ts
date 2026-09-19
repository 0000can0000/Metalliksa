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
  ["post", "/api/lpbf/estimate", "estimate"],
  ["get", "/api/lpbf/jobs/:id", "get"],
  ["delete", "/api/lpbf/jobs/:id", "cancel"],
  ["post", "/api/python/lpbf-solidification-microstructure", "solidification-microstructure"],
  ["post", "/api/python/lpbf-thermomechanical-distortion", "thermomechanical-distortion"],
  ["post", "/api/python/lpbf-experimental-validation", "experimental-validation"],
  ["post", "/api/python/lpbf-modulus-fno", "modulus-fno"],
  ["post", "/api/python/lpbf-toolpath-kinematics", "toolpath-kinematics"],
  ["post", "/api/python/lpbf-fatigue-fracture", "fatigue-fracture"],
  ["post", "/api/python/lpbf-stl-voxelize", "stl-voxelize"],
  ["post", "/api/python/lpbf-adaptive-feedforward", "adaptive-feedforward"],
  ["post", "/api/python/lpbf-multilaser-plume", "multilaser-plume"],
  ["post", "/api/python/lpbf-powder-dem-compaction", "powder-dem-compaction"],
  ["post", "/api/python/lpbf-optical-tomography", "optical-tomography"],
  ["post", "/api/python/lpbf-thermal-accumulation", "thermal-accumulation"],
] as const) {
  lpbfSimulationRouter[method](route, async (req, res) => {
    try {
      if (rpc === "submit" && Buffer.byteLength(JSON.stringify(req.body)) > 500000) return res.status(413).json({ error: "Simulation input too large" });
      const passBody = ["submit", "estimate", "solidification-microstructure", "thermomechanical-distortion", "experimental-validation", "modulus-fno", "toolpath-kinematics", "fatigue-fracture", "stl-voxelize", "adaptive-feedforward", "multilaser-plume", "powder-dem-compaction", "optical-tomography", "thermal-accumulation"].includes(rpc);
      const data = await lpbfWorker.request(rpc, passBody ? req.body : ("id" in req.params ? req.params.id : null));
      res.status(rpc === "submit" ? 202 : 200).json(data);
    } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "Simulation request failed" }); }
  });
}

lpbfSimulationRouter.get("/api/lpbf/jobs/:id/artifacts/:name", async (req,res) => {
  try {
    const data = await lpbfWorker.request("artifact", { id:req.params.id, name:req.params.name }) as {content:string;type:string};
    res.setHeader("Content-Type",data.type);
    res.setHeader("Content-Security-Policy","default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options","nosniff");
    if (req.params.name.endsWith(".csv")) res.setHeader("Content-Disposition",'attachment; filename="thermal-history.csv"');
    res.send(Buffer.from(data.content,"base64"));
  } catch(e) {res.status(400).json({error:e instanceof Error?e.message:"Artifact unavailable"});}
});
