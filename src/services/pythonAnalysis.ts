/** A failed or superseded calculation must never become a successful result. */
export async function requestPythonAnalysis(url: string, body: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal,
  });
  signal.throwIfAborted();
  const data = await response.json();
  signal.throwIfAborted();
  if (!response.ok || data?.error || data?.success === false) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Python analysis failed (HTTP ${response.status}).`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    throw new Error('Python analysis returned no usable result.');
  }
  return data;
}
