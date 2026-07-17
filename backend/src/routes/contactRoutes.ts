import { Router } from 'express';
import {
  getContacts,
  getWhitelist,
  toggleWhitelist,
  bulkWhitelist,
} from '../controllers/whatsappContactController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// SUPER_ADMIN can pass ?clientId=xxx to act on behalf of any client.
// CLIENT role is always scoped to their own clientId automatically.
router.get('/contacts', getContacts);
router.get('/whitelist', getWhitelist);
router.post('/whitelist', toggleWhitelist);
router.post('/whitelist/bulk', bulkWhitelist);

export default router;
