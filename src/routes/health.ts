import { Router } from 'express';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

export default router;
