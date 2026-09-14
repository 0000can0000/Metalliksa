# src/utils/xrdParser.ts

- ParsedXRDPoint · interface · L7-L11 — interface ParsedXRDPoint
- DetectedPeak · interface · L13-L26 — interface DetectedPeak
- XRDStandardRef · interface · L28-L46 — interface XRDStandardRef
- parsePanalyticalXRDML · function · L341-L405 — function parsePanalyticalXRDML(xmlContent: string): { data: ParsedXRDPoint[]; wavelength_A?: number }
- parseBrukerRaw · function · L410-L543 — function parseBrukerRaw(input: ArrayBuffer | string): { data: ParsedXRDPoint[]; wavelength_A?: number }
- parseBrukerRawAscii · function · L545-L600 — function parseBrukerRawAscii(text: string): { data: ParsedXRDPoint[]; wavelength_A?: number }
- parseDelimitedXRD · function · L606-L648 — function parseDelimitedXRD(content: string): ParsedXRDPoint[]
- parseXRDFileText · function · L657-L711 — function parseXRDFileText( content: string | ArrayBuffer, filename: string ): { data: ParsedXRDPoint[]; minTheta: number; maxTheta: number; wavelength_A?: number }
- findProminentPeaks · function · L716-L763 — function findProminentPeaks( data: ParsedXRDPoint[], wavelength_A: number, thresholdFactor: number = 2.5 ): DetectedPeak[]
