import express, { Router, type ErrorRequestHandler, type RequestHandler } from 'express';
import { ResearchEvidenceRegistry, ResearchRegistryError } from '../server/researchEvidenceRegistry';

const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const origin = req.get('origin');
  if (req.get('sec-fetch-site') === 'cross-site' || (origin !== undefined && origin !== `${req.protocol}://${req.get('host')}`)) {
    res.status(403).json({ error: 'Research registry changes must originate from this application origin.' }); return;
  }
  if (!req.is('application/json')) { res.status(415).json({ error: 'Research registry changes require application/json.' }); return; }
  next();
};

/** Mount before the application's larger global JSON parser to enforce the bound. */
export function createResearchRegistryRouter(registry = new ResearchEvidenceRegistry()): Router {
  const router = Router();
  router.use('/api/research/registry', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, sameOriginMutation, express.json({ limit: '10mb', strict: true }));
  const handle = (action: (req: express.Request) => Promise<unknown>): RequestHandler => async (req, res) => {
    try { res.json(await action(req)); }
    catch (error) {
      if (error instanceof ResearchRegistryError) { res.status(error.status).json({ error: error.message, ...(error.current ? { current: error.current } : {}) }); return; }
      console.error('[ResearchRegistry] Storage operation failed:', error);
      res.status(503).json({ error: 'Research registry storage is unavailable. No reset was performed; retry or inspect server storage.' });
    }
  };
  router.get('/api/research/registry', handle(() => registry.current()));
  router.put('/api/research/registry', handle(req => registry.save(req.body?.registryId, req.body?.expectedRevision, req.body?.snapshot)));
  router.get('/api/research/registry/history', handle(() => registry.history()));
  router.get('/api/research/registry/revisions/:revision', handle(req => {
    const text = req.params.revision;
    if (!/^(0|[1-9]\d*)$/.test(text) || !Number.isSafeInteger(Number(text))) throw new ResearchRegistryError(400, 'Revision must be a nonnegative safe integer.');
    return registry.revision(Number(text));
  }));
  const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error?.status === 413 ? 413 : 400).json({ error: error?.status === 413 ? 'Research registry request exceeds the 10 MB limit.' : 'Research registry request must contain valid JSON.' });
  };
  router.use(bodyError);
  return router;
}
