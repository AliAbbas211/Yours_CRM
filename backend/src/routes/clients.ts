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

// Internal route for n8n automation — protected by secret key, not user auth
router.get('/internal/:id/config', async (req, res) => {
  if (req.headers['x-internal-key'] !== process.env.N8N_INTERNAL_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      select: {
        evolutionApiUrl: true,
        evolutionApiKey: true,
        instanceName: true,
        companyProfileDocUrl: true,
        companyProfileVideoUrl: true,
        companyName: true,
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
