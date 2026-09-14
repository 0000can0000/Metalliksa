# src/components/D3TafelPolarizationChart.tsx

- D3TafelPolarizationChartProps · interface · L18-L27 — interface D3TafelPolarizationChartProps
- HoverState · interface · L29-L38 — interface HoverState
- D3TafelPolarizationChart · function · L40-L1164 — D3TafelPolarizationChart: React.FC<D3TafelPolarizationChartProps> = ({ dataset, fitResult, onRangesChange, onManualTune, onTriggerPythonRecalculate, isPythonCalculating = false, initialOrientation = "evans", height = 480, })
- getXCoord · function · L235-L237 — getXCoord = (pt: { potential: number; logI: number }, sx = currentXScale)
- getYCoord · function · L239-L241 — getYCoord = (pt: { potential: number; logI: number }, sy = currentYScale)
- render · function · L251-L677 — render = ()
- handleZoomIn · function · L806-L809 — handleZoomIn = ()
- handleZoomOut · function · L811-L814 — handleZoomOut = ()
- handleResetZoom · function · L816-L819 — handleResetZoom = ()
- handleCenterOnEcorr · function · L822-L825 — handleCenterOnEcorr = ()
- handleExportSVG · function · L828-L841 — handleExportSVG = ()
