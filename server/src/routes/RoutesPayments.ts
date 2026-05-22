import { Router } from 'express';
import ControllerPayments from '../controllers/ControllerPayments';
import AuthMiddleware from '../middlewares/auth';

const router = Router();

router.post('/api/payment', AuthMiddleware.verifyToken, ControllerPayments.PaymentsMomo.bind(ControllerPayments));
router.get('/api/checkdata', ControllerPayments.checkData.bind(ControllerPayments));
router.get('/api/payment', AuthMiddleware.verifyToken, ControllerPayments.getPayment.bind(ControllerPayments));
router.post('/api/paymentcod', AuthMiddleware.verifyToken, ControllerPayments.PaymentCod.bind(ControllerPayments));
router.get('/api/payments', AuthMiddleware.verifyToken, ControllerPayments.getPayments.bind(ControllerPayments));
// FIX: added verifyToken to dataorderuser and cancelorder
router.get('/api/dataorderuser', AuthMiddleware.verifyToken, ControllerPayments.GetOrderUser.bind(ControllerPayments));
router.post('/api/cancelorder', AuthMiddleware.verifyToken, ControllerPayments.CancelOrder.bind(ControllerPayments));
router.post('/api/paymentvnpay', AuthMiddleware.verifyToken, ControllerPayments.paymentVnpay.bind(ControllerPayments));
router.get('/api/check-payment-vnpay', ControllerPayments.checkPaymentVnpay.bind(ControllerPayments));

export default router;
