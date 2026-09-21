import express, { Router, type ErrorRequestHandler, type RequestHandler } from 'express';
import { LpbfRunArchiveError, LpbfRunArchiveService } from '../server/lpbfRunArchiveService';

export function createLpbfRunsRouter(service = new LpbfRunArchiveService()): Router {
  const router = Router();
  const prefix = '/api/lpbf/runs';
  
  router.use(prefix, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (process.env.METALLIKSA_READ_ONLY === 'true') {
        res.status(403).json({ error: 'Application is in read-only mode. Write operations are disabled.' }); return;
      }
      const origin = req.get('origin');
      if (req.get('sec-fetch-site') === 'cross-site' || (origin !== undefined && origin !== `${req.protocol}://${req.get('host')}`)) {
        res.status(403).json({ error: 'Run archive requests must originate from this application.' }); return;
      }
      if (!req.is('application/json')) { res.status(415).json({ error: 'Run archive requests require application/json.' }); return; }
    }
    next();
  }, express.json({ limit: '16kb', strict: true }));

  const handle = (action: (req: express.Request) => unknown | Promise<unknown>): RequestHandler => async (req, res) => {
    try { res.json(await action(req)); }
    catch (error) {
      if (error instanceof LpbfRunArchiveError) { res.status(error.status).json({ error: error.message }); return; }
      console.error('[LPBF run archive]', error);
      res.status(503).json({ error: 'Run archive unavailable or integrity check failed.' });
    }
  };

  router.get(prefix, handle(() => service.list()));
  router.get(`${prefix}/:runId`, handle(req => service.get(req.params.runId)));
  
  router.post(`${prefix}/preview`, handle(req => {
    if (!req.body || typeof req.body.jobId !== 'string' || !Array.isArray(req.body.sources)) {
      throw new LpbfRunArchiveError(400, 'jobId and sources array are required.');
    }
    return service.preview(req.body.jobId, req.body.sources);
  }));

  router.post(`${prefix}/import`, handle(req => {
    if (!req.body || typeof req.body.jobId !== 'string' || !Array.isArray(req.body.sources)) {
      throw new LpbfRunArchiveError(400, 'jobId and sources array are required.');
    }
    return service.import(req.body.jobId, req.body.sources);
  }));

  const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error?.status === 413 ? 413 : 400).json({ error: error?.status === 413 ? 'Run request exceeds 16 KiB.' : 'Run request must contain valid JSON.' });
  };
  router.use(prefix, bodyError);
  
  return router;
}
