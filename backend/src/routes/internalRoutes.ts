import { Router } from 'express';
import { upsertLead, getMessages, sendWhatsAppMessage } from '../controllers/internalController';

const router = Router();
router.post('/lead', upsertLead);
router.get('/lead/:leadId/messages', getMessages);
router.post('/send-message', sendWhatsAppMessage);

export default router;