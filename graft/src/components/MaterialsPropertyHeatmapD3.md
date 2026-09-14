# src/components/MaterialsPropertyHeatmapD3.tsx

- HeatmapMode · type · L21-L21 — type HeatmapMode = "alloy-elements" | "element-property-binned" | "property-correlation";
- ColorPaletteKey · type · L22-L22 — type ColorPaletteKey = "viridis" | "plasma" | "turbo" | "emerald" | "amber-flame";
- MaterialsPropertyHeatmapD3Props · interface · L24-L31 — interface MaterialsPropertyHeatmapD3Props
- MaterialsPropertyHeatmapD3 · function · L49-L1098 — MaterialsPropertyHeatmapD3: React.FC<MaterialsPropertyHeatmapD3Props> = ({ materials, selectedMaterial, onSelectMaterial, categories, activeCategory, onSelectCategory, })
- getElementWt · function · L85-L95 — getElementWt = (mat: MaterialSpec, element: string): number
- getPropertyValue · function · L97-L106 — getPropertyValue = (mat: MaterialSpec, propKey: string): number
- getColorScale · function · L297-L319 — getColorScale = (minVal: number, maxVal: number, diverging = false)
- handleExportSVG · function · L859-L870 — handleExportSVG = ()
