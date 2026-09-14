# src/utils/xrdProfileFitting.ts

- ProfileFunctionType · type · L10-L10 — type ProfileFunctionType = "pseudo-voigt" | "pearson-vii" | "asymmetric-split";
- DoubletFitParams · interface · L12-L36 — interface DoubletFitParams
- ProfilePoint · interface · L38-L46 — interface ProfilePoint
- FitResult · interface · L48-L63 — interface FitResult
- calculateKa2Angle · function · L68-L77 — function calculateKa2Angle(twoTheta_ka1_deg: number, lambda1_A: number, lambda2_A: number): number
- evalPseudoVoigt · function · L82-L101 — function evalPseudoVoigt( x: number, x0: number, fwhm: number, intensity: number, eta: number ): number
- evalPearsonVII · function · L106-L122 — function evalPearsonVII( x: number, x0: number, fwhm: number, intensity: number, m: number ): number
- evalAsymmetricSplit · function · L127-L138 — function evalAsymmetricSplit( x: number, x0: number, fwhm_left: number, fwhm_right: number, intensity: number, eta: number ): number
- evaluateCompositeProfile · function · L143-L187 — function evaluateCompositeProfile( twoTheta: number, profileType: ProfileFunctionType, params: DoubletFitParams ): { y_calc: number; y_ka1: number; y_ka2: number; background: number }
- optimizePeakProfile · function · L192-L349 — function optimizePeakProfile( rawPoints: { twoTheta: number; intensity: number }[], initialParams: DoubletFitParams, profileType: ProfileFunctionType ): FitResult
