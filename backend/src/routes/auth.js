import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.auth });
});

export default router;
