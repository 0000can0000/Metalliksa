# Repository tooling map

This repository uses three supporting tools with distinct responsibilities.

## Graft

`graft/` contains durable, per-file wiring cards generated from the Metalliksa
source tree. Use it for quick orientation, symbol lookup, callers, and blast
radius checks:

```powershell
..\.graft-cli\node_modules\.bin\graft.cmd ask "where is LPBF build evaluation handled?" .
..\.graft-cli\node_modules\.bin\graft.cmd callers evaluateLpbfBuildJob .
..\.graft-cli\node_modules\.bin\graft.cmd check .
```

The local `graft/.cache/` and `graft/.graph/` directories are intentionally not
tracked. Rebuild them with `graft build .` when the source changes.

## codebase-memory-mcp

`../codebase-memory-mcp/` is the canonical checkout of the structural MCP
backend. It is the deeper analysis option for architecture, call traces,
coverage, and cross-service relationships. The former
`../codebase-memory-mcp-source/` directory was an identical second clone and
has been removed.

Use Graft for fast local navigation and codebase-memory-mcp when a task needs
verified graph evidence or broader impact analysis; do not maintain two copies
of the backend.

## Avenoxskills

`../avenoxskills/` is an optional agent-operations toolbox, not an application
runtime dependency. The useful Metalliksa-adjacent skills are:

- `codex-fleet`: parallel, isolated engineering lanes for independent tasks.
- `gptpro` and `gptpro-handoff`: export and verify review bundles.
- `fable-orchestration`: decide when to delegate work to another model.

Video and blockchain skills remain optional and should not be added to the
Metalliksa runtime dependency graph.

## Decision rule

The product code remains under `src/`, `server/`, and `python/`. Graft and
codebase-memory-mcp describe and analyze that code; Avenoxskills orchestrates
agent work around it. None of these tools should be imported by the running
Metalliksa application.
