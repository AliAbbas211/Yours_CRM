import { Router } from 'express';
import { receiveEcommerceOrder } from '../controllers/ecommerceController';

const router = Router();

// PUBLIC — called by the client's own e-commerce site (any platform: Shopify,
// WooCommerce, custom). Auth is the per-client secret embedded in the URL
// itself (see ecommerceController) rather than a shared static key, so any
// site can call this without needing custom headers.
router.post('/:clientId/:secret', receiveEcommerceOrder);

export default router;
