"""Current material-route inventory is explicit and cannot admit a surrogate alloy."""

import json
import unittest

from four_alloy_materials import ALLOY_MATERIALS, FOUR_ALLOY_IDS, THERMAL_NAME, resolve_alloy_id
from in625_thermal_material import in625_lpbf_thermal_snapshot
from lpbf_build_job_material_snapshot import build_material_property_snapshot
from lpbf_job_cache import BUILD_JOB_SOLVER_REVISION
from lpbf_material_capabilities import capability_for, material_capability_report
from lpbf_material_registry import material


class MaterialCapabilityAuditTests(unittest.TestCase):
    def test_four_existing_alloys_reflect_actual_build_and_transient_snapshots(self):
        report = material_capability_report()
        self.assertEqual(report["schemaVersion"], 1)
        self.assertEqual(set(report["alloys"]), set(FOUR_ALLOY_IDS) | {"in625"})
        for alloy_id in FOUR_ALLOY_IDS:
            with self.subTest(alloy_id=alloy_id):
                row = report["alloys"][alloy_id]
                names = ALLOY_MATERIALS[alloy_id]
                expected_build, expected_sha = build_material_property_snapshot(
                    alloy_id, names["thermal"], names["slicer"]
                )
                expected_transient = material(THERMAL_NAME[alloy_id])
                self.assertTrue(row["buildJob"]["available"])
                self.assertEqual(row["buildJob"]["modelId"], "rosenthal-screening-v1")
                self.assertEqual(row["buildJob"]["solverRevision"], BUILD_JOB_SOLVER_REVISION)
                self.assertEqual(row["buildJob"]["effectiveThermal"], expected_build["thermal"])
                self.assertEqual(row["buildJob"]["effectiveSlicer"], expected_build["slicer"])
                self.assertEqual(row["buildJob"]["materialPropertySha256"], expected_sha)
                self.assertTrue(row["fullTransient"]["available"])
                self.assertEqual(row["fullTransient"]["provenanceClass"], "estimated-legacy")
                self.assertEqual(row["fullTransient"]["materialRevisionSha256"],
                                 expected_transient["materialRevisionSha256"])
                self.assertEqual(row["fullTransient"]["propertyTable"], expected_transient["table"])
                self.assertEqual(row["fullTransient"]["modelTemperatureCoverage_K"],
                                 expected_transient["temperatureCoverage_K"])
                self.assertIsNone(row["fullTransient"]["sourceValidityRange_K"])
                self.assertTrue(row["marangoniAdapter"]["inputsPresent"])
                self.assertTrue(row["inherentStrainAdapter"]["inputsPresent"])
                self.assertEqual(row["marangoniAdapter"]["modelQualification"], "open")
                self.assertEqual(row["samePhysicsGpuQualification"], "open")
                self.assertFalse(row["boundedFusionEnthalpyScreening"]["available"])
                self.assertGreater(len(set(v for k, v in row["crossModelAbsorptivity"].items()
                                           if k != "note")), 1)

    def test_in625_is_bounded_screening_only_and_preserves_distinct_sources(self):
        row = capability_for("Inconel-625")
        snapshot = in625_lpbf_thermal_snapshot()
        self.assertEqual(row["admission"], "thermal-screening-only")
        self.assertFalse(row["buildJob"]["available"])
        self.assertFalse(row["fullTransient"]["available"])
        self.assertEqual(resolve_alloy_id("IN625"), None)
        with self.assertRaisesRegex(ValueError, "thermophysical data missing"):
            material("IN625")
        self.assertEqual(row["solidBulkTable"]["temperatureCoverage_C"], [-18.0, 982.0])
        self.assertEqual(row["solidBulkTable"]["endpointValues"]["high"], {
            "thermal_conductivity_W_mK": 25.2,
            "specific_heat_J_kgK": 645.0,
        })
        self.assertTrue(row["boundedFusionEnthalpyScreening"]["available"])
        self.assertEqual(row["boundedFusionEnthalpyScreening"]["snapshot"], snapshot)
        self.assertEqual(row["boundedFusionEnthalpyScreening"]["modelTemperatureCoverage_K"],
                         [273.15, 1623.15])
        self.assertIsNone(row["boundedFusionEnthalpyScreening"]["sourceValidityRange_K"])
        self.assertNotEqual(row["solidBulkTable"]["source"], snapshot["source"])
        self.assertFalse(row["marangoniAdapter"]["inputsPresent"])
        self.assertFalse(row["inherentStrainAdapter"]["inputsPresent"])

    def test_report_is_json_serializable_and_caller_mutation_cannot_change_authorities(self):
        report = material_capability_report()
        self.assertEqual(json.loads(json.dumps(report, allow_nan=False)), report)
        report["alloys"]["in718"]["buildJob"]["effectiveThermal"]["absorptivity_IR"] = 999
        self.assertNotEqual(material_capability_report()["alloys"]["in718"]["buildJob"]["effectiveThermal"]["absorptivity_IR"], 999)

    def test_identity_resolution_rejects_unsupported_alloys_without_fallback(self):
        self.assertEqual(capability_for("Ti-6Al-4V")["alloyId"], "ti6al4v")
        self.assertEqual(capability_for("IN625")["alloyId"], "in625")
        for value in ("CoCrMo", "Hastelloy", "", None):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "Unsupported LPBF alloy"):
                capability_for(value)


if __name__ == "__main__":
    unittest.main()
