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
  geocodeOriginAddress
} from '../controllers/clientController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

// Client Portal Routes (accessible by the client themselves)
router.get('/portal/dashboard', getClientDashboardStats);
router.get('/portal/settings', getClientSettings);
router.put('/portal/settings', updateClientSettings);
router.post('/portal/geocode-origin', geocodeOriginAddress);

// Only Super Admins can manage clients globally
router.post('/', requireSuperAdmin, createClient);
router.get('/', requireSuperAdmin, getClients);
router.get('/:id', requireSuperAdmin, getClientById);
router.put('/:id', requireSuperAdmin, updateClient);
router.delete('/:id', requireSuperAdmin, deleteClient);

export default router;
