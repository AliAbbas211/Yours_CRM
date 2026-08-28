import { Router } from 'express';
import { upsertLead, getMessages, sendWhatsAppMessage, createMessage, getClientByInstance, getLeadsNeedingSummary, saveLeadSummary } from '../controllers/internalController';
import { confirmOrderFromBot } from '../controllers/ecommerceController';

const router = Router();
router.post('/lead', upsertLead);
router.get('/lead/:leadId/messages', getMessages);
router.post('/lead/:leadId/message', createMessage);
router.post('/send-message', sendWhatsAppMessage);
router.get('/client-by-instance/:instanceName', getClientByInstance);
router.post('/order/:orderId/confirm', confirmOrderFromBot);
router.get('/leads-needing-summary', getLeadsNeedingSummary);
router.post('/lead/:leadId/summary', saveLeadSummary);

export default router;
