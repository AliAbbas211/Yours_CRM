import express from 'express';
import {
  createOrder,
  getOrders,
  updateOrder,
  deleteOrder
} from '../controllers/orderController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// The AI needs to be able to create an order via webhook/API
// Typically this might have a different auth mechanism if it's external,
// but we will expose it here.
router.post('/', createOrder);

// Admin routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/', getOrders);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
