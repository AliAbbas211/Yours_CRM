import { Router } from 'express';
import { getClientConfigForN8n, disableClientBot, enableClientBot } from '../controllers/adminController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Called by n8n — no auth (internal network call)
router.get('/get-client-config', getClientConfigForN8n);

// SUPER_ADMIN ONLY — the bot kill switch
router.put('/clients/:clientId/disable-bot', authenticateToken, requireSuperAdmin, disableClientBot);
router.put('/clients/:clientId/enable-bot', authenticateToken, requireSuperAdmin, enableClientBot);

export default router;
