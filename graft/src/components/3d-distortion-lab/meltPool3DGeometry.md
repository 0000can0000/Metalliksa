# src/components/3d-distortion-lab/meltPool3DGeometry.ts

- interpolateHalfWidth · function · L4-L24 — function interpolateHalfWidth( topDown: Array<{ x_um: number; y_um: number }>, x_um: number ): number
- sampleSliceTemperature · function · L26-L41 — function sampleSliceTemperature( slice: { nx: number; nz: number; xMin_um: number; xMax_um: number; zMin_um: number; zMax_um: number; T_C: number[] } | undefined, a_um: number, z_um: number, aIsY = false ): number | null
- temperatureColor · function · L43-L58 — function temperatureColor(T: number, Tliq: number, Tsol: number, Thaz: number, Tpeak: number): THREE.Color
- buildLoftedMeltPoolGeometry · function · L60-L124 — function buildLoftedMeltPoolGeometry( result: PythonLPBFResult, radialSegs = 36 ): THREE.BufferGeometry
- contourToCutFace · function · L126-L141 — function contourToCutFace( points: THREE.Vector2[], color: number ): THREE.Mesh | null
- disposeObject3D · function · L143-L151 — function disposeObject3D(root: THREE.Object3D)
