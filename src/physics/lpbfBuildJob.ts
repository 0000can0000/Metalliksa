/**
 * Client-side energy-density screening (VED, LED, I0, King ΔH/hs) for telemetry / Inverse Alloy helpers.
 * DEPRECATED for industrial printability: do NOT call from the Additive rail or Decision lab.
 * TypeScript must not re-score printability — Python `job.verdict` is the only industrial decision.
 * Paid / Additive Lab path uses POST /api/python/lpbf-build-job → job.verdict only.
 */

export type LpbfBuildRegime =
  | "Lack of Fusion (LoF)"
  | "Stable Conduction"
  | "Keyhole Vaporization"
  | "Balling / Plateau-Rayleigh Instability";

export interface LpbfBuildJobInputs {
  laserPower_W: number;
  scanSpeed_mms: number;
  hatch_um: number;
  layer_um: number;
  beamDiameter_um: number;
  preheatTemp_C: number;
  thermalConductivity_k_WmK: number;
  density_rho_kgm3: number;
  specificHeat_Cp_JkgK: number;
  laserAbsorptivity: number;
  liquidus_C: number;
  boiling_C?: number;
  beamProfile: "gaussian" | "flat-top";
}

export interface LpbfBuildJobMetrics {
  ved_J_mm3: number;
  led_J_mm: number;
  peakIntensity_MW_cm2: number;
  normalizedEnthalpy: number;
  meltPoolWidth_um: number;
  meltPoolDepth_um: number;
  coolingRate_Ks: number;
  regime: LpbfBuildRegime;
  hatchExceedsWidth: boolean;
  layerExceedsDepth: boolean;
}

export function evaluateLpbfBuildJob(input: LpbfBuildJobInputs): LpbfBuildJobMetrics {
  const P = Math.max(1, input.laserPower_W);
  const v_mm_s = Math.max(10, input.scanSpeed_mms);
  const h_mm = Math.max(1e-6, input.hatch_um / 1000);
  const t_mm = Math.max(1e-6, input.layer_um / 1000);
  const d_um = Math.max(10, input.beamDiameter_um);

  const ved_J_mm3 = Number((P / (v_mm_s * h_mm * t_mm)).toFixed(2));
  const led_J_mm = Number((P / v_mm_s).toFixed(3));

  const radius_cm = (d_um / 2) * 1e-4;
  const peakIntensity_MW_cm2 = Number(((P * 1e-6) / (Math.PI * Math.pow(radius_cm, 2))).toFixed(3));

  const k = Math.max(0.1, input.thermalConductivity_k_WmK);
  const rho = Math.max(100, input.density_rho_kgm3);
  const Cp = Math.max(50, input.specificHeat_Cp_JkgK);
  const A = Math.min(0.95, Math.max(0.05, input.laserAbsorptivity));
  const Tm = Math.max(200, input.liquidus_C);
  const T0 = input.preheatTemp_C;
  const Tb = input.boiling_C ?? Tm * 1.85 + 200;
  const alpha = k / (rho * Cp);
  const v_m_s = v_mm_s / 1000;
  const r0_m = (d_um / 2) * 1e-6;
  const profileFactor = input.beamProfile === "gaussian" ? 1.0 : 0.78;
  const hs = rho * Cp * Tm;
  const P_abs = P * A * profileFactor;
  const denom = hs * Math.sqrt(Math.PI * alpha * v_m_s * Math.pow(r0_m, 3));
  const normalizedEnthalpy = denom > 0 ? Number((P_abs / denom).toFixed(2)) : 0;

  const r0_um = d_um / 2;
  const meltPoolWidth_um = Math.round(2 * r0_um * Math.sqrt(Math.max(0.2, normalizedEnthalpy / 2.5)));
  const keyholeThreshold = Math.PI * Math.sqrt((Tb + 273.15) / (Tm + 273.15));
  const isKeyholing = normalizedEnthalpy > keyholeThreshold || (peakIntensity_MW_cm2 > 1.2 && normalizedEnthalpy > 30);
  const depthToWidthRatio = isKeyholing
    ? 0.85 + Math.max(0, normalizedEnthalpy - keyholeThreshold) * 0.25
    : 0.35 + (normalizedEnthalpy / Math.max(0.1, keyholeThreshold)) * 0.4;
  const meltPoolDepth_um = Math.round(meltPoolWidth_um * depthToWidthRatio);

  const G_Km = (Tm - T0) / (Math.max(10, meltPoolDepth_um) * 1e-6);
  const coolingRate_Ks = Math.round(G_Km * v_m_s * 0.85);

  const hatchExceedsWidth = input.hatch_um > meltPoolWidth_um;
  const layerExceedsDepth = input.layer_um > meltPoolDepth_um;

  let regime: LpbfBuildRegime = "Stable Conduction";
  if (v_mm_s > 1500 && led_J_mm < 0.12) {
    regime = "Balling / Plateau-Rayleigh Instability";
  } else if (hatchExceedsWidth || layerExceedsDepth || meltPoolDepth_um < input.layer_um * 1.3) {
    regime = "Lack of Fusion (LoF)";
  } else if (isKeyholing) {
    regime = "Keyhole Vaporization";
  }

  return {
    ved_J_mm3,
    led_J_mm,
    peakIntensity_MW_cm2,
    normalizedEnthalpy,
    meltPoolWidth_um,
    meltPoolDepth_um,
    coolingRate_Ks,
    regime,
    hatchExceedsWidth,
    layerExceedsDepth,
  };
}
