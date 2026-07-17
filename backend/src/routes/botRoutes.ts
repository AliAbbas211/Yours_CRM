import { Router } from 'express';
import { getBotContext } from '../controllers/botContextController';
import { checkWhitelistForBot } from '../controllers/whatsappContactController';
import { lookupProductForBot } from '../controllers/productController';

/**
 * These endpoints are called BY N8N, not by the frontend. They are
 * intentionally not behind authenticateToken (n8n has no user session) —
 * instead, protect this router at the network level (VPS firewall / only
 * reachable from n8n's internal network) or add a shared-secret header
 * check (see requireInternalApiKey below) if this backend is publicly reachable.
 */
const router = Router();

// Uncomment to require n8n to send `x-api-key: <INTERNAL_API_KEY>` on every call:
//
// import { Request, Response, NextFunction } from 'express';
// const requireInternalApiKey = (req: Request, res: Response, next: NextFunction) => {
//   if (req.headers['x-api-key'] !== process.env.INTERNAL_API_KEY) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }
//   next();
// };
// router.use(requireInternalApiKey);

router.get('/context', getBotContext);
router.get('/check-whitelist', checkWhitelistForBot);
router.get('/product-lookup', lookupProductForBot);

export default router;
