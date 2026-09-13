import { Router } from 'express';
import { airgapDenyPayload, isAirgappedFromEnv } from '../server/airgap';
import { normalizeCrossrefResponse, researchSearchUrl } from '../server/researchSearch';

export const researchRouter = Router();
let activeRequests = 0;
researchRouter.get('/api/research/search', async (req, res) => {
  if (isAirgappedFromEnv()) { res.status(403).json(airgapDenyPayload('Crossref literature search')); return; }
  let url: URL;
  try { url = researchSearchUrl(req.query.q); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
  if (activeRequests >= 3) { res.status(429).json({ error: 'Literature search is busy. Retry shortly.' }); return; }
  activeRequests++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const cancel = () => controller.abort();
  res.on('close', cancel);
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Metalliksa-Research/1.0 (bibliographic metadata; user initiated search)' },
    });
    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 502)
        .json({ error: upstream.status === 404 ? 'DOI not found in Crossref. You can register its source manually.' : 'Literature provider unavailable or rate limited. Retry or register a source manually.' });
      return;
    }
    const items = normalizeCrossrefResponse(await upstream.json());
    res.json({ provider: 'Crossref', retrievedAt: new Date().toISOString(), scope: 'Bibliographic metadata only; source type and numeric findings require review.', items });
  } catch (error) {
    if (!res.destroyed) res.status(controller.signal.aborted ? 504 : 502).json({ error: controller.signal.aborted ? 'Literature search timed out. Retry or register a source manually.' : 'Literature search unavailable. Check connectivity or register a source manually.' });
  } finally { clearTimeout(timer); res.off('close', cancel); activeRequests--; }
});
