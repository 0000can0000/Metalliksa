import { ExperimentalEISDataset, RawEISPoint } from "../types/eisData";

export interface AgingIntervalRecord {
  intervalId: string;
  intervalLabel: string;
  intervalValue: number; // e.g. cycle number or hours
  intervalUnit: "cycles" | "hours";
  temperatureC: number;
  dataset: ExperimentalEISDataset;
  extractedParameters: {
    r0_ohm: number;
    r0_std_err: number;
    rSei_ohm: number; // or rPore_ohm
    rSei_std_err: number;
    rCt_ohm: number;
    rCt_std_err: number;
    cDl_uF: number;
    cSei_uF: number; // or cCoating_uF
    warburgSigma: number;
    sohPct: number;
    waterUptakePct?: number;
    kkChiSq: number;
    kkStatus: "PASSED" | "WARNING" | "DRIFT_DETECTED";
  };
}

export interface AgingCampaign {
  id: string;
  title: string;
  domain: "battery" | "corrosion";
  systemDescription: string;
  standardNorm: string; // e.g., "USABC / IEC 62660" or "ISO 12944-6 / ASTM B117"
  intervalUnit: "cycles" | "hours";
  intervals: AgingIntervalRecord[];
}

function makeLogFrequencies(minF: number, maxF: number, pointsPerDecade: number = 10): number[] {
  const list: number[] = [];
  const logMin = Math.log10(minF);
  const logMax = Math.log10(maxF);
  const total = Math.round((logMax - logMin) * pointsPerDecade);
  for (let i = total; i >= 0; i--) {
    list.push(Math.pow(10, logMin + (i / total) * (logMax - logMin)));
  }
  return list;
}

/**
 * Synthesizes realistic experimental EIS points with calibrated Gaussian noise
 */
function synthesizeRealisticSpectrum(
  freqs: number[],
  evalFn: (f: number) => { zReal: number; zImag: number },
  noiseStdPct: number = 0.8,
  seedOffset: number = 0
): RawEISPoint[] {
  return freqs.map((f, idx) => {
    const clean = evalFn(f);
    const seed = Math.sin((idx + seedOffset) * 9301 + 49297) * 233280;
    const rnd1 = (seed - Math.floor(seed)) * 2 - 1;
    const seed2 = Math.cos((idx + seedOffset) * 7919 + 6133) * 123456;
    const rnd2 = (seed2 - Math.floor(seed2)) * 2 - 1;

    const zReal = clean.zReal * (1 + (rnd1 * noiseStdPct) / 100);
    const zImag = clean.zImag * (1 + (rnd2 * noiseStdPct) / 100);
    const minusZImag = -zImag;
    const zMag = Math.sqrt(zReal * zReal + zImag * zImag);
    const phaseDeg = (Math.atan2(zImag, zReal) * 180) / Math.PI;

    return {
      frequency: f,
      zReal,
      zImag,
      minusZImag,
      zMag,
      phaseDeg,
    };
  });
}

// -------------------------------------------------------------------------------------------------
// 1. Curated 10-Interval Battery Fast-Charge Aging Campaign (Cycles 0 to 1000, NMC811)
// -------------------------------------------------------------------------------------------------
export function generateBatteryFastChargeCampaign(): AgingCampaign {
  const freqs = makeLogFrequencies(0.01, 50000, 10);
  const cycleIntervals = [0, 50, 100, 200, 300, 400, 500, 650, 800, 1000];

  const intervals: AgingIntervalRecord[] = cycleIntervals.map((cycle, i) => {
    // Physical degradation models:
    // Bulk R0 rises slightly due to electrolyte dry-out and current collector oxidation
    const r0 = 0.024 + 0.014 * Math.pow(cycle / 1000, 1.2);
    // SEI resistance thickens monotonically with square-root of cycles (diffusion-limited SEI growth)
    const rSei = 0.014 + 0.048 * Math.sqrt(cycle / 1000);
    // Charge transfer resistance accelerates due to transition metal dissolution & microcracking
    const rCt = 0.038 + 0.155 * Math.pow(cycle / 1000, 1.45);
    // Double layer capacitance drops due to active material loss
    const cDl = 48.0 * (1 - 0.22 * Math.pow(cycle / 1000, 0.9));
    const cSei = 15.0 * (1 + 0.35 * Math.sqrt(cycle / 1000));
    // Warburg coefficient increases as tortuosity rises
    const sigma = 0.028 + 0.045 * Math.pow(cycle / 1000, 1.1);

    // SOH capacity retention %
    const soh = Math.max(70, 100 - 24.5 * Math.pow(cycle / 1000, 1.15));

    // K-K drift increases at extreme degradation
    const kkChiSq = 0.00012 * (1 + 1.8 * (cycle / 1000));
    const kkStatus = cycle > 850 ? "WARNING" : "PASSED";

    const points = synthesizeRealisticSpectrum(
      freqs,
      (f) => {
        const w = 2 * Math.PI * f;
        // SEI parallel branch
        const nSei = 0.88 - 0.04 * (cycle / 1000);
        const qSei = (cSei * 1e-6) / Math.pow(w, nSei - 1);
        const zCpeSei = {
          re: (1 / (qSei * Math.pow(w, nSei))) * Math.cos((nSei * Math.PI) / 2),
          im: -(1 / (qSei * Math.pow(w, nSei))) * Math.sin((nSei * Math.PI) / 2),
        };
        const ySei = {
          re: 1 / rSei + zCpeSei.re / (zCpeSei.re ** 2 + zCpeSei.im ** 2),
          im: -zCpeSei.im / (zCpeSei.re ** 2 + zCpeSei.im ** 2),
        };
        const zSei = {
          re: ySei.re / (ySei.re ** 2 + ySei.im ** 2),
          im: -ySei.im / (ySei.re ** 2 + ySei.im ** 2),
        };

        // Faradaic charge transfer + Warburg branch
        const zW = { re: sigma / Math.sqrt(w), im: -sigma / Math.sqrt(w) };
        const zFarad = { re: rCt + zW.re, im: zW.im };
        const nDl = 0.94 - 0.06 * (cycle / 1000);
        const qDl = (cDl * 1e-6) / Math.pow(w, nDl - 1);
        const zCpeDl = {
          re: (1 / (qDl * Math.pow(w, nDl))) * Math.cos((nDl * Math.PI) / 2),
          im: -(1 / (qDl * Math.pow(w, nDl))) * Math.sin((nDl * Math.PI) / 2),
        };
        const yDl = {
          re: zFarad.re / (zFarad.re ** 2 + zFarad.im ** 2) + zCpeDl.re / (zCpeDl.re ** 2 + zCpeDl.im ** 2),
          im: -zFarad.im / (zFarad.re ** 2 + zFarad.im ** 2) - zCpeDl.im / (zCpeDl.re ** 2 + zCpeDl.im ** 2),
        };
        const zCt = {
          re: yDl.re / (yDl.re ** 2 + yDl.im ** 2),
          im: -yDl.im / (yDl.re ** 2 + yDl.im ** 2),
        };

        return {
          zReal: r0 + zSei.re + zCt.re,
          zImag: zSei.im + zCt.im,
        };
      },
      1.1,
      i * 137
    );

    const dataset: ExperimentalEISDataset = {
      id: `batch-battery-cyc-${cycle}`,
      name: `NMC811 Pouch Cell - Cycle ${cycle}`,
      source: "benchmark",
      description: `Commercial 21700 NMC811 fast-charge degradation interval at Cycle ${cycle} (1.5C CCCV, 25°C).`,
      metadata: {
        instrument: "BioLogic VMP-300 FRA / Arbin Cycler",
        temperatureC: 25,
        potentialV: 3.72,
        acAmplitudeMv: 5,
        sampleRate: "10 pts/dec",
        cycleNumber: cycle,
      },
      points,
    };

    return {
      intervalId: `cyc-${cycle}`,
      intervalLabel: `Cycle ${cycle}`,
      intervalValue: cycle,
      intervalUnit: "cycles",
      temperatureC: 25,
      dataset,
      extractedParameters: {
        r0_ohm: r0,
        r0_std_err: r0 * 0.018,
        rSei_ohm: rSei,
        rSei_std_err: rSei * 0.024,
        rCt_ohm: rCt,
        rCt_std_err: rCt * 0.031,
        cDl_uF: cDl,
        cSei_uF: cSei,
        warburgSigma: sigma,
        sohPct: soh,
        kkChiSq,
        kkStatus,
      },
    };
  });

  return {
    id: "campaign-battery-nmc811-fastcharge",
    title: "Commercial NMC811 Battery Fast-Charge Aging Campaign (1000 Cycles)",
    domain: "battery",
    systemDescription: "10-point chronocoulometric EIS timeline tracking SEI passivation thickening, charge-transfer resistance rise, and capacity knee-point fade under 1.5C fast charging.",
    standardNorm: "USABC / IEC 62660-1 Electric Vehicle Cycle Testing",
    intervalUnit: "cycles",
    intervals,
  };
}

// -------------------------------------------------------------------------------------------------
// 2. Curated 8-Interval ISO 12944 Marine Epoxy Degradation Campaign (0h to 1000h Salt Spray)
// -------------------------------------------------------------------------------------------------
export function generateCorrosionCoatingCampaign(): AgingCampaign {
  const freqs = makeLogFrequencies(0.01, 100000, 10);
  const hourIntervals = [0, 24, 72, 168, 336, 500, 750, 1000];

  const intervals: AgingIntervalRecord[] = hourIntervals.map((hours, i) => {
    // Physical barrier coating degradation:
    // Solution resistance in 3.5 wt% NaCl
    const r0 = 18.5 + 2.0 * Math.sin(i);
    // Pore resistance collapses by 4 orders of magnitude as electrolyte penetrates voids
    const rPore = 1.5e9 / (1 + 0.035 * Math.pow(hours, 1.6));
    // Coating capacitance rises due to water absorption (dielectric constant of H2O = 80 vs epoxy = 4)
    const c0_nF = 1.2;
    const maxWaterVol = 0.052; // 5.2% saturation
    const waterVol = maxWaterVol * (1 - Math.exp(-hours / 220));
    // Brasher-Kingsbury equation: C_t = C_0 * 80^(waterVol)
    const cCoating_nF = c0_nF * Math.pow(80, waterVol);
    // Charge-transfer resistance appears when water reaches metal substrate (t > 100h)
    const rCt = hours < 48 ? 1.0e8 : Math.max(8.0e3, 5.0e7 / Math.pow(hours / 48, 1.5));
    const cDl_uF = hours < 48 ? 0.05 : 0.05 + 18.0 * (1 - Math.exp(-(hours - 48) / 300));

    const soh = Math.max(15, 100 * Math.pow(rPore / 1.5e9, 0.22));
    const kkChiSq = 0.00015 * (1 + 1.2 * (hours / 1000));
    const kkStatus = hours > 700 ? "WARNING" : "PASSED";

    const points = synthesizeRealisticSpectrum(
      freqs,
      (f) => {
        const w = 2 * Math.PI * f;
        // Coating barrier high-frequency loop (R_pore || C_coat)
        const nCoat = 0.96 - 0.08 * (hours / 1000);
        const qCoat = (cCoating_nF * 1e-9) / Math.pow(w, nCoat - 1);
        const zCpeCoat = {
          re: (1 / (qCoat * Math.pow(w, nCoat))) * Math.cos((nCoat * Math.PI) / 2),
          im: -(1 / (qCoat * Math.pow(w, nCoat))) * Math.sin((nCoat * Math.PI) / 2),
        };
        const yCoat = {
          re: 1 / rPore + zCpeCoat.re / (zCpeCoat.re ** 2 + zCpeCoat.im ** 2),
          im: -zCpeCoat.im / (zCpeCoat.re ** 2 + zCpeCoat.im ** 2),
        };
        const zCoat = {
          re: yCoat.re / (yCoat.re ** 2 + yCoat.im ** 2),
          im: -yCoat.im / (yCoat.re ** 2 + yCoat.im ** 2),
        };

        // Under-film corrosion double layer loop (R_ct || C_dl)
        const nDl = 0.84;
        const qDl = (cDl_uF * 1e-6) / Math.pow(w, nDl - 1);
        const zCpeDl = {
          re: (1 / (qDl * Math.pow(w, nDl))) * Math.cos((nDl * Math.PI) / 2),
          im: -(1 / (qDl * Math.pow(w, nDl))) * Math.sin((nDl * Math.PI) / 2),
        };
        const yDl = {
          re: 1 / rCt + zCpeDl.re / (zCpeDl.re ** 2 + zCpeDl.im ** 2),
          im: -zCpeDl.im / (zCpeDl.re ** 2 + zCpeDl.im ** 2),
        };
        const zSubstrate = {
          re: yDl.re / (yDl.re ** 2 + yDl.im ** 2),
          im: -yDl.im / (yDl.re ** 2 + yDl.im ** 2),
        };

        return {
          zReal: r0 + zCoat.re + zSubstrate.re,
          zImag: zCoat.im + zSubstrate.im,
        };
      },
      1.3,
      i * 211
    );

    const dataset: ExperimentalEISDataset = {
      id: `batch-coating-hrs-${hours}`,
      name: `Marine Epoxy Barrier - ${hours}h Salt Fog`,
      source: "benchmark",
      description: `ISO 12944-6 / ASTM B117 accelerated 3.5 wt% NaCl salt fog exposure interval at t = ${hours} hours.`,
      metadata: {
        instrument: "Gamry Reference 600+ Potentiostat / ASTM G106 Cell",
        temperatureC: 35,
        potentialV: -0.45,
        acAmplitudeMv: 10,
        sampleRate: "10 pts/dec",
        exposureHours: hours,
      },
      points,
    };

    return {
      intervalId: `hrs-${hours}`,
      intervalLabel: `${hours} Hours`,
      intervalValue: hours,
      intervalUnit: "hours",
      temperatureC: 35,
      dataset,
      extractedParameters: {
        r0_ohm: r0,
        r0_std_err: r0 * 0.02,
        rSei_ohm: rPore,
        rSei_std_err: rPore * 0.045,
        rCt_ohm: rCt,
        rCt_std_err: rCt * 0.05,
        cDl_uF: cDl_uF,
        cSei_uF: cCoating_nF * 1e-3, // in uF
        warburgSigma: 0,
        sohPct: soh,
        waterUptakePct: waterVol * 100,
        kkChiSq,
        kkStatus,
      },
    };
  });

  return {
    id: "campaign-marine-epoxy-astm-b117",
    title: "ISO 12944 / ASTM B117 Marine Barrier Epoxy 1000h Salt Fog Campaign",
    domain: "corrosion",
    systemDescription: "8-interval continuous corrosion progression tracking barrier pore resistance collapse, Brasher-Kingsbury water absorption, and underfilm delamination kinetics.",
    standardNorm: "ISO 12944-6 / ASTM B117 Neutral Salt Spray Testing",
    intervalUnit: "hours",
    intervals,
  };
}

/**
 * Extracts cycle number or exposure hours from typical lab filenames
 * Examples: "cycle_50.mpt", "NMC_C100_EIS.dta", "epoxy_24h_salt.csv", "sample_day3.txt"
 */
export function extractIntervalFromFilename(filename: string): { value: number; unit: "cycles" | "hours" } | null {
  const lower = filename.toLowerCase();

  // Pattern 1: cycle / cyc / c followed by digits
  const cycleMatch = lower.match(/(?:cycle|cyc|c)[-_]?(\d+)/);
  if (cycleMatch && cycleMatch[1]) {
    return { value: parseInt(cycleMatch[1], 10), unit: "cycles" };
  }

  // Pattern 2: hours / hr / h followed by digits, or digits followed by h
  const hourMatch1 = lower.match(/(\d+)\s*(?:hours|hour|hrs|hr|h)\b/);
  if (hourMatch1 && hourMatch1[1]) {
    return { value: parseInt(hourMatch1[1], 10), unit: "hours" };
  }

  const hourMatch2 = lower.match(/(?:hours|hrs|hr|h)[-_]?(\d+)/);
  if (hourMatch2 && hourMatch2[1]) {
    return { value: parseInt(hourMatch2[1], 10), unit: "hours" };
  }

  // Pattern 3: general trailing digit e.g. "test_01", "run_5"
  const genericMatch = lower.match(/[-_](\d+)(?:\.[a-z0-9]+)?$/);
  if (genericMatch && genericMatch[1]) {
    return { value: parseInt(genericMatch[1], 10), unit: "cycles" };
  }

  return null;
}
