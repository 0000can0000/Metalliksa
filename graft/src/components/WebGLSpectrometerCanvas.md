# src/components/WebGLSpectrometerCanvas.tsx

- SpectrumDataPoint · interface · L9-L12 — interface SpectrumDataPoint
- PeakAnnotation · interface · L14-L19 — interface PeakAnnotation
- WebGLSpectrometerCanvasProps · interface · L21-L33 — interface WebGLSpectrometerCanvasProps
- WebGLSpectrometerCanvas · function · L35-L429 — WebGLSpectrometerCanvas: React.FC<WebGLSpectrometerCanvasProps> = ({ data, deconvolutionPeaks = [], xLabel = "Energy / 2-Theta", yLabel = "Intensity / Counts", xUnit = "keV", yUnit = "CPS", lineColor = [0.22, 0.74, 0.97, 1.0], // #38bdf8 fillColor = [0.22, 0.74, 0.97, 0.25], annotations = [], height = 360, enableGlow = true, })
- loop · function · L261-L264 — loop = ()
- handleMouseDown · function · L270-L273 — handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>)
- handleMouseMove · function · L275-L315 — handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>)
- handleMouseUp · function · L317-L317 — handleMouseUp = ()
- handleMouseLeave · function · L318-L321 — handleMouseLeave = ()
- handleWheel · function · L323-L330 — handleWheel = (e: React.WheelEvent<HTMLCanvasElement>)
- resetView · function · L332-L335 — resetView = ()
