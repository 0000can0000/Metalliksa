#!/usr/bin/env node
/**
 * ============================================================================
 * MetalliX — Daily LPBF Melt-Pool Data Collection Pipeline
 * ============================================================================
 * Intended to be run once per day by a Cloud Agent automation. Each run:
 *   1. Reads the LPBF Data Research reference library (live MP DFT + curated
 *      literature) and assembles + self-audits a thermophysical record per alloy.
 *   2. Sweeps the LPBF melt-pool solver over randomized process parameters for
 *      every audited alloy (feeding the researched record via `materialProps`)
 *      plus the alloys already in the solver DB.
 *   3. Appends the labeled samples to an append-only dataset so the corpus
 *      grows daily. This dataset is later used to train / improve the melt-pool
 *      model.
 *
 * Outputs (committed to the repo so data persists across ephemeral VMs):
 *   - data/lpbf_meltpool_dataset.jsonl        append-only labeled samples
 *   - data/lpbf_dataset_manifest.json         batch history + totals
 *   - data/alloy_thermophysical_records.json  latest audited alloy records
 *
 * Usage:
 *   npm run collect-data                 # default ~40 samples/alloy
 *   SAMPLES_PER_ALLOY=80 npm run collect-data
 *   METALLIX_BASE_URL=http://localhost:3000 npm run collect-data
 *
 * Requires the dev server to be running (npm run dev).
 * ============================================================================
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const DATASET_FILE = path.join(DATA_DIR, "lpbf_meltpool_dataset.jsonl");
const MANIFEST_FILE = path.join(DATA_DIR, "lpbf_dataset_manifest.json");
const RECORDS_FILE = path.join(DATA_DIR, "alloy_thermophysical_records.json");

const BASE_URL = process.env.METALLIX_BASE_URL || "http://localhost:3000";
const SAMPLES_PER_ALLOY = parseInt(process.env.SAMPLES_PER_ALLOY || "40", 10);

// Process-parameter sampling ranges (mirror the melt-pool lab slider bounds).
const RANGES = {
  laserPower_W: [80, 600],
  scanSpeed_mm_s: [200, 2500],
  beamDiameter_um: [40, 150],
  preheatTemp_C: [20, 400],
  layerThickness_um: [20, 80],
  hatchSpacing_um: [50, 180],
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randStep(min, max, step) {
  const n = Math.round(rand(min, max) / step) * step;
  return Math.min(max, Math.max(min, n));
}

function wavelengthFor(base) {
  // Highly reflective metals (Cu, Al) are often processed with a green source.
  if ((base === "Cu" || base === "Al") && Math.random() < 0.4) return "Green_515nm";
  return "IR_1064nm";
}

async function getJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url} :: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function checkHealth() {
  try {
    const h = await getJson(`${BASE_URL}/api/health`);
    return h?.status === "ok";
  } catch {
    return false;
  }
}

function sampleParams() {
  return {
    laserPower_W: randStep(RANGES.laserPower_W[0], RANGES.laserPower_W[1], 5),
    scanSpeed_mm_s: randStep(RANGES.scanSpeed_mm_s[0], RANGES.scanSpeed_mm_s[1], 25),
    beamDiameter_um: randStep(RANGES.beamDiameter_um[0], RANGES.beamDiameter_um[1], 5),
    preheatTemp_C: randStep(RANGES.preheatTemp_C[0], RANGES.preheatTemp_C[1], 10),
    layerThickness_um: randStep(RANGES.layerThickness_um[0], RANGES.layerThickness_um[1], 5),
    hatchSpacing_um: randStep(RANGES.hatchSpacing_um[0], RANGES.hatchSpacing_um[1], 5),
  };
}

function flattenSample(meta, params, wavelength, solver) {
  const pp = solver.processParameters || {};
  const geo = solver.meltPoolGeometry || {};
  const hyd = solver.hydrodynamicsAndRecoil || {};
  const sol = solver.solidificationKinetics || {};
  const def = solver.defectDiagnostics || {};
  const tp = solver.thermophysicalProps || {};
  return {
    batchId: meta.batchId,
    collectedAt: meta.collectedAt,
    alloy: meta.alloy,
    base: meta.base,
    alloyInSolver: meta.alloyInSolver,
    propsSource: solver.materialPropsSource,
    // --- process inputs ---
    laserPower_W: params.laserPower_W,
    scanSpeed_mm_s: params.scanSpeed_mm_s,
    beamDiameter_um: params.beamDiameter_um,
    preheatTemp_C: params.preheatTemp_C,
    layerThickness_um: params.layerThickness_um,
    hatchSpacing_um: params.hatchSpacing_um,
    laserWavelength: wavelength,
    // --- thermophysical features (exact props used by the solver) ---
    tp_liquidus_C: tp.liquidus_C,
    tp_solidus_C: tp.solidus_C,
    tp_density_kg_m3: tp.density_kg_m3,
    tp_thermal_conductivity_W_mK: tp.thermal_conductivity_W_mK,
    tp_specific_heat_J_kgK: tp.specific_heat_J_kgK,
    tp_latent_heat_fusion_J_kg: tp.latent_heat_fusion_J_kg,
    tp_absorptivity_IR: tp.absorptivity_IR,
    tp_surface_tension_N_m: tp.surface_tension_N_m,
    tp_d_gamma_dT_N_mK: tp.d_gamma_dT_N_mK,
    tp_viscosity_Pa_s: tp.viscosity_Pa_s,
    // --- derived energy metrics ---
    volumetricEnergyDensity_J_mm3: pp.volumetricEnergyDensity_J_mm3,
    linearEnergyDensity_J_m: pp.linearEnergyDensity_J_m,
    normalizedEnthalpy: pp.normalizedEnthalpy,
    // --- labels: melt-pool geometry ---
    meltPoolLength_um: geo.length_um,
    meltPoolWidth_um: geo.width_um,
    meltPoolDepth_um: geo.depth_um,
    depthToWidthRatio: geo.depthToWidthRatio_D_over_W,
    aspectRatio: geo.aspectRatio_L_over_W,
    keyholeCavityDepth_um: geo.keyholeVaporCavityDepth_um,
    regime: geo.regime,
    // --- labels: hydrodynamics + solidification ---
    peakTemperature_C: hyd.peakTemperature_C,
    knudsenRecoilPressure_kPa: hyd.knudsenRecoilPressure_kPa,
    coolingRate_K_s: sol.coolingRate_K_s,
    thermalGradient_G_K_m: sol.thermalGradient_G_K_m,
    solidificationRate_R_m_s: sol.solidificationRate_R_m_s,
    primaryDendriteArmSpacing_um: sol.primaryDendriteArmSpacing_PDAS_um,
    microstructure: sol.microstructureMorphology,
    // --- labels: defects ---
    lackOfFusionStatus: def.lackOfFusionStatus,
    keyholePorosityRisk: def.keyholePorosityRisk,
    ballingInstabilityRisk: def.ballingInstabilityRisk,
    residualStress_MPa: def.effectiveResidualStress_MPa,
  };
}

async function main() {
  const startedAt = Date.now();
  const now = new Date();
  const collectedAt = now.toISOString();
  const batchId = `batch-${now.toISOString().slice(0, 10)}-${now.getTime()}`;

  console.log(`[collect] MetalliX LPBF data collection — batch ${batchId}`);
  console.log(`[collect] Base URL: ${BASE_URL} | samples/alloy: ${SAMPLES_PER_ALLOY}`);

  if (!(await checkHealth())) {
    console.error(`[collect] ERROR: dev server not reachable at ${BASE_URL}. Start it with "npm run dev".`);
    process.exit(1);
  }

  // 1. Reference library + existing solver alloys.
  const schema = await getJson(`${BASE_URL}/api/research/lpbf-schema`);
  const referenceLibrary = schema.referenceLibrary || [];
  const existingMaterials = schema.existingMaterials || [];

  // 2. Research + audit each reference-library alloy.
  const researched = [];
  const auditedRecords = [];
  for (const lib of referenceLibrary) {
    try {
      const r = await getJson(`${BASE_URL}/api/research/lpbf-thermophysical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: lib.name }),
      });
      if (r.audit && r.audit.status === "fail") {
        console.warn(`[collect] SKIP ${lib.name}: failed self-audit (${r.audit.failCount} fails).`);
        continue;
      }
      researched.push({
        alloy: r.material,
        base: r.base,
        materialProps: r.record,
        alloyInSolver: false,
      });
      auditedRecords.push({
        material: r.material,
        base: r.base,
        category: r.category,
        record: r.record,
        provenance: r.provenance,
        citations: r.citations,
        audit: r.audit,
        dftLive: r.dftEvidence?.live ?? false,
        collectedAt,
      });
      console.log(`[collect] researched ${r.material} — audit ${r.audit.status} (${r.audit.confidence}%)`);
    } catch (err) {
      console.warn(`[collect] research error for ${lib.name}: ${err.message}`);
    }
  }

  // Targets = researched (new) alloys + alloys already in the solver DB.
  const targets = [
    ...researched,
    ...existingMaterials.map((name) => ({ alloy: name, base: null, materialProps: null, alloyInSolver: true })),
  ];

  // 3. Parameter sweep -> solver -> labeled rows.
  const rows = [];
  const perAlloyCounts = {};
  for (const t of targets) {
    let ok = 0;
    for (let i = 0; i < SAMPLES_PER_ALLOY; i++) {
      const params = sampleParams();
      const base = t.base || (t.materialProps && t.materialProps.base) || "Ni";
      const wavelength = wavelengthFor(base);
      const body = { material: t.alloy, ...params, laserWavelength: wavelength };
      if (t.materialProps) body.materialProps = t.materialProps;
      try {
        const solver = await getJson(`${BASE_URL}/api/python/lpbf-thermal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!solver || solver.success === false) continue;
        rows.push(
          flattenSample(
            { batchId, collectedAt, alloy: t.alloy, base: solver.baseMetal || base, alloyInSolver: t.alloyInSolver },
            params,
            wavelength,
            solver
          )
        );
        ok++;
      } catch (err) {
        // Skip individual failures; keep the batch going.
      }
    }
    perAlloyCounts[t.alloy] = ok;
    console.log(`[collect] ${t.alloy}: ${ok}/${SAMPLES_PER_ALLOY} samples`);
  }

  // 4. Persist: append dataset, update manifest + records.
  await fs.mkdir(DATA_DIR, { recursive: true });
  const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  await fs.appendFile(DATASET_FILE, jsonl, "utf8");

  let manifest = { totalRows: 0, batches: [], alloysSeen: [] };
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST_FILE, "utf8"));
  } catch {
    /* first run */
  }
  manifest.totalRows = (manifest.totalRows || 0) + rows.length;
  manifest.lastCollectedAt = collectedAt;
  manifest.batches = manifest.batches || [];
  manifest.batches.push({
    batchId,
    collectedAt,
    rows: rows.length,
    alloys: Object.keys(perAlloyCounts).length,
    perAlloyCounts,
    samplesPerAlloy: SAMPLES_PER_ALLOY,
  });
  const alloysSet = new Set([...(manifest.alloysSeen || []), ...targets.map((t) => t.alloy)]);
  manifest.alloysSeen = Array.from(alloysSet);
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");
  await fs.writeFile(RECORDS_FILE, JSON.stringify({ updatedAt: collectedAt, records: auditedRecords }, null, 2), "utf8");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\n[collect] ===== SUMMARY =====");
  console.log(`[collect] batch rows:      ${rows.length}`);
  console.log(`[collect] dataset total:   ${manifest.totalRows}`);
  console.log(`[collect] alloys:          ${targets.length} (${researched.length} researched + ${existingMaterials.length} solver)`);
  console.log(`[collect] audited records: ${auditedRecords.length}`);
  console.log(`[collect] elapsed:         ${elapsed}s`);
  console.log(`[collect] dataset ->       ${path.relative(REPO_ROOT, DATASET_FILE)}`);
}

main().catch((err) => {
  console.error("[collect] FATAL:", err);
  process.exit(1);
});
