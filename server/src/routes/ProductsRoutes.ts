import { Router } from 'express';
import controller from '../controllers/ControllerProduct';
import multer from 'multer';
import path from 'path';
import AuthMiddleware from '../middlewares/auth';

const router = Router();

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, path.resolve(__dirname, '../uploads'));
    },
    filename: function (_req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.post('/api/addproduct', AuthMiddleware.verifyTokenAdmin, upload.array('fileImg'), controller.AddProducts.bind(controller));
router.get('/api/products', controller.GetProducts.bind(controller));
router.get('/api/product', controller.GetOneProducts.bind(controller));
router.get('/api/search', controller.SearchProduct.bind(controller));
router.post('/api/editpro', AuthMiddleware.verifyTokenAdmin, controller.EditPro.bind(controller));
router.delete('/api/deleteproduct', AuthMiddleware.verifyTokenAdmin, controller.deletePro.bind(controller));
router.post('/api/editorder', AuthMiddleware.verifyTokenAdmin, controller.EditOrder.bind(controller));
router.get('/api/similarproduct', controller.SimilarProduct.bind(controller));

export default router;
