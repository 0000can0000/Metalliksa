import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_DIGITAL_TWINS } from "../src/data/digitalTwinStore";
import { createUnresolvedDigitalTwin, labelTwinEvidence } from "../src/utils/digitalTwinEvidence";

test("new twins start with missing quantities and no inherited specimen or qualification claims", () => {
  const twin = createUnresolvedDigitalTwin();
  assert.equal(twin.evidence?.kind, "unresolved");
  assert.deepEqual(twin.chemistry.nominalComposition, {});
  assert.equal(twin.chemistry.measuredComposition, undefined);
  assert.equal(twin.mechanical.yieldStrengthMpa, null);
  assert.equal(twin.microstructure.xrdVerification.residualStressSin2PsiMpa, null);
  assert.deepEqual(twin.processHistory.thermalCycles, []);
  assert.deepEqual(twin.microstructure.phasesDetected, []);
  assert.equal(twin.certification.aerospaceFlightReadinessScorePct, null);
  assert.equal(twin.certification.qualificationAuditStatus, "Not assessed");
  assert.equal(twin.certification.nonDestructiveTestResults.xrayRadiography, "Pending");
  assert.equal(twin.mechanical.mmpdsStatisticalBasis.sampleCountN, 0);
  assert.equal(twin.mechanical.mmpdsStatisticalBasis.basisLevel, "Not assessed");
  assert.equal(twin.leadMetallurgist, "Unassigned");
  assert.equal(twin.evidence?.reportedClaims, undefined);
  assert.notEqual(createUnresolvedDigitalTwin().id, twin.id);
});

test("seeded and restored demo records remain synthetic and cannot grant qualification", () => {
  const source = DEFAULT_DIGITAL_TWINS[0];
  const normalized = labelTwinEvidence(source, DEFAULT_DIGITAL_TWINS.map(t => t.id));
  assert.equal(normalized.evidence?.kind, "demo");
  assert.match(normalized.evidence!.note, /Synthetic/);
  assert.equal(normalized.currentStatus, "R&D Prototype");
  assert.equal(normalized.certification.qualificationAuditStatus, "Not assessed");
  assert.equal(normalized.certification.aerospaceFlightReadinessScorePct, null);
  assert.equal(normalized.mechanical.mmpdsStatisticalBasis.basisLevel, "Not assessed");
  assert.equal(normalized.mechanical.yieldStrengthMpa, source.mechanical.yieldStrengthMpa, "Keep demo numbers available under explicit demo provenance");
  assert.notEqual(source.certification.qualificationAuditStatus, "Not assessed", "Normalization must not mutate original fixture data");
});

test("supplied values are preserved without upgrading supplied certification claims", () => {
  const source = DEFAULT_DIGITAL_TWINS[0];
  const twin = createUnresolvedDigitalTwin({ ...source, id: "claimed-certified-id" });
  assert.equal(twin.evidence?.kind, "user-supplied");
  assert.notEqual(twin.id, "claimed-certified-id");
  assert.equal(twin.mechanical.yieldStrengthMpa, source.mechanical.yieldStrengthMpa);
  assert.equal(twin.mechanical.mmpdsStatisticalBasis.basisLevel, "Not assessed");
  assert.equal(twin.certification.qualificationAuditStatus, "Not assessed");
  assert.equal(twin.certification.nonDestructiveTestResults.surfaceDyePenetrant, "Pending");
  assert.equal(twin.evidence?.reportedClaims?.currentStatus, source.currentStatus);
  assert.deepEqual(twin.evidence?.reportedClaims?.certification, source.certification);
});

test("original reported status, inspections and qualification survive repeated labeling and JSON export", () => {
  const supplied = structuredClone(DEFAULT_DIGITAL_TWINS[0]);
  supplied.id = "supplied-record-with-unverified-claims";
  supplied.certification.blockchainHashCertificate = "unverified-source-reference";
  const labeled = labelTwinEvidence(supplied, []);
  const exported = JSON.parse(JSON.stringify(labelTwinEvidence(labeled, [])));
  assert.equal(exported.evidence.reportedClaims.verification, "unverified");
  assert.equal(exported.evidence.reportedClaims.currentStatus, supplied.currentStatus);
  assert.deepEqual(exported.evidence.reportedClaims.certification, supplied.certification);
  assert.deepEqual(exported.evidence.reportedClaims.mmpdsStatisticalBasis, supplied.mechanical.mmpdsStatisticalBasis);
  assert.equal(exported.currentStatus, "R&D Prototype");
  assert.equal(exported.certification.qualificationAuditStatus, "Not assessed");
  assert.equal(exported.certification.nonDestructiveTestResults.xrayRadiography, "Pending");
  assert.equal(exported.mechanical.mmpdsStatisticalBasis.basisLevel, "Not assessed");
  assert.deepEqual(createUnresolvedDigitalTwin(labeled).evidence?.reportedClaims, labeled.evidence?.reportedClaims);
  supplied.certification.nonDestructiveTestResults.xrayRadiography = "Flaw Detected";
  assert.notEqual(labeled.evidence?.reportedClaims?.certification?.nonDestructiveTestResults.xrayRadiography, "Flaw Detected", "Stored claims must be a snapshot, not a mutable alias");
});
