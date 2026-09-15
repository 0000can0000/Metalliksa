import importlib.metadata
import unittest

from check_requirement_ranges import check_ranges


class RequirementRangeTests(unittest.TestCase):
    def test_importable_but_outside_upper_bound_is_incompatible(self):
        result = check_ranges("numpy>=1.24,<2.3", lambda name: "2.5.3")
        self.assertEqual(result[0]["status"], "incompatible")

    def test_exact_bound_and_cuda_local_version(self):
        versions = {"numpy": "2.2.6", "torch": "2.11.0+cu128"}
        result = check_ranges("# comment\nnumpy>=1.24,<2.3\ntorch>=2.1 # CUDA runtime", versions.__getitem__)
        self.assertEqual([row["status"] for row in result], ["ok", "ok"])

    def test_missing_package_is_not_success(self):
        def missing(name):
            raise importlib.metadata.PackageNotFoundError(name)
        self.assertEqual(check_ranges("missing>=1", missing)[0]["status"], "missing")

    def test_nonapplicable_marker_does_not_probe(self):
        def unexpected(name):
            self.fail("Marker-excluded package was probed")
        self.assertEqual(check_ranges('example; python_version < "1"', unexpected)[0]["status"], "skipped")

    def test_unsupported_or_empty_input_fails_closed(self):
        for source in ("-r other.txt", "pkg @ https://example.com/pkg.whl", "pkg[extra]", "# empty", "invalid!>=1"):
            with self.subTest(source=source), self.assertRaises(ValueError):
                check_ranges(source, lambda name: "1.0")

    def test_invalid_installed_version_is_an_error(self):
        with self.assertRaises(ValueError):
            check_ranges("example>=1", lambda name: "unparseable")


if __name__ == "__main__":
    unittest.main()
