# src/components/TransmissionLineStudio.tsx

- TLMModelType · type · L42-L49 — type TLMModelType = | "bisquert-open" | "bisquert-short" | "dual-rail-tlm" | "finite-warburg-ws" | "finite-warburg-wo" | "gerischer" | "havriliak-negami";
- TLMMaterialPreset · interface · L51-L69 — interface TLMMaterialPreset
- Complex · interface · L188-L191 — interface Complex
- cAdd · function · L193-L195 — function cAdd(a: Complex, b: Complex): Complex
- cSub · function · L197-L199 — function cSub(a: Complex, b: Complex): Complex
- cMul · function · L201-L206 — function cMul(a: Complex, b: Complex): Complex
- cDiv · function · L208-L215 — function cDiv(a: Complex, b: Complex): Complex
- cSqrt · function · L217-L225 — function cSqrt(a: Complex): Complex
- cTanh · function · L227-L234 — function cTanh(a: Complex): Complex
- cCoth · function · L236-L239 — function cCoth(a: Complex): Complex
- cPow · function · L241-L250 — function cPow(a: Complex, p: number): Complex
- TransmissionLineStudioProps · interface · L256-L258 — interface TransmissionLineStudioProps
- TransmissionLineStudio · function · L260-L1293 — TransmissionLineStudio: React.FC<TransmissionLineStudioProps> = ({ onExportToCNLS, })
- applyPreset · function · L294-L313 — applyPreset = (preset: TLMMaterialPreset)
- handleExportCSV · function · L620-L632 — handleExportCSV = ()
- handleSendToCNLS · function · L634-L646 — handleSendToCNLS = ()
