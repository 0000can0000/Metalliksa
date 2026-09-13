import assert from "node:assert/strict";
import test from "node:test";
import { calculateMMPDSToleranceFactor, computeMMPDSEmpiricalStats } from "../src/components/uqLabData";

function close(actual: number | null, expected: number, tolerance = 1e-10) {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) <= tolerance, `${actual} differs from ${expected}`);
}

function assertFiniteNumbers(value: unknown): void {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `Non-finite output: ${value}`);
  else if (Array.isArray(value)) value.forEach(assertFiniteNumbers);
  else if (value && typeof value === "object") Object.values(value).forEach(assertFiniteNumbers);
}

test("Natrella approximation reproduces the NIST worked examples, without claiming the exact method", () => {
  // Independent published rounded results (43 wafers, 90% coverage, 99% confidence):
  // https://www.itl.nist.gov/div898/handbook/prc/section2/prc263.htm
  close(calculateMMPDSToleranceFactor(43, 0.9, 0.99), 1.8752, 0.0001);
  close(calculateMMPDSToleranceFactor(6, 0.9, 0.99), 5.2808, 0.0002);
  // NIST's exact noncentral-t result for n=6 is 4.4111, a material difference.
  assert.ok(calculateMMPDSToleranceFactor(6, 0.9, 0.99)! > 5);
});

test("unsupported tolerance inputs produce no arbitrary factor or asymptotic fallback", () => {
  for (const n of [0, 1, 2, 3.5, NaN, Infinity]) assert.equal(calculateMMPDSToleranceFactor(n), null);
  assert.equal(calculateMMPDSToleranceFactor(43, 0.8), null);
  assert.equal(calculateMMPDSToleranceFactor(43, 0.9, 0.975), null);
  assert.equal(calculateMMPDSToleranceFactor(3, 0.9, 0.99), null);
});

test("known sample statistics use sample variance, adjusted moments and one-sided Cpl", () => {
  const stats = computeMMPDSEmpiricalStats([1, 2, 3, 4, 5], 2, ["a", "a", "a", "b", "b"]);
  assert.equal(stats.status, "ready");
  assert.equal(stats.toleranceEligible, true);
  assert.equal(stats.sampleSize, 5);
  assert.equal(stats.lotCount, 2);
  close(stats.mean, 3);
  close(stats.variance, 2.5);
  close(stats.stdDev, Math.sqrt(2.5));
  close(stats.median, 3);
  close(stats.range, 4);
  close(stats.skewness, 0);
  close(stats.kurtosis, -1.2);
  close(stats.cpl, 1 / (3 * Math.sqrt(2.5)));
  close(stats.conformancePct, 80);
  assert.equal("cpk" in stats, false);
  assert.ok(stats.aBasisAllowable! < stats.bBasisAllowable!);
  assert.ok(stats.issues.some(issue => issue.includes("n <= 10")));
  assertFiniteNumbers(stats);
});

test("normality and unsupported uncertainty intervals remain untested instead of fabricated", () => {
  for (const values of [[], [5], [5, 5, 5], [1, 2, 3, 4, 1000]]) {
    const stats = computeMMPDSEmpiricalStats(values, 3);
    assert.equal(stats.normality.status, "not-tested");
    assert.equal(stats.normality.method, null);
    assert.equal(stats.normality.pValue, null);
    assert.equal(stats.andersonDarlingPVal, null);
    assert.equal(stats.isNormalDistribution, null);
    assert.equal(stats.aBasisAllowable95CI, null);
    assert.equal(stats.bBasisAllowable95CI, null);
    assert.equal(stats.standardError_A, null);
    assert.equal(stats.standardError_B, null);
    assertFiniteNumbers(stats);
  }
});

test("empty, singleton, two-point and zero-variance sets withhold unsupported inference", () => {
  const empty = computeMMPDSEmpiricalStats([], 3);
  assert.equal(empty.mean, null);
  assert.equal(empty.conformancePct, null);
  assert.equal(empty.lotCount, null);
  assert.equal(empty.status, "insufficient-data");
  const singleton = computeMMPDSEmpiricalStats([2], 3);
  assert.equal(singleton.mean, 2);
  assert.equal(singleton.variance, null);
  assert.equal(singleton.stdDev, null);
  assert.equal(singleton.conformancePct, 0);
  const pair = computeMMPDSEmpiricalStats([1, 3], 3);
  assert.equal(pair.variance, 2);
  const constant = computeMMPDSEmpiricalStats([2, 2, 2], 3);
  assert.equal(constant.variance, 0);
  assert.equal(constant.stdDev, 0);
  assert.equal(constant.cpl, null);
  assert.equal(constant.skewness, null);
  assert.equal(constant.kurtosis, null);
  assert.equal(constant.conformancePct, 0);
  for (const stats of [empty, singleton, pair, constant]) {
    assert.equal(stats.toleranceEligible, false);
    assert.equal(stats.aBasisAllowable, null);
    assert.equal(stats.bBasisAllowable, null);
    assert.equal(stats.mmpds_kA, null);
    assertFiniteNumbers(stats);
  }
});

test("invalid values, specifications and inconsistent lots reject the whole input", () => {
  for (const values of [[1, NaN, 3], [1, Infinity, 3], [1, null, 3]]) {
    const stats = computeMMPDSEmpiricalStats(values, 1);
    assert.equal(stats.sampleSize, 3);
    assert.equal(stats.status, "invalid-data");
    assert.equal(stats.mean, null);
    assert.equal(stats.conformancePct, null);
    assertFiniteNumbers(stats);
  }
  for (const lots of [["a"], ["a", "", "b"]]) {
    assert.equal(computeMMPDSEmpiricalStats([1, 2, 3], 1, lots).status, "invalid-data");
  }
  assert.equal(computeMMPDSEmpiricalStats([1, 2, 3], NaN).status, "invalid-data");
  assert.equal(computeMMPDSEmpiricalStats([1, 2, 3], 1).lotCount, null);
});

test("histograms conserve every observation with ordered bins for constant and tiny ranges", () => {
  for (const values of [
    [0, 0, 0], [1200, 1200, 1200], [1, 1 + Number.EPSILON, 1 + 2 * Number.EPSILON],
    [1e-200, 2e-200, 3e-200], [0, Number.MIN_VALUE], [1, 2, 3, 4, 5],
  ]) {
    const stats = computeMMPDSEmpiricalStats(values, 0);
    assert.equal(stats.histogram.reduce((total, bin) => total + bin.count, 0), values.length);
    stats.histogram.forEach((bin, i) => {
      assert.ok(bin.binEnd > bin.binStart);
      assert.ok(bin.midpoint >= bin.binStart && bin.midpoint <= bin.binEnd);
      if (i > 0) assert.equal(stats.histogram[i - 1].binEnd, bin.binStart);
    });
    assertFiniteNumbers(stats);
  }
});

test("statistics retain precision and arithmetic overflow is explicit", () => {
  const stats = computeMMPDSEmpiricalStats([1, 2, 3.001], 1);
  close(stats.mean, 2.0003333333333333);
  assert.notEqual(stats.mean, 2);
  const zeroMean = computeMMPDSEmpiricalStats([-1, 0, 1], 0);
  assert.equal(zeroMean.covPct, null);
  assert.equal(zeroMean.marginOfSafetyPct, null);
  const overflowing = computeMMPDSEmpiricalStats([-Number.MAX_VALUE, Number.MAX_VALUE], 0);
  assert.equal(overflowing.status, "invalid-data");
  assertFiniteNumbers(overflowing);
});
