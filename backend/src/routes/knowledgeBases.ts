import express from 'express';
import {
  createKnowledgeBase,
  getKnowledgeBases,
  updateKnowledgeBase,
  deleteKnowledgeBase
} from '../controllers/knowledgeBaseController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/', upload.single('file'), createKnowledgeBase);
router.get('/', getKnowledgeBases);
router.put('/:id', updateKnowledgeBase);
router.delete('/:id', deleteKnowledgeBase);

export default router;
