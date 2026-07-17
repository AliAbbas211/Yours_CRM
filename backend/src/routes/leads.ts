import express from 'express';
import {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  toggleLeadBot
} from '../controllers/leadController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createLead);
router.get('/', getLeads);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/bot', toggleLeadBot);

export default router;
