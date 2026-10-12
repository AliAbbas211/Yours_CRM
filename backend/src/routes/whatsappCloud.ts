import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  connectCloud,
  cloudStatus,
  disconnectCloud,
  sendFromPortal,
  listConversations,
  listMessages,
  sendFromInternal,
  webhookVerify,
  webhookReceive,
} from '../controllers/whatsappCloudController';

const router = Router();

// Public: Meta calls these (verified via verify-token / HMAC signature).
router.get('/webhook', webhookVerify);
router.post('/webhook', webhookReceive);

// n8n-facing (x-api-key).
router.post('/internal/send', sendFromInternal);

// Portal (JWT).
router.get('/status', authenticateToken, cloudStatus);
router.post('/connect', authenticateToken, connectCloud);
router.delete('/disconnect', authenticateToken, disconnectCloud);
router.post('/send', authenticateToken, sendFromPortal);
router.get('/conversations', authenticateToken, listConversations);
router.get('/messages', authenticateToken, listMessages);

export default router;
