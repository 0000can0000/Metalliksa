/**
 * Thermal and Kinetic Simulation Type Definitions
 */

export interface ThermalStage { [key: string]: any; type?: string;
  id: string;
  name: string;
  startTempC: number;
  targetTempC: number;
  durationMinutes: number;
  atmosphere?: string;
  heatingRateC_min?: number;
  coolingRateC_min?: number;
}

export interface MaterialThermalProfile { [key: string]: any; name?: string; id?: string; baseMetal?: string;
  solvusTemp_C: number;
  activationEnergy_kJ_mol: number;
  solidusTemp_C: number;
  preExponential_k0: number;
  grainGrowthExponent_n: number;
  zenerPrecipitateFraction?: number;
  zenerParticleRadius_nm?: number;
}

export interface SimulationTimePoint { [key: string]: any;
  timeMinutes: number;
  temperatureC: number;
  grainDiameterUm: number;
  phaseFractionPct?: number;
  stageId?: string;
  zenerLimitUm?: number;
}

export interface HardnessAlloyPreset {
  id: string;
  name: string;
  category: string;
  defaultHV: number;
  taborC: number;
  strainHardeningN: number;
  youngsModulusGPa: number;
  poissonsRatio: number;
  standardSpec: string;
}




