# src/components/CrystalVisualizer.tsx

- LatticeType · type · L4-L4 — type LatticeType = "BCC" | "FCC" | "HCP" | "BCT" | "Diamond" | "NaCl";
- LatticeMode · type · L5-L5 — type LatticeMode = "ball-and-stick" | "hard-sphere";
- MillerPlane · type · L6-L6 — type MillerPlane = "none" | "100" | "110" | "111" | "001" | "1120";
- Atom3D · interface · L8-L16 — interface Atom3D
- Bond3D · interface · L18-L21 — interface Bond3D
- CrystalVisualizer · function · L23-L1030 — CrystalVisualizer: React.FC = ()
- getCrystalData · function · L48-L347 — getCrystalData = (): { atoms: Atom3D[]; bonds: Bond3D[]; info: any }
- render · function · L357-L630 — render = ()
- project · function · L394-L415 — project = (p: { x: number; y: number; z: number })
- handlePointerDown · function · L644-L658 — handlePointerDown = (e: React.PointerEvent)
- handlePointerMove · function · L660-L682 — handlePointerMove = (e: React.PointerEvent)
- handlePointerUp · function · L684-L698 — handlePointerUp = (e: React.PointerEvent)
- handleManualRotate · function · L700-L706 — handleManualRotate = (dRotX: number, dRotY: number)
- handleManualZoom · function · L708-L715 — handleManualZoom = (delta: number)
