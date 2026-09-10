import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { physicsRouter } from "./routes/physics.ts";
import { characterizationRouter } from "./routes/characterization.ts";
import { copilotRouter } from "./routes/copilot.ts";
import { researchRouter } from "./routes/research.ts";
import { processOrchestrationMiddleware } from "./server/processOrchestrator.ts";

dotenv.config();

// Process-level crash guards: isolate unhandled rejections and errors
// Ensures an unhandled prompt error or JSON failure in AI copilot cannot terminate the process or affect CALPHAD/EIS
process.on("unhandledRejection", (reason: any) => {
  console.error("[ProcessGuard] Unhandled Promise Rejection intercepted:", reason?.stack || reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("[ProcessGuard] Uncaught Exception intercepted:", error?.stack || error);
});

const app = express();
const PORT = 3000;

// Body parsing with generous payload capacity for base64 micrograph scans & CAD models
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Process orchestration & subprocess telemetry middleware
app.use(processOrchestrationMiddleware);

// Server & Infrastructure Health Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "MetalliX-Unified-Server",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// Modular Express Controllers
// =========================================================================
// 1. HPC Physics & Computational Metallurgy (CALPHAD, DFT, LPBF, Kinetics, ICME, UQ)
app.use(physicsRouter);

// 2. Experimental Characterization & Spectroscopy (EIS, XRD, Battery Degradation, SEM Vision)
app.use(characterizationRouter);

// 3. AI Copilot, Metallurgy Consultation, Alloy Formulation & Materials Project
app.use(copilotRouter);

// 4. LPBF Data Research & Acquisition (live Materials Project DFT + curated literature)
app.use(researchRouter);

// Explicit JSON 404 for unmatched /api routes (prevents SPA index.html fallback for API calls)
app.all("/api/*", (req: Request, res: Response) => {
  res.status(404).json({
    error: `API endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Process-Isolated Error Handling Middleware
// Prevents unhandled JSON parsing errors or route exceptions from terminating the Node server process
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ServerError] Unhandled Express pipeline error:", err?.stack || err);
  res.status(err.status || 500).json({
    error: err.message || "An internal server error occurred.",
    code: err.code || "INTERNAL_SERVER_ERROR",
  });
});

// =========================================================================
// Vite Middleware & SPA Serving Pipeline
// =========================================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MetalliX-Server] Modular server running on http://localhost:${PORT}`);
  });
}

startServer();
