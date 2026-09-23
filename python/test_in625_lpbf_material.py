"""Source-bounded IN625 fusion-enthalpy screening contract."""

import hashlib
import json
import math
import unittest

from four_alloy_materials import FOUR_ALLOY_IDS
from in625_thermal_material import (
    LIQUIDUS_K, SOLIDUS_K, LATENT_HEAT_J_KG,
    in625_lpbf_thermal_at_kelvin,
)
from lpbf_material_registry import (
    catalog, material, thermal_screening_at, thermal_screening_material,
)


class In625LpbfThermalScreening(unittest.TestCase):
    def test_alias_revision_and_source_scope(self):
        snapshots = [thermal_screening_material(name) for name in
                     ("IN625", "Inconel 625", "inconel-625", " in625 ")]
        self.assertTrue(all(snapshot == snapshots[0] for snapshot in snapshots))
        snapshot = snapshots[0]
        self.assertEqual(snapshot["materialId"], "in625")
        self.assertEqual(snapshot["validationStatus"], "unvalidated-literature-model-screening")
        self.assertEqual(snapshot["temperatureCoverage_K"], [273.15, LIQUIDUS_K])
        self.assertIn("10.1007/s11663-020-01808-w", snapshot["source"])
        self.assertIn("Appendix B", snapshot["sourceLocators"]["solidCpAndConductivity"])
        digest = snapshot.pop("materialRevisionSha256")
        encoded = json.dumps(snapshot, sort_keys=True, separators=(",", ":"),
                             ensure_ascii=True, allow_nan=False).encode("utf-8")
        self.assertEqual(digest, hashlib.sha256(encoded).hexdigest())
        self.assertEqual(len(digest), 64)

    def test_source_equations_and_energy_across_melting(self):
        room = in625_lpbf_thermal_at_kelvin(273.15)
        self.assertEqual(room["materialRevisionSha256"], thermal_screening_material("IN625")["materialRevisionSha256"])
        self.assertAlmostEqual(room["thermalConductivity_W_mK"], 4.93 + .01575*273.15)
        self.assertAlmostEqual(room["specificHeat_J_kgK"],
                               362 + .125*273.15 + .0001741*273.15**2 - 7.527126e-8*273.15**3)
        self.assertEqual(room["specificEnthalpy_J_kg"], 0)
        solid = in625_lpbf_thermal_at_kelvin(SOLIDUS_K)
        liquid = in625_lpbf_thermal_at_kelvin(LIQUIDUS_K)
        self.assertEqual(solid["liquidFraction"], 0)
        self.assertEqual(liquid["liquidFraction"], 1)
        self.assertEqual(liquid["specificHeat_J_kgK"], 700)
        self.assertEqual(liquid["thermalConductivity_W_mK"], 30)
        expected_mushy = (solid["specificHeat_J_kgK"] + 700)/2*(LIQUIDUS_K-SOLIDUS_K) + LATENT_HEAT_J_KG
        self.assertAlmostEqual(liquid["specificEnthalpy_J_kg"]-solid["specificEnthalpy_J_kg"], expected_mushy)
        temperatures = [273.15, 500, 1000, SOLIDUS_K, (SOLIDUS_K+LIQUIDUS_K)/2, LIQUIDUS_K]
        enthalpies = [thermal_screening_at("in625", t)["specificEnthalpy_J_kg"] for t in temperatures]
        self.assertTrue(all(b > a for a, b in zip(enthalpies, enthalpies[1:])))
        midpoint = thermal_screening_at("in625", (SOLIDUS_K+LIQUIDUS_K)/2)
        self.assertEqual(midpoint["liquidFraction"], .5)
        self.assertAlmostEqual(midpoint["effectiveHeatCapacity_J_kgK"] - midpoint["specificHeat_J_kgK"],
                               LATENT_HEAT_J_KG/(LIQUIDUS_K-SOLIDUS_K))

    def test_data_gate_and_locked_four_alloy_boundary(self):
        for name in ("IN718", "unknown", "IN625;in718", "", None):
            with self.subTest(name=name), self.assertRaises(ValueError):
                thermal_screening_material(name)
            with self.subTest(name=name), self.assertRaises(ValueError):
                thermal_screening_at(name, 300)
        for value in (273.14, LIQUIDUS_K+.01, float("nan"), math.inf, True, "300"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                thermal_screening_at("IN625", value)
        for name in ("Inconel 625", "IN625"):
            with self.assertRaisesRegex(ValueError, "thermophysical data missing"):
                material(name)
        item = next(item for item in catalog() if item["name"] == "Inconel 625")
        self.assertFalse(item["available"])
        self.assertTrue(item["thermalOnlyAvailable"])
        names = [item["name"] for item in catalog()]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(names[:4], ["Ti-6Al-4V", "316L Stainless Steel", "AlSi10Mg", "Inconel 718"])
        self.assertEqual(FOUR_ALLOY_IDS, ("ti6al4v", "ss316l", "alsi10mg", "in718"))


if __name__ == "__main__":
    unittest.main()
