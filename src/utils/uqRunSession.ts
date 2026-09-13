/** A stale calculation can neither replace a newer result nor clear its loading state. */
export function createUqRunSession<T>() {
  let generation = 0;
  return {
    invalidate() { generation++; },
    async run(operation: () => Promise<T>, receive: (state: { loading: boolean; result: T | null; error: string | null }) => void) {
      const current = ++generation;
      receive({ loading: true, result: null, error: null });
      try {
        const result = await operation();
        if (current === generation) receive({ loading: false, result, error: null });
      } catch (error) {
        if (current === generation) receive({ loading: false, result: null, error: error instanceof Error ? error.message : 'UQ calculation failed.' });
      }
    },
  };
}
