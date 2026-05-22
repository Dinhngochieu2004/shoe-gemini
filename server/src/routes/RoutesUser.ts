import { Router } from 'express';
import ControllerUser from '../controllers/ControllerUsers';
import AuthMiddleware from '../middlewares/auth';

const router = Router();

router.post('/api/register', ControllerUser.Register);
router.post('/api/login', ControllerUser.Login);
router.get('/api/auth', AuthMiddleware.verifyToken, ControllerUser.GetUser);
router.post('/api/logout', AuthMiddleware.verifyToken, ControllerUser.Logout);
router.get('/api/getallorder', AuthMiddleware.verifyToken, ControllerUser.GetOrder);
router.post('/api/forgotpassword', ControllerUser.ForgotPassword);
router.post('/api/resetpassword', ControllerUser.ResetPassword);
router.get('/api/refresh-token', ControllerUser.RefreshToken);
router.get('/api/getalluser', AuthMiddleware.verifyTokenAdmin, ControllerUser.getAllUser);
router.delete('/api/deleteuser', AuthMiddleware.verifyTokenAdmin, ControllerUser.DeleteUser);

export default router;
