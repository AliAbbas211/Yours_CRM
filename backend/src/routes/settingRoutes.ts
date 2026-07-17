import express from 'express';
import { getGlobalSettings, updateGlobalSetting } from '../controllers/settingController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// Public/Client route to get global settings
router.get('/', getGlobalSettings);

// Super Admin only route to update global settings
router.put('/', authenticateToken, requireSuperAdmin, updateGlobalSetting);

export default router;
