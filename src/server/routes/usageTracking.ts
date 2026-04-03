import { Router } from 'express';

const router = Router();

// GET /tools - List all tracked tools
router.get('/tools', (_req, res) => {
  return res.json({ tools: [] });
});

// GET /providers - List all tracked providers
router.get('/providers', (_req, res) => {
  return res.json({ providers: [] });
});

// GET /top-tools - Top tools by usage
router.get('/top-tools', (_req, res) => {
  return res.json({ topTools: [] });
});

// GET /top-providers - Top providers by usage
router.get('/top-providers', (_req, res) => {
  return res.json({ topProviders: [] });
});

// GET /recent-tools - Recently used tools
router.get('/recent-tools', (_req, res) => {
  return res.json({ recentTools: [] });
});

// GET /stats - Aggregate usage statistics
router.get('/stats', (_req, res) => {
  return res.json({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    periodStart: null,
    periodEnd: null,
  });
});

export default router;
