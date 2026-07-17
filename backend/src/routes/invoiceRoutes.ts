import { Router } from 'express';
import { generateInvoice, getInvoiceForOrder } from '../controllers/invoiceController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Called BY N8N after an order is saved — no user session, keep unauthenticated
// (same internal-network / shared-secret consideration as botRoutes.ts)
router.post('/generate', generateInvoice);

// Called by the portal/dashboard to view an already-generated invoice
router.get('/order/:orderId', authenticateToken, getInvoiceForOrder);

export default router;
