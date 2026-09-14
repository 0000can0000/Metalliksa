# src/store/useMaterialStore.ts

- BaseMetalType · type · L5-L5 — type BaseMetalType = "Ni" | "Fe" | "Ti" | "Al" | "Cu" | "Co" | "Mg" | "Refractory" | "Other";
- MaterialMetadata · interface · L7-L24 — interface MaterialMetadata
- MaterialSpecimen · interface · L26-L81 — interface MaterialSpecimen
- ActiveSpecimenState · type · L84-L84 — type ActiveSpecimenState = MaterialSpecimen;
- MaterialStore · interface · L86-L111 — interface MaterialStore
- detectBaseMetal · function · L142-L161 — function detectBaseMetal(comp: Record<string, number>): BaseMetalType
- calculateDensity · function · L163-L177 — function calculateDensity(comp: Record<string, number>): number
- generateFormula · function · L179-L198 — function generateFormula(comp: Record<string, number>, baseMetal: BaseMetalType): string
- deriveProperties · function · L200-L464 — function deriveProperties( composition: Record<string, number>, customName?: string, forcedBase?: BaseMetalType, existingMetadata?: Partial<MaterialMetadata> ): Omit<MaterialSpecimen, "id" | "sourceTab" | "lastModified" | "isCustomModified">
- activeSpecimen · method · L645-L647 — get activeSpecimen()
