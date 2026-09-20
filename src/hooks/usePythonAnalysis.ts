import { useEffect, useState } from 'react';
import { requestPythonAnalysis } from '../services/pythonAnalysis';

interface AnalysisState<T> {
  key: string;
  result: T | null;
  error: string | null;
  pending: boolean;
  elapsedMs: number | null;
}

/** Input identity gates rendering before effects run; cleanup rejects late replies.
 * Aborting HTTP does not imply that the Python computation has been cancelled.
 */
export function usePythonAnalysis<T>(url: string, payload: unknown, decode: (data: Record<string, unknown>) => T) {
  const body = JSON.stringify(payload);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([url, body, attempt]);
  const [state, setState] = useState<AnalysisState<T> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const start = performance.now();
    setState({ key, result: null, error: null, pending: true, elapsedMs: null });
    requestPythonAnalysis(url, body, controller.signal).then(decode).then(result => {
      if (!controller.signal.aborted) setState({ key, result, error: null, pending: false, elapsedMs: Math.round(performance.now() - start) });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, result: null, error: error instanceof Error ? error.message : 'Python analysis unavailable.', pending: false, elapsedMs: null });
    });
    return () => controller.abort();
  }, [url, body, key, decode]);
  const current = state?.key === key ? state : null;
  return {
    result: current?.result ?? null,
    error: current?.error ?? null,
    pending: current?.pending ?? true,
    elapsedMs: current?.elapsedMs ?? null,
    retry: () => setAttempt(value => value + 1),
  };
}
