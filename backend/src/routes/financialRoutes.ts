import { Router } from 'express';
import { getFinancials, processPayment } from '../controllers/financialController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getFinancials);
router.post('/process', processPayment);

export default router;
