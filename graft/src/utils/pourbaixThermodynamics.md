# src/utils/pourbaixThermodynamics.ts

- calculateWaterStabilityLines · function · L290-L329 — function calculateWaterStabilityLines(temp_C: number, ionicStrength: number = 0.1): WaterStabilityLines
- extrapolateDeltaG0_T · function · L334-L350 — function extrapolateDeltaG0_T(species: ThermodynamicSpecies, temp_C: number): number
- PourbaixEvaluationOptions · interface · L356-L362 — interface PourbaixEvaluationOptions
- evaluateElementThermodynamicsAtPoint · function · L367-L540 — function evaluateElementThermodynamicsAtPoint( elemSys: ElementThermodynamicSystem, ph: number, potential_V: number, temp_C: number, chlorideActivity: number, ionActivity: number = 1e-6 ): { dominantSpecies: ThermodynamicSpecies; category: StabilityCategory; color: string; pittingThreshold_V: number; }
- evaluateMulticomponentAlloyAtPoint · function · L545-L636 — function evaluateMulticomponentAlloyAtPoint( options: PourbaixEvaluationOptions, ph: number, potential_V: number ): GridPointThermodynamicState
