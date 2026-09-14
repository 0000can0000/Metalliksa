# src/store/useLpbfEngineeringStore.ts

- LpbfEngineeringState · interface · L6-L24 — interface LpbfEngineeringState
- startEngineeringJobPersistence · function · L37-L74 — function startEngineeringJobPersistence(storage?: Pick<Storage, "getItem" | "setItem">): () => void
- persist · function · L50-L55 — persist = (state: LpbfEngineeringState)
- useEngineeringField · function · L76-L84 — function useEngineeringField<K extends keyof LpbfEngineeringState>(key: K): [LpbfEngineeringState[K], (value: LpbfEngineeringState[K] | ((previous: LpbfEngineeringState[K]) => LpbfEngineeringState[K])) => void]
- resumeEngineeringJob · function · L88-L112 — function resumeEngineeringJob(): void
- poll · function · L93-L110 — poll = async ()
- engineeringSignature · function · L114-L116 — function engineeringSignature(input: SimulationInput, state: LpbfEngineeringState, strategy: string): string
