import assert from "node:assert/strict";
import test from "node:test";
import {
  MELT_POOL_LITERATURE_CASES,
  isLoadableLiteratureCase,
  matchesLoadableLiteratureCase,
} from "../src/data/meltPoolLiteratureCases";

test("NIST AMB2022-03 bare-plate measurements cannot be loaded as powder-layer cases", () => {
  const nist = MELT_POOL_LITERATURE_CASES.filter((c) => c.id.startsWith("nist-amb2022-03-"));
  assert.equal(nist.length, 7);
  for (const c of nist) {
    assert.equal(c.processScope, "bare-plate");
    assert.equal(c.beamDiameterDefinition, "D4sigma");
    assert.equal(c.layerThickness_um, null);
    assert.equal(c.hatchSpacing_um, null);
    assert.equal(isLoadableLiteratureCase(c), false);
    assert.equal(matchesLoadableLiteratureCase(c, c.material, {
      laserPower_W: c.laserPower_W!, scanSpeed_mm_s: c.scanSpeed_mm_s!,
      beamDiameter_um: c.beamDiameter_um!, preheatTemp_C: c.preheatTemp_C!,
      layerThickness_um: 40, hatchSpacing_um: 110,
    }), false);
  }
});

test("a loadable measurement matches all six process inputs", () => {
  const c = MELT_POOL_LITERATURE_CASES.find((row) => row.id === "guo-316l-n01")!;
  const process = {
    laserPower_W: c.laserPower_W!, scanSpeed_mm_s: c.scanSpeed_mm_s!,
    beamDiameter_um: c.beamDiameter_um!, preheatTemp_C: c.preheatTemp_C!,
    layerThickness_um: c.layerThickness_um!, hatchSpacing_um: c.hatchSpacing_um!,
  };
  assert.equal(matchesLoadableLiteratureCase(c, c.material, process), true);
  for (const key of Object.keys(process) as Array<keyof typeof process>) {
    assert.equal(matchesLoadableLiteratureCase(c, c.material, { ...process, [key]: process[key] + 2 }), false, key);
  }
  assert.equal(matchesLoadableLiteratureCase(c, "Inconel 718", process), false);
});
