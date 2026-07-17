import { Router } from 'express';
import multer from 'multer';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { authenticateToken } from '../middlewares/authMiddleware';

// memoryStorage: files go straight to Cloudinary as a buffer, never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.use(authenticateToken);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', upload.array('media', 10), createProduct);
router.put('/:id', upload.array('media', 10), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
