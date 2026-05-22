import { Router } from 'express';
import ControllerCart from '../controllers/ControllerCart';
import AuthMiddleware from '../middlewares/auth';

const router = Router();

router.post('/api/addtocart', AuthMiddleware.verifyToken, ControllerCart.AddToCart.bind(ControllerCart));
router.post('/api/deletecart', AuthMiddleware.verifyToken, ControllerCart.DeleteCart.bind(ControllerCart));
router.get('/api/cart', AuthMiddleware.verifyToken, ControllerCart.GetCart.bind(ControllerCart));
router.post('/api/update-info-cart', AuthMiddleware.verifyToken, ControllerCart.updateInfoCart.bind(ControllerCart));

export default router;
