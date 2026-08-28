import express from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientSettings,
  updateClientSettings,
  getClientDashboardStats,
  geocodeOriginAddress,
  getClientBilling,
  recordClientPayment
} from '../controllers/clientController';
import {
  getEcommerceConfig,
  regenerateEcommerceSecret,
  updateEcommerceCallback
} from '../controllers/ecommerceController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

// Client Portal Routes (accessible by the client themselves)
router.get('/portal/dashboard', getClientDashboardStats);
router.get('/portal/settings', getClientSettings);
router.put('/portal/settings', updateClientSettings);
router.get('/portal/billing', getClientBilling);
router.post('/portal/geocode-origin', geocodeOriginAddress);
router.get('/portal/ecommerce-config', getEcommerceConfig);
router.post('/portal/ecommerce-config/regenerate-secret', regenerateEcommerceSecret);
router.put('/portal/ecommerce-config', updateEcommerceCallback);

// Only Super Admins can manage clients globally
router.post('/', requireSuperAdmin, createClient);
router.get('/', requireSuperAdmin, getClients);
router.get('/:id', requireSuperAdmin, getClientById);
router.put('/:id', requireSuperAdmin, updateClient);
router.delete('/:id', requireSuperAdmin, deleteClient);
router.post('/:id/payments', requireSuperAdmin, recordClientPayment);

export default router;
