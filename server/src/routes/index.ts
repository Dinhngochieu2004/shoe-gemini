import { Express, Request, Response } from 'express';
// FIX: removed duplicate ProductRoute import — use single ProductsRoutes
import ProductsRoutes from './ProductsRoutes';
import UserRoute from './RoutesUser';
import CartRoute from './RoutesCart';
import PaymentsRoutes from './RoutesPayments';
import AuthMiddleware from '../middlewares/auth';

function route(app: Express): void {
    // Products
    app.use(ProductsRoutes);

    // User / Auth
    app.use(UserRoute);

    // Cart
    app.use(CartRoute);

    // Payments
    app.use(PaymentsRoutes);

    // Admin access check
    app.get('/api/admin', AuthMiddleware.verifyTokenAdmin, async (_req: Request, res: Response) => {
        try {
            return res.status(200).json({ message: 'Bạn có quyền truy cập' });
        } catch (error) {
            return res.status(401).json({ message: 'Token không hợp lệ !' });
        }
    });
}

export default route;
