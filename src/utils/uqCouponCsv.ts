import type { CouponTestSpecimen } from "../components/uqLabData";

const MAX_CHARACTERS = 2_000_000;
const MAX_ROWS = 10_000;
const MAX_CELL_CHARACTERS = 32_000;
const TEXT_ENCODING = "# Text_Escaping: apostrophe-v1";
const HEADERS = [
  "Record_ID", "Specimen_ID", "Heat_Lot_ID", "Yield_Strength_MPa", "UTS_MPa",
  "Elongation_pct", "Reduction_of_Area_pct", "Hardness_HRC", "Test_Temp_C",
  "Orientation", "Standard", "Evidence_Origin",
] as const;
type Header = typeof HEADERS[number];
const aliases = new Map<string, Header>(HEADERS.map(header => [header.toLowerCase(), header]));
aliases.set("yield_mpa", "Yield_Strength_MPa");
aliases.set("tensile_strength_mpa", "UTS_MPa");
aliases.set("elongation_percent", "Elongation_pct");

/** RFC-style quoted cells; invalid quoting and inconsistent rows are rejected. */
function readRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  const pushCell = () => {
    row.push(cell);
    if (row.length > HEADERS.length) throw new Error("CSV has too many columns.");
    cell = "";
    closedQuote = false;
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    if (rows.length > MAX_ROWS + 1) throw new Error(`CSV is limited to ${MAX_ROWS} coupon rows.`);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else cell += char;
    } else if (char === ",") pushCell();
    else if (char === "\n" || char === "\r") {
      pushRow();
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else if (char === '"') {
      if (cell || closedQuote) throw new Error(`Invalid CSV quoting near row ${rows.length + 1}.`);
      quoted = true;
    } else {
      if (closedQuote) throw new Error(`Unexpected text after a closing quote near row ${rows.length + 1}.`);
      cell += char;
    }
    if (cell.length > MAX_CELL_CHARACTERS) throw new Error("CSV cell exceeds the size limit.");
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted cell.");
  if (row.length || cell || closedQuote) pushRow();
  return rows;
}

/** Requires explicitly unit-labelled properties; a file upload does not verify measurement. */
export function parseCSVToCoupons(csvText: string, datasetId: string): CouponTestSpecimen[] {
  if (csvText.length > MAX_CHARACTERS) throw new Error("CSV is limited to 2 million characters.");
  let text = csvText.replace(/^\uFEFF/, "");
  let decodeText = false;
  // Only leading comment lines are metadata. Comments within data never drop rows.
  while (text.startsWith("#")) {
    const end = text.search(/[\r\n]/);
    if (end < 0) throw new Error("CSV is missing its header and coupon rows.");
    const comment = text.slice(0, end);
    if (comment.startsWith("# Text_Escaping:")) {
      if (comment !== TEXT_ENCODING) throw new Error("Unsupported CSV text escaping version.");
      decodeText = true;
    }
    text = text.slice(end).replace(/^(?:\r\n|\r|\n)/, "");
  }
  const rows = readRows(text);
  if (rows.length < 2) throw new Error("CSV requires a header and at least one coupon row.");
  const headers = rows[0].map(value => {
    const header = aliases.get(value.trim().toLowerCase());
    if (!header) throw new Error(`Unsupported CSV column: ${value.slice(0, 80) || "(empty)"}. Use explicit MPa and pct headers.`);
    return header;
  });
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate or ambiguous columns.");
  for (const required of ["Yield_Strength_MPa", "UTS_MPa", "Elongation_pct"] as Header[]) {
    if (!headers.includes(required)) throw new Error(`CSV requires ${required}; missing properties are not inferred.`);
  }
  const usedIds = new Set<string>();
  return rows.slice(1).map((row, index) => {
    const line = index + 2;
    if (row.length !== headers.length) throw new Error(`CSV row ${line} has ${row.length} columns; expected ${headers.length}.`);
    const get = (key: Header) => row[headers.indexOf(key)] ?? "";
    const getText = (key: Header) => {
      const value = get(key);
      return decodeText && value.startsWith("'") ? value.slice(1) : value;
    };
    const number = (key: Header, required = false): number | null => {
      const value = get(key).trim();
      if (!value && !required) return null;
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value))) {
        throw new Error(`CSV row ${line}: ${key} must be a finite number${required ? " (required)" : " or blank"}.`);
      }
      return Number(value);
    };
    const id = getText("Record_ID") || `${datasetId}-CSV-${String(index + 1).padStart(3, "0")}`;
    if (usedIds.has(id)) throw new Error(`CSV row ${line}: duplicate Record_ID.`);
    usedIds.add(id);
    const evidenceOrigin = get("Evidence_Origin").trim() || "unknown";
    if (!["synthetic", "user-reported", "unknown"].includes(evidenceOrigin)) {
      throw new Error(`CSV row ${line}: Evidence_Origin must be synthetic, user-reported or unknown; CSV cannot certify evidence.`);
    }
    const orientation = get("Orientation").trim();
    if (orientation && !["L", "LT", "ST", "Z"].includes(orientation)) throw new Error(`CSV row ${line}: unsupported Orientation.`);
    return {
      id,
      specimenNumber: getText("Specimen_ID"),
      heatLotId: getText("Heat_Lot_ID"),
      yieldStrengthMPa: number("Yield_Strength_MPa", true)!,
      utsMPa: number("UTS_MPa", true)!,
      elongationPct: number("Elongation_pct", true)!,
      reductionOfAreaPct: number("Reduction_of_Area_pct"),
      hardnessHRC: number("Hardness_HRC") ?? undefined,
      testTempC: number("Test_Temp_C"),
      orientation: (orientation || undefined) as CouponTestSpecimen["orientation"],
      testStandard: getText("Standard"),
      evidenceOrigin: evidenceOrigin as CouponTestSpecimen["evidenceOrigin"],
    };
  });
}

function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  // Reversible spreadsheet formula protection. Literal apostrophes are doubled;
  // only files declaring this encoding are decoded by the importer.
  if (typeof value === "string" && (/^['\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Round-trip coupon data including missing fields and explicitly unverified origins. */
export function exportCouponsToCSV(coupons: CouponTestSpecimen[], datasetName: string): string {
  const rows = coupons.map(coupon => [
    coupon.id, coupon.specimenNumber, coupon.heatLotId, coupon.yieldStrengthMPa,
    coupon.utsMPa, coupon.elongationPct, coupon.reductionOfAreaPct, coupon.hardnessHRC,
    coupon.testTempC, coupon.orientation, coupon.testStandard, coupon.evidenceOrigin ?? "unknown",
  ].map(csvCell).join(","));
  return [
    "# MetalliX UQ-Lab Coupon CSV v1 (unverified evidence; not design allowables)",
    `# Dataset: ${JSON.stringify(datasetName)}`,
    TEXT_ENCODING,
    HEADERS.join(","),
    ...rows,
  ].join("\r\n");
}
