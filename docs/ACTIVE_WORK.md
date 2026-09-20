# Active Work

Coordination record; not an atomic lock or proof that another agent received a task.

| Agent | Task | Checkout | Owned paths | State / acceptance |
| --- | --- | --- | --- | --- |
| Codex | Digital Twin Phase 0 current-code audit | Metalliksa-1, main, baseline fb1a614 | docs/ACTIVE_WORK.md, docs/DIGITAL_TWIN_PHASE0_AUDIT_2026-09-21.md, audit regression tests; parent STATUS.md | In progress: fresh runtime/build/tests, keyhole energy/seed/input checks, orchestrator and UI/API/worker tracing; no phase gate accepted yet |
| Gemini | Not assigned here | Unknown | None recorded | User will assign scope; confirm paths before overlapping writes |

Codex additionally owns python/lpbf_worker.py and python/test_lpbf_worker_optional.py to isolate optional Warp/PyTorch imports from the CPU queue. Acceptance: real CPU capabilities and estimate requests work without optional backends; unsupported requests return an error without killing the worker; existing queue tests retain cancellation/restart/error behavior.

Codex maintains shared STATUS.md and serial Git index operations until an explicit handoff. Further product fixes will be claimed here after inspection and before editing. Gemini scope remains unknown; this record is not delivery confirmation. Recheck working tree and this record before each write/commit.
