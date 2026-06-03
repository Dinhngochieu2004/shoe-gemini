import { Request, Response } from 'express';
import CartModel from '../models/Cart';
import UserModel from '../models/User';

class ControllerCart {
    // FIX: use req.user from verifyToken middleware instead of jwtDecode(cookie)
    async AddToCart(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const { nameProduct, quantityProduct, priceProduct, imgProduct, size, type } = req.body as {
                nameProduct: string;
                quantityProduct: number;
                priceProduct: number;
                imgProduct: string;
                size: number;
                type: number;
            };

            if (!nameProduct || !quantityProduct || !priceProduct || !imgProduct || !size || type === undefined || type === null) {
                return res.status(400).json({ message: 'Dữ liệu không đầy đủ!' });
            }

            const dataCart = await CartModel.findOne({ user: email });
            const dataUser = await UserModel.findOne({ email });

            if (dataCart) {
                await CartModel.findOneAndUpdate(
                    { user: email },
                    {
                        $push: {
                            products: {
                                nameProduct,
                                quantity: quantityProduct,
                                price: priceProduct,
                                size,
                                img: imgProduct,
                                type,
                            },
                        },
                        $inc: { sumprice: priceProduct * quantityProduct },
                    },
                    { new: true }
                );
                return res.status(200).json({ message: 'Thêm Vào Giỏ Hàng Thành Công !!!' });
            } else {
                const newCart = new CartModel({
                    products: [{ nameProduct, quantity: quantityProduct, price: priceProduct, size, img: imgProduct, type }],
                    sumprice: priceProduct * quantityProduct,
                    user: email,
                    phone: dataUser?.phone ?? 0,
                });
                await newCart.save();
                return res.status(200).json({ message: 'Thêm Vào Giỏ Hàng Thành Công !!!' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Có Lỗi Xảy Ra !!!', error: (err as Error).message });
        }
    }

    async GetCart(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const dataCart = await CartModel.find({ user: email });
            return res.status(200).json(dataCart);
        } catch (err) {
            return res.status(500).json({ message: 'Có Lỗi Xảy Ra !!!', error: (err as Error).message });
        }
    }

    async DeleteCart(req: Request, res: Response): Promise<Response> {
        try {
            const email = req.user!.email;
            const { id } = req.body as { id: string };

            if (!id) return res.status(400).json({ message: 'ID sản phẩm không hợp lệ!' });

            const cart = await CartModel.findOne({ user: email });
            if (!cart) return res.status(404).json({ message: 'Không tìm thấy giỏ hàng!' });

            const productIndex = cart.products.findIndex(
                (product) => product._id?.toString() === id
            );

            if (productIndex > -1) {
                const removedProduct = cart.products[productIndex];
                cart.sumprice -= removedProduct.price * removedProduct.quantity;
                cart.products.splice(productIndex, 1);
                await cart.save();
                return res.status(200).json({ message: 'Xóa Sản Phẩm Thành Công !!!' });
            } else {
                return res.status(404).json({ message: 'Sản phẩm không tồn tại trong giỏ hàng!' });
            }
        } catch (err) {
            return res.status(500).json({ message: 'Có Lỗi Xảy Ra !!!', error: (err as Error).message });
        }
    }

    async updateInfoCart(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phone, address } = req.body as { name: string; phone: number; address: string };
            if (!name || !phone || !address) {
                return res.status(400).json({ message: 'Dữ liệu không đầy đủ' });
            }

            const email = req.user!.email;
            const dataUser = await CartModel.findOne({ user: email });
            if (dataUser) {
                const updatedCart = await CartModel.findOneAndUpdate(
                    { user: email },
                    { name, phone, address },
                    { new: true }
                );
                return res.status(200).json({ message: 'Cập nhật thông tin giỏ hàng thành công', updatedCart });
            }
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng' });
        } catch (err) {
            return res.status(500).json({ message: 'Có Lỗi Xảy Ra !!!', error: (err as Error).message });
        }
    }
}

export default new ControllerCart();
