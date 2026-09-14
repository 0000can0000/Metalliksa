# src/services/materialContextBridge.ts

- identity · function · L9-L9 — identity = (material:{name:string;composition:Record<string,number>;unit?:string},base:string)
- reject · function · L15-L18 — function reject(message:string): false
- mirrorSharedMaterial · function · L20-L43 — function mirrorSharedMaterial(shared:ActiveSpecimenState): void
- TransferIdentity · interface · L45-L45 — interface TransferIdentity
- applyIdentity · function · L46-L63 — function applyIdentity(transfer:TransferIdentity): boolean
- transferPipelineMaterial · function · L66-L68 — function transferPipelineMaterial(payload:PipelineMaterialPayload): boolean
- startMaterialContextBridge · function · L71-L94 — function startMaterialContextBridge(): ()=>void
