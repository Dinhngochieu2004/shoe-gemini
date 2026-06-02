import { Request, Response, NextFunction } from 'express';
import ProductModel from '../models/Products';
import PaymentModel from '../models/Payment';
import slugify from 'slugify';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

class ControllerProducts {
    async AddProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { nameProduct, priceProduct, description, checkType } = req.body as {
                nameProduct: string;
                priceProduct: string;
                description: string;
                checkType: string;
            };
            const files = req.files as Express.Multer.File[];
            const imgUrls = files.map((file) => file.filename);
            const slug = slugify(nameProduct, {
                replacement: '-',
                lower: false,
                strict: false,
                locale: 'vi',
                trim: true,
            });
            const newProducts = new ProductModel({
                name: nameProduct,
                price: Number(priceProduct),
                description,
                slug,
                img: imgUrls,
                type: Number(checkType),
            });
            await newProducts.save();
            res.status(200).json({ message: 'Thêm sản phẩm thành công' });
        } catch (error) {
            next(error);
        }
    }

    async GetProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const dataProduct = await ProductModel.find({});
            res.status(200).json(dataProduct);
        } catch (error) {
            next(error);
        }
    }

    async GetOneProducts(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.query as { id: string };
            const dataProduct = await ProductModel.findOne({ _id: id });
            if (!dataProduct) return res.status(200).json([]);
            return res.status(200).json([dataProduct]);
        } catch (error) {
            return res.status(200).json([]);
        }
    }

    async SearchProduct(req: Request, res: Response): Promise<Response> {
        try {
            const { nameProduct } = req.query as { nameProduct?: string };
            if (!nameProduct || nameProduct.trim() === '' || nameProduct === 'undefined') {
                return res.status(200).json([]);
            }

            const dataProducts = await ProductModel.find({
                name: { $regex: nameProduct, $options: 'i' },
            });
            if (!dataProducts) return res.status(200).json([]);

            const validProducts = dataProducts.filter((product) =>
                mongoose.Types.ObjectId.isValid(product._id as unknown as string)
            );
            if (validProducts.length === 0) return res.status(200).json([]);

            return res.status(200).json(validProducts);
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error);
            return res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
        }
    }

    async EditPro(req: Request, res: Response): Promise<void> {
        try {
            const { id, nameProduct, priceProduct, description } = req.body as {
                id: string;
                nameProduct: string;
                priceProduct: string;
                description: string;
            };
            const data = await ProductModel.findOne({ _id: id });
            if (!data) {
                res.status(404).json({ message: 'Sản phẩm không tồn tại!' });
                return;
            }
            await data.updateOne({
                name: nameProduct,
                price: Number(priceProduct),
                description,
            });
            res.status(200).json({ message: 'Cập Nhật Thành Công !!!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi server!' });
        }
    }

    async deletePro(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.query as { id: string };
            const dataPro = await ProductModel.findOne({ _id: id });

            if (!dataPro) return res.status(404).json({ message: 'Sản phẩm không tồn tại!' });

            const arrayImg = dataPro.img ?? [];
            const filePaths = arrayImg.map((item) => path.join(__dirname, '../uploads', item));

            await ProductModel.deleteOne({ _id: id });
            await Promise.all(filePaths.map((file) => fs.unlink(file).catch(() => { })));

            return res.status(200).json({ message: 'Xóa thành công!' });
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server!', error });
        }
    }

    async EditOrder(req: Request, res: Response): Promise<void> {
        try {
            const { id, valueOption } = req.body as { id: string; valueOption: number };
            const dataOrder = await PaymentModel.findOne({ _id: id });
            if (!dataOrder) {
                res.status(404).json({ message: 'Đơn hàng không tồn tại!' });
                return;
            }
            await dataOrder.updateOne({ tinhtrang: valueOption === 0 ? false : true });
            res.status(200).json({ message: 'Cập Nhật Thành Công !!!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server!' });
        }
    }

    async SimilarProduct(req: Request, res: Response): Promise<Response> {
        try {
            const { nameProduct } = req.query as { nameProduct?: string };
            const dataProducts = await ProductModel.find({
                slug: { $regex: nameProduct ?? '', $options: 'i' },
            });
            if (dataProducts.length <= 0) return res.status(200).json([]);
            return res.status(200).json(dataProducts);
        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server!' });
        }
    }
}

export default new ControllerProducts();
