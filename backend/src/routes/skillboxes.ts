import { Router } from 'express';

const router = Router();

// GET /api/skillboxes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Skillboxes endpoint - implementation coming soon',
    timestamp: new Date().toISOString(),
  });
});

export default router; 