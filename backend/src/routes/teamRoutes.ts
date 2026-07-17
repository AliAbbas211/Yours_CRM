import { Router } from 'express';
import { getTeamMembers, createTeamMember, deleteTeamMember } from '../controllers/teamController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;
