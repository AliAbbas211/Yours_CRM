import { Router } from 'express';
import { upsertLead, getMessages, sendWhatsAppMessage, createMessage, getClientByInstance } from '../controllers/internalController';

const router = Router();
router.post('/lead', upsertLead);
router.get('/lead/:leadId/messages', getMessages);
router.post('/lead/:leadId/message', createMessage);
router.post('/send-message', sendWhatsAppMessage);
router.get('/client-by-instance/:instanceName', getClientByInstance);

export default router;
