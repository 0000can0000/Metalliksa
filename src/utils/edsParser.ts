// Raw EDS Spectrum & Data Parser for Bruker, Oxford Instruments, EDAX (.spc), Thermo Fisher, and EMSA (.emsa) formats

import { CHARACTERISTIC_XRAY_LINES, SpectrumPoint } from "../data/edsReferenceData";

export interface ParsedEDSSpectrum {
  fileName: string;
  sampleTitle?: string;
  beamEnergyKv?: number;
  liveTimeSec?: number;
  deadTimePct?: number;
  points: SpectrumPoint[];
  detectedPeaks: {
    energyKeV: number;
    counts: number;
    matchedElement?: string;
    matchedLine?: string;
    confidence: number;
  }[];
  estimatedComposition?: {
    symbol: string;
    weightPct: number;
    atomicPct: number;
  }[];
}

/**
 * Universal EDS File Parser supporting:
 * - EMSA / MAS standard spectrum files (.emsa, .msa)
 * - EDAX / Bruker / Thermo Fisher Binary and ASCII .spc files (.spc)
 * - 2-Column Delimited spectra (.csv, .txt, .dat)
 */
export function parseRawEDSFile(
  fileContent: string | ArrayBuffer,
  fileName: string
): ParsedEDSSpectrum {
  let rawPoints: { energy: number; counts: number }[] = [];
  let beamEnergyKv = 15.0;
  let liveTimeSec = 60;
  let deadTimePct = 12.0;
  let sampleTitle = fileName.replace(/\.[^/.]+$/, "");

  if (typeof fileContent !== "string") {
    // Binary .spc or binary spectrum
    const binResult = parseBinarySpc(fileContent, fileName);
    rawPoints = binResult.points;
    if (binResult.beamEnergyKv) beamEnergyKv = binResult.beamEnergyKv;
    if (binResult.liveTimeSec) liveTimeSec = binResult.liveTimeSec;
    if (binResult.sampleTitle) sampleTitle = binResult.sampleTitle;
  } else {
    // Check if it's an EMSA format
    if (fileContent.includes("#FORMAT") || fileContent.includes("#EMSA") || fileContent.includes("#NPOINTS") || fileContent.includes("#XPERCHAN")) {
      const emsaResult = parseEMSAFile(fileContent, fileName);
      rawPoints = emsaResult.points;
      if (emsaResult.beamEnergyKv) beamEnergyKv = emsaResult.beamEnergyKv;
      if (emsaResult.liveTimeSec) liveTimeSec = emsaResult.liveTimeSec;
      if (emsaResult.deadTimePct) deadTimePct = emsaResult.deadTimePct;
      if (emsaResult.sampleTitle) sampleTitle = emsaResult.sampleTitle;
    } else {
      // General ASCII text parser (supporting .spc ASCII, .csv, .txt)
      const textResult = parseDelimitedEDS(fileContent, fileName);
      rawPoints = textResult.points;
      if (textResult.beamEnergyKv) beamEnergyKv = textResult.beamEnergyKv;
      if (textResult.liveTimeSec) liveTimeSec = textResult.liveTimeSec;
      if (textResult.deadTimePct) deadTimePct = textResult.deadTimePct;
      if (textResult.sampleTitle) sampleTitle = textResult.sampleTitle;
    }
  }

  // If no points parsed, generate error
  if (rawPoints.length === 0) {
    throw new Error(
      `Could not detect valid Energy (keV) and Counts data in "${fileName}". Supported formats: .spc (EDAX binary & ASCII), .emsa (EMSA/MAS standard), .csv, .txt.`
    );
  }

  // Sort by energy ascending
  rawPoints.sort((a, b) => a.energy - b.energy);

  // Convert to full SpectrumPoint with estimated Kramers background
  const points: SpectrumPoint[] = rawPoints.map((p) => {
    const bg = Math.max(
      0,
      200 * ((beamEnergyKv - p.energy) / Math.max(0.1, p.energy)) * (1 - Math.exp(-p.energy / 0.8))
    );
    const net = Math.max(0, p.counts - bg);
    return {
      energyKeV: Number(p.energy.toFixed(3)),
      counts: Math.round(p.counts),
      background: Math.round(bg),
      netCounts: Math.round(net),
    };
  });

  // Peak detection (local maxima)
  const detectedPeaks: ParsedEDSSpectrum["detectedPeaks"] = [];
  for (let i = 2; i < points.length - 2; i++) {
    const p = points[i];
    if (p.netCounts > 200 && p.netCounts > points[i - 1].netCounts && p.netCounts > points[i + 1].netCounts) {
      if (p.netCounts > points[i - 2].netCounts && p.netCounts > points[i + 2].netCounts) {
        // Match with known characteristic X-ray lines
        let bestMatch: string | undefined;
        let bestLine: string | undefined;
        let minDiff = 0.08; // 80 eV tolerance

        Object.entries(CHARACTERISTIC_XRAY_LINES).forEach(([sym, elem]) => {
          if (elem.lines.kAlpha && Math.abs(elem.lines.kAlpha - p.energyKeV) < minDiff) {
            minDiff = Math.abs(elem.lines.kAlpha - p.energyKeV);
            bestMatch = sym;
            bestLine = `Kα (${elem.lines.kAlpha.toFixed(2)} keV)`;
          }
          if (elem.lines.lAlpha && Math.abs(elem.lines.lAlpha - p.energyKeV) < minDiff) {
            minDiff = Math.abs(elem.lines.lAlpha - p.energyKeV);
            bestMatch = sym;
            bestLine = `Lα (${elem.lines.lAlpha.toFixed(2)} keV)`;
          }
        });

        detectedPeaks.push({
          energyKeV: p.energyKeV,
          counts: p.counts,
          matchedElement: bestMatch,
          matchedLine: bestLine,
          confidence: bestMatch ? 90 : 50,
        });
      }
    }
  }

  return {
    fileName,
    sampleTitle,
    beamEnergyKv,
    liveTimeSec,
    deadTimePct,
    points,
    detectedPeaks,
  };
}

/**
 * Parses EMSA/MAS format (.emsa, .msa) files.
 */
function parseEMSAFile(fileContent: string, fileName: string) {
  const lines = fileContent.split(/\r?\n/);
  const points: { energy: number; counts: number }[] = [];
  let beamEnergyKv = 15.0;
  let liveTimeSec = 60;
  let deadTimePct = 12.0;
  let sampleTitle = fileName.replace(/\.[^/.]+$/, "");

  let nPoints = 0;
  let xPerChan = 10.0; // default 10 eV per channel
  let offsetEv = 0.0;
  let xUnits = "EV";
  let isSpectrum = false;
  let channelIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      const upper = line.toUpperCase();
      const parts = line.split(":");
      const tag = parts[0].trim().toUpperCase();
      const val = parts.slice(1).join(":").trim();

      if (tag.includes("TITLE") || tag.includes("SAMPLE")) {
        if (val) sampleTitle = val;
      } else if (tag.includes("NPOINTS")) {
        nPoints = parseInt(val, 10) || 0;
      } else if (tag.includes("XPERCHAN")) {
        xPerChan = parseFloat(val) || 10.0;
      } else if (tag.includes("OFFSET")) {
        offsetEv = parseFloat(val) || 0.0;
      } else if (tag.includes("XUNITS")) {
        xUnits = val.toUpperCase();
      } else if (tag.includes("BEAMKV") || tag.includes("HV")) {
        beamEnergyKv = parseFloat(val) || 15.0;
      } else if (tag.includes("LIVETIME")) {
        liveTimeSec = parseFloat(val) || 60;
      } else if (tag.includes("DEADTIME") || tag.includes("REALTIME")) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) deadTimePct = parsed;
      } else if (upper.includes("SPECTRUM")) {
        isSpectrum = true;
      }
      continue;
    }

    if (isSpectrum || /^[0-9]/.test(line)) {
      // Numbers separated by comma or whitespace (can be 1 column or multiple numbers per line)
      const tokens = line.split(/[,\s;\t]+/).filter(Boolean);
      for (const token of tokens) {
        const count = parseFloat(token);
        if (!isNaN(count)) {
          // Calculate energy based on channel index
          let energyEv = offsetEv + channelIdx * xPerChan;
          let energyKeV = xUnits.includes("KEV") ? energyEv : energyEv / 1000;
          points.push({ energy: energyKeV, counts: count });
          channelIdx++;
        }
      }
    }
  }

  return { points, beamEnergyKv, liveTimeSec, deadTimePct, sampleTitle };
}

/**
 * Parses Binary .spc files (EDAX binary format and Galactic .spc format).
 */
function parseBinarySpc(buffer: ArrayBuffer, fileName: string) {
  const points: { energy: number; counts: number }[] = [];
  let beamEnergyKv = 15.0;
  let liveTimeSec = 60;
  let sampleTitle = fileName.replace(/\.[^/.]+$/, "");

  const view = new DataView(buffer);
  const totalBytes = buffer.byteLength;

  if (totalBytes < 128) {
    throw new Error("Binary .spc file too small to contain EDS spectrum.");
  }

  // Check Galactic SPC header signature:
  // Byte 0: ftflgs, Byte 1: 0x4B (75 decimal)
  const isGalacticSpc = view.getUint8(1) === 0x4B;

  if (isGalacticSpc && totalBytes >= 512) {
    const fnpts = view.getUint32(4, true);
    const ffirst = view.getFloat64(8, true);
    const flast = view.getFloat64(16, true);

    if (fnpts > 50 && fnpts < 20000 && totalBytes >= 512 + fnpts * 4) {
      const step = (flast - ffirst) / (fnpts - 1);
      const isKeV = flast < 100;

      for (let i = 0; i < fnpts; i++) {
        const counts = view.getInt32(512 + i * 4, true);
        const energy = isKeV ? (ffirst + i * step) : (ffirst + i * step) / 1000;
        points.push({ energy, counts: Math.max(0, counts) });
      }
      return { points, beamEnergyKv, liveTimeSec, sampleTitle };
    }
  }

  // EDAX Binary .spc parsing:
  // Common EDAX binary has 1024, 2048, or 4096 channels starting at offset 256, 512, or 1024
  const possibleOffsets = [256, 512, 1024, 128, 64, 0];
  const channelCounts = [1024, 2048, 4096, 512];

  for (const offset of possibleOffsets) {
    for (const channels of channelCounts) {
      if (offset + channels * 4 <= totalBytes) {
        // Test if this looks like 32-bit integer spectrum
        let validPositive = 0;
        let maxCount = 0;
        for (let i = 0; i < Math.min(100, channels); i++) {
          const val = view.getInt32(offset + i * 4, true);
          if (val >= 0 && val < 5000000) {
            validPositive++;
            if (val > maxCount) maxCount = val;
          }
        }

        if (validPositive > 85 && maxCount > 10) {
          const evPerChan = (beamEnergyKv * 1000) / channels;
          for (let i = 0; i < channels; i++) {
            const counts = Math.max(0, view.getInt32(offset + i * 4, true));
            const energy = (i * evPerChan) / 1000;
            points.push({ energy, counts });
          }
          return { points, beamEnergyKv, liveTimeSec, sampleTitle };
        }
      }
    }
  }

  // If int32 failed, try uint16 counts
  for (const offset of possibleOffsets) {
    for (const channels of channelCounts) {
      if (offset + channels * 2 <= totalBytes) {
        let validPositive = 0;
        for (let i = 0; i < Math.min(100, channels); i++) {
          const val = view.getUint16(offset + i * 2, true);
          if (val > 0 && val < 65535) validPositive++;
        }

        if (validPositive > 70) {
          const evPerChan = (beamEnergyKv * 1000) / channels;
          for (let i = 0; i < channels; i++) {
            const counts = view.getUint16(offset + i * 2, true);
            const energy = (i * evPerChan) / 1000;
            points.push({ energy, counts });
          }
          return { points, beamEnergyKv, liveTimeSec, sampleTitle };
        }
      }
    }
  }

  throw new Error("Unable to identify valid channel structure in binary .spc file.");
}

/**
 * Parses delimited text EDS files (.csv, .txt, .dat, or ASCII .spc).
 */
function parseDelimitedEDS(fileContent: string, fileName: string) {
  const lines = fileContent.split(/\r?\n/);
  const points: { energy: number; counts: number }[] = [];
  let beamEnergyKv = 15.0;
  let liveTimeSec = 60;
  let deadTimePct = 12.0;
  let sampleTitle = fileName.replace(/\.[^/.]+$/, "");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Header inspection
    if (trimmed.startsWith("#") || trimmed.startsWith("$") || trimmed.startsWith("/")) {
      const upper = trimmed.toUpperCase();
      if (upper.includes("BEAMKV") || upper.includes("ACCELERATING_VOLTAGE") || upper.includes("HV")) {
        const match = trimmed.match(/([0-9.]+)/);
        if (match) beamEnergyKv = parseFloat(match[1]);
      }
      if (upper.includes("LIVETIME") || upper.includes("LIVE_TIME") || upper.includes("ACQTIME")) {
        const match = trimmed.match(/([0-9.]+)/);
        if (match) liveTimeSec = parseFloat(match[1]);
      }
      if (upper.includes("DEADTIME") || upper.includes("DEAD_TIME")) {
        const match = trimmed.match(/([0-9.]+)/);
        if (match) deadTimePct = parseFloat(match[1]);
      }
      if (upper.includes("TITLE") || upper.includes("SAMPLE")) {
        sampleTitle = trimmed.split(":")[1]?.trim() || sampleTitle;
      }
      continue;
    }

    // Coordinate parsing
    const parts = trimmed.split(/[,\t;\s]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const col1 = parseFloat(parts[0]);
      const col2 = parseFloat(parts[1]);

      if (!isNaN(col1) && !isNaN(col2)) {
        if (col1 > 40 && col1 === Math.round(col1) && col1 > beamEnergyKv) {
          // Channel number
          const energy = col1 * (beamEnergyKv / 1024);
          points.push({ energy, counts: col2 });
        } else {
          // Energy in keV or eV
          const energy = col1 > 50 ? col1 / 1000 : col1;
          points.push({ energy, counts: col2 });
        }
      }
    }
  }

  return { points, beamEnergyKv, liveTimeSec, deadTimePct, sampleTitle };
}
