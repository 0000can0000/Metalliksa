import { Router, Request, Response } from "express";
import { runPythonScript } from "../server/processOrchestrator.ts";

export const characterizationRouter = Router();

async function handlePythonDispatch(scriptPath: string, payload: any, res: Response) {
  try {
    const pyRes = await runPythonScript(scriptPath, payload);
    if (!pyRes.stdout && pyRes.stderr) {
      console.warn(`[Python stderr: ${scriptPath}]`, pyRes.stderr);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(pyRes.stdout || "{}");
    } catch {
      parsed = { rawOutput: pyRes.stdout, stderr: pyRes.stderr, durationMs: pyRes.durationMs };
    }
    return res.json(parsed);
  } catch (err: any) {
    console.error(`[Python error: ${scriptPath}]`, err);
    return res.status(500).json({
      error: err.message || "Failed to execute Python characterization computation",
      script: scriptPath,
    });
  }
}

// CNLS Impedance Fitting
characterizationRouter.post("/api/python/cnls-fit", (req: Request, res: Response) => {
  return handlePythonDispatch("python/cnls_fitting_solver.py", req.body, res);
});

characterizationRouter.post("/api/python/cnls-autofit", (req: Request, res: Response) => {
  return handlePythonDispatch("python/cnls_fitting_solver.py", req.body, res);
});

characterizationRouter.post("/api/python/cnls-synthetic-noise", (req: Request, res: Response) => {
  return handlePythonDispatch("python/cnls_fitting_solver.py", req.body, res);
});

// Battery & Corrosion EIS / DRT
characterizationRouter.post("/api/python/battery-corrosion-eis", (req: Request, res: Response) => {
  return handlePythonDispatch("python/battery_corrosion_eis_solver.py", req.body, res);
});

characterizationRouter.post("/api/python/bisquert-tlm-identify", (req: Request, res: Response) => {
  return handlePythonDispatch("python/battery_corrosion_eis_solver.py", req.body, res);
});

// ASTM G102 / G59 Tafel Annual Corrosion Rate Solver (Python CPython 3.10 Engine)
characterizationRouter.post("/api/python/tafel-corrosion-rate", (req: Request, res: Response) => {
  return handlePythonDispatch("python/tafel_corrosion_rate_solver.py", req.body, res);
});

// XRD Peak Deconvolution & Rietveld
characterizationRouter.post("/api/python/xrd-deconvolve", (req: Request, res: Response) => {
  return handlePythonDispatch("python/xrd_peak_deconvolution.py", req.body, res);
});

// =========================================================================
// Battery & Corrosion Python Data Upload & Custom Script Ingestion
// =========================================================================
interface IngestedDatasetRecord {
  id: string;
  title: string;
  dataType: string;
  timestamp: string;
  source: string;
  analysis: any;
  rawSummary?: any;
}

const recentUploadedDatasets: IngestedDatasetRecord[] = [];

// Direct Python upload endpoint (supports both browser UI and external python scripts via requests.post)
characterizationRouter.post("/api/python/battery-corrosion-upload", async (req: Request, res: Response) => {
  try {
    const payload = {
      action: "upload_and_analyze",
      ...req.body,
    };

    const pyRes = await runPythonScript("python/battery_corrosion_python_ingest.py", payload);
    let parsed: any;
    try {
      parsed = JSON.parse(pyRes.stdout || "{}");
    } catch {
      parsed = { rawOutput: pyRes.stdout, stderr: pyRes.stderr };
    }

    if (parsed && parsed.success && parsed.analysis) {
      const record: IngestedDatasetRecord = {
        id: "upload-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        title: req.body.title || req.body.sampleName || `Dataset (${parsed.analysis.dataType || "General"})`,
        dataType: parsed.analysis.dataType || req.body.dataType || "battery_cycling",
        timestamp: new Date().toISOString(),
        source: req.headers["user-agent"]?.includes("python") ? "Python requests / CLI" : "Web UI Python Ingest",
        analysis: parsed.analysis,
        rawSummary: parsed.analysis.summary,
      };
      recentUploadedDatasets.unshift(record);
      if (recentUploadedDatasets.length > 25) {
        recentUploadedDatasets.pop();
      }
      return res.json({
        ...parsed,
        recordId: record.id,
        savedToRecent: true,
      });
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("[Python Upload Ingest Error]", err);
    return res.status(500).json({
      error: err.message || "Failed to process Python data upload",
      success: false,
    });
  }
});

// Run user-provided Python script with data
characterizationRouter.post("/api/python/battery-corrosion-exec-script", async (req: Request, res: Response) => {
  try {
    const payload = {
      action: "execute_python_script",
      scriptCode: req.body.scriptCode || req.body.script || "",
      data: req.body.data || {},
    };

    const pyRes = await runPythonScript("python/battery_corrosion_python_ingest.py", payload);
    let parsed: any;
    try {
      parsed = JSON.parse(pyRes.stdout || "{}");
    } catch {
      parsed = { rawOutput: pyRes.stdout, stderr: pyRes.stderr, success: false };
    }

    if (parsed && parsed.success && parsed.analysis) {
      const record: IngestedDatasetRecord = {
        id: "script-exec-" + Date.now(),
        title: req.body.title || `Python Script Result (${parsed.analysis.dataType})`,
        dataType: parsed.analysis.dataType,
        timestamp: new Date().toISOString(),
        source: "In-Browser Python Editor",
        analysis: parsed.analysis,
        rawSummary: parsed.analysis.summary,
      };
      recentUploadedDatasets.unshift(record);
      if (recentUploadedDatasets.length > 25) {
        recentUploadedDatasets.pop();
      }
      parsed.recordId = record.id;
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("[Python User Script Execution Error]", err);
    return res.status(500).json({
      error: err.message || "Failed to execute Python script",
      success: false,
    });
  }
});

// Get recent uploads
characterizationRouter.get("/api/python/battery-corrosion-upload/recent", (_req: Request, res: Response) => {
  return res.json({
    count: recentUploadedDatasets.length,
    datasets: recentUploadedDatasets,
  });
});

// Clear an upload or all
characterizationRouter.delete("/api/python/battery-corrosion-upload/:id?", (req: Request, res: Response) => {
  const { id } = req.params;
  if (id && id !== "all") {
    const idx = recentUploadedDatasets.findIndex((d) => d.id === id);
    if (idx >= 0) {
      recentUploadedDatasets.splice(idx, 1);
    }
  } else {
    recentUploadedDatasets.length = 0;
  }
  return res.json({ success: true, count: recentUploadedDatasets.length });
});

