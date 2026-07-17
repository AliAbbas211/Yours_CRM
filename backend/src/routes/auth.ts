import express from 'express';
import { login, registerSuperAdmin } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register-admin', registerSuperAdmin);

export default router;
